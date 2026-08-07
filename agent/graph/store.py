"""Deterministic in-memory graph-style risk signals, with no external I/O."""

from dataclasses import dataclass
from typing import Any

from agent.contracts import CallEvent


@dataclass(frozen=True)
class GraphScoreResult:
    graph_risk_score: float
    evidence: str
    factors: list[dict[str, Any]]


class IntentGraphStore:
    def __init__(self) -> None:
        self._events: dict[str, list[CallEvent]] = {}

    def score(self, event: CallEvent) -> GraphScoreResult:
        prior = self._events.get(event.identity_id, [])[-10:]
        prior_objects = {item.object_id for item in prior if item.object_id}
        fan_out = len(prior_objects | ({event.object_id} if event.object_id else set()))
        cross_tenant = bool(event.tenant_id and event.home_tenant_id and event.tenant_id != event.home_tenant_id)
        risk = .9 if cross_tenant else min(.8, max(0.0, (fan_out - 4) * .12))
        evidence = "cross-tenant target access" if cross_tenant else f"{fan_out} distinct objects in recent identity graph"
        return GraphScoreResult(risk, evidence, [{"fan_out": fan_out}, {"cross_tenant": cross_tenant}])

    def record_call(self, event: CallEvent) -> None:
        self._events.setdefault(event.identity_id, []).append(event)
