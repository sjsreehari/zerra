from agent.attack_sim.scenarios import fast_invoice_enumeration, normal_repeating_user_traffic
from agent.graph import IntentGraphStore


def test_enumeration_increases_graph_risk() -> None:
	store = IntentGraphStore()
	scores = []
	for item in fast_invoice_enumeration():
		scores.append(store.score(item.event).graph_risk_score)
		store.record_call(item.event)
	assert max(scores) >= 0.5


def test_repeating_normal_session_stays_low_risk() -> None:
	store = IntentGraphStore()
	scores = [store.score(item.event).graph_risk_score for item in normal_repeating_user_traffic()]
	assert max(scores) == 0.0
