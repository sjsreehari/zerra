from datetime import UTC, datetime, timedelta

from agent.graph import GraphConfig, IntentGraphStore


def event(call_id: str, object_id: str, at: datetime, tenant: str = "tenant-a") -> dict:
    return {"call_id": call_id, "identity_id": "u-1", "object_id": object_id, "object_type": "invoice", "endpoint": "/invoices", "tenant_id": tenant, "home_tenant_id": "tenant-a", "timestamp": at}


def test_score_before_record_preserves_novelty() -> None:
    store = IntentGraphStore(GraphConfig(warm_up_calls=0))
    call = event("one", "one", datetime(2026, 1, 1, tzinfo=UTC))
    assert next(signal for signal in store.score(call).signals if signal.name == "novelty").score == 1
    store.record_call(call)
    assert next(signal for signal in store.score(call).signals if signal.name == "novelty").score == 0


def test_relations_and_dashboard_subgraph_are_retained() -> None:
    store = IntentGraphStore()
    store.record_call(event("one", "one", datetime(2026, 1, 1, tzinfo=UTC)))
    graph = store.get_identity_subgraph("u-1")
    assert {edge["relation"] for edge in graph["edges"]} == {"touches", "calls", "belongs_to"}


def test_old_edges_are_pruned() -> None:
    store = IntentGraphStore(GraphConfig(edge_half_life_seconds=1, prune_epsilon=0.1, decay_interval_seconds=1))
    start = datetime(2026, 1, 1, tzinfo=UTC)
    store.record_call(event("one", "one", start))
    store.decay_and_prune(start + timedelta(seconds=5))
    assert not store.get_identity_subgraph("u-1")["edges"]
