from agent.attack_sim.scenarios import cross_tenant_access, normal_repeating_user_traffic
from agent.graph import IntentGraphStore


def test_recorded_calls_raise_fanout_for_distinct_objects() -> None:
	store = IntentGraphStore()
	events = normal_repeating_user_traffic(n_calls=6)
	for item in events[:3]:
		store.record_call(item.event)
	assert store.score(events[3].event).factors[0]["fan_out"] == 3


def test_cross_tenant_target_is_high_risk() -> None:
	store = IntentGraphStore()
	for item in cross_tenant_access():
		event = item.event.model_copy(update={"home_tenant_id": "tenant-a"})
		result = store.score(event)
		store.record_call(event)
	assert result.graph_risk_score == 0.9
