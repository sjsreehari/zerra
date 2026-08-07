"""Stateful temporal multi-relation intent graph with a small, stable public API."""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime
from typing import Any

import networkx as nx

from .config import GraphConfig
from .explain import build_evidence
from .models import CallView, GraphScoreResult, NodeType, RelationType, normalize_call
from .scoring import combine
from .signals import calculate_blast_radius, calculate_fanout, calculate_novelty
from .signals.baseline import IdentityBaseline
from .temporal import decayed_weight


class IntentGraphStore:
    """In-memory graph. Call ``score(event)`` before ``record_call(event)``."""

    def __init__(self, config: GraphConfig | None = None) -> None:
        self.config = config or GraphConfig()
        self.graph = nx.MultiDiGraph()
        self._baselines: dict[str, IdentityBaseline] = defaultdict(IdentityBaseline)
        self._history: dict[str, deque[dict[str, Any]]] = defaultdict(deque)
        self._seen_call_ids: set[str] = set()
        self._identity_tenants: dict[str, str | None] = {}
        self._last_decay_run: datetime | None = None

    @staticmethod
    def _node(node_type: NodeType, value: str) -> str:
        return f"{node_type.value}:{value}"

    def _edge_key(self, relation: RelationType) -> str:
        return relation.value

    def _add_or_update_edge(self, src: str, dst: str, relation: RelationType, now: datetime) -> None:
        key = self._edge_key(relation)
        existing = self.graph.get_edge_data(src, dst, key=key)
        if existing:
            existing["weight"] = decayed_weight(existing["weight"], existing["last_seen"], now, self.config.edge_half_life_seconds) + 1.0
            existing["last_seen"] = now
            existing["call_count"] += 1
            return
        self.graph.add_edge(src, dst, key=key, relation=relation.value, first_seen=now, last_seen=now, weight=1.0, call_count=1)

    def score(self, call: Any) -> GraphScoreResult:
        """Score the proposed event against history without mutating graph state."""
        event = normalize_call(call)
        baseline = self._baselines[event.identity_id]
        warm = baseline.call_count >= self.config.warm_up_calls
        object_known = event.object_id in baseline.known_object_ids[event.object_type]
        history = list(self._window(event))
        # Include the pending call so an attack is detectable at the call that causes it.
        pending = {"object_id": event.object_id, "object_type": event.object_type, "timestamp": event.timestamp, "is_novel": not object_known, "tenant_id": event.tenant_id}
        if not history or history[-1].get("call_id") != event.call_id:
            history.append(pending)
        novel_objects = {(item["object_type"], item["object_id"]) for item in history if item["is_novel"]}
        timestamps = [item["timestamp"] for item in history]
        duration = max(1.0, (max(timestamps) - min(timestamps)).total_seconds()) if timestamps else 1.0
        fanout = calculate_fanout(novel_objects=len(novel_objects), duration_seconds=duration, baseline_mean=baseline.velocity_mean, baseline_stddev=baseline.velocity_stddev, warm_up_complete=warm, config=self.config, first_fired_call=baseline.call_count + 1 if len(novel_objects) >= self.config.fanout_absolute_fallback else None)
        novelty = calculate_novelty(is_novel=not object_known, warm_up_complete=warm)
        home_tenant = event.home_tenant_id or self._identity_tenants.get(event.identity_id)
        tenants = {item["tenant_id"] for item in history if item.get("tenant_id")}
        blast = calculate_blast_radius(reachable_tenants=tenants, home_tenant_id=home_tenant, config=self.config)
        signals = [fanout, novelty, blast]
        return GraphScoreResult(identity_id=event.identity_id, call_id=event.call_id, graph_risk_score=combine(signals, self.config), signals=signals, evidence=build_evidence(event.identity_id, signals))

    def record_call(self, call: Any) -> None:
        """Idempotently persist nodes, relation-specific edges, and baseline observations."""
        event = normalize_call(call)
        if event.call_id in self._seen_call_ids:
            return
        self.decay_and_prune(event.timestamp)
        baseline = self._baselines[event.identity_id]
        is_novel = event.object_id not in baseline.known_object_ids[event.object_type]
        identity_node = self._node(NodeType.IDENTITY, event.identity_id)
        object_node = self._node(NodeType.OBJECT, f"{event.object_type}:{event.object_id}")
        endpoint_node = self._node(NodeType.ENDPOINT, event.endpoint)
        self.graph.add_node(identity_node, node_type=NodeType.IDENTITY.value, identity_id=event.identity_id)
        self.graph.add_node(object_node, node_type=NodeType.OBJECT.value, object_id=event.object_id, object_type=event.object_type)
        self.graph.add_node(endpoint_node, node_type=NodeType.ENDPOINT.value, endpoint=event.endpoint)
        self._add_or_update_edge(identity_node, object_node, RelationType.IDENTITY_TO_OBJECT, event.timestamp)
        self._add_or_update_edge(identity_node, endpoint_node, RelationType.IDENTITY_TO_ENDPOINT, event.timestamp)
        if event.tenant_id:
            tenant_node = self._node(NodeType.TENANT, event.tenant_id)
            self.graph.add_node(tenant_node, node_type=NodeType.TENANT.value, tenant_id=event.tenant_id)
            self._add_or_update_edge(object_node, tenant_node, RelationType.OBJECT_TO_TENANT, event.timestamp)
        self._history[event.identity_id].append({"call_id": event.call_id, "object_id": event.object_id, "object_type": event.object_type, "timestamp": event.timestamp, "is_novel": is_novel, "tenant_id": event.tenant_id})
        self._trim_history(event.identity_id, event.timestamp)
        window = list(self._window(event))
        if len(window) > 1:
            span = max(1.0, (window[-1]["timestamp"] - window[0]["timestamp"]).total_seconds())
            baseline.observe_velocity(len({(item["object_type"], item["object_id"]) for item in window if item["is_novel"]}) / span * 60.0)
        baseline.call_count += 1
        baseline.known_object_ids[event.object_type].add(event.object_id)
        baseline.known_endpoints.add(event.endpoint)
        if event.home_tenant_id:
            self._identity_tenants[event.identity_id] = event.home_tenant_id
        self._seen_call_ids.add(event.call_id)

    def _window(self, event: CallView) -> deque[dict[str, Any]]:
        cutoff = event.timestamp.timestamp() - self.config.fanout_window_seconds
        items = [item for item in self._history[event.identity_id] if item["timestamp"].timestamp() >= cutoff]
        return deque(items[-self.config.fanout_window_calls :])

    def _trim_history(self, identity_id: str, now: datetime) -> None:
        cutoff = now.timestamp() - self.config.fanout_window_seconds
        history = self._history[identity_id]
        while history and history[0]["timestamp"].timestamp() < cutoff:
            history.popleft()

    def decay_and_prune(self, now: datetime) -> None:
        """Lazily decay active edges and prune expired relations in O(active edges)."""
        if self._last_decay_run and (now - self._last_decay_run).total_seconds() < self.config.decay_interval_seconds:
            return
        remove: list[tuple[str, str, str]] = []
        for src, dst, key, data in self.graph.edges(keys=True, data=True):
            weight = decayed_weight(data["weight"], data["last_seen"], now, self.config.edge_half_life_seconds)
            if weight < self.config.prune_epsilon:
                remove.append((src, dst, key))
            else:
                data["weight"] = weight
                data["last_seen"] = now
        self.graph.remove_edges_from(remove)
        self.graph.remove_nodes_from(list(nx.isolates(self.graph)))
        self._last_decay_run = now

    def get_identity_subgraph(self, identity_id: str, depth: int = 2) -> dict[str, Any]:
        """Return a JSON-ready, bounded neighborhood for dashboards and debugging."""
        if depth < 0:
            raise ValueError("depth must be non-negative")
        root = self._node(NodeType.IDENTITY, identity_id)
        if root not in self.graph:
            return {"nodes": [], "edges": []}
        discovered = {root}
        frontier = {root}
        for _ in range(depth):
            frontier = {child for node in frontier for child in self.graph.successors(node)} - discovered
            discovered.update(frontier)
        subgraph = self.graph.subgraph(discovered)
        return {
            "nodes": [{"id": node, **data} for node, data in subgraph.nodes(data=True)],
            "edges": [{"src": src, "dst": dst, "relation": data["relation"], "first_seen": data["first_seen"].isoformat(), "last_seen": data["last_seen"].isoformat(), "weight": round(data["weight"], 6), "call_count": data["call_count"]} for src, dst, _, data in subgraph.edges(keys=True, data=True)],
        }
