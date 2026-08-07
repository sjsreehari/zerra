from agent.graph import GraphConfig, IntentGraphStore
from .fixtures import enumeration_attack, normal_session


def test_enumeration_is_flagged_by_sixth_call() -> None:
    store = IntentGraphStore(GraphConfig(risk_alert_threshold=0.5))
    flagged_at = None
    for index, event in enumerate(enumeration_attack()):
        result = store.score(event)
        store.record_call(event)
        if result.graph_risk_score >= store.config.risk_alert_threshold:
            flagged_at = index + 1
            break
    assert flagged_at is not None and flagged_at <= 6


def test_repeating_normal_session_never_alerts() -> None:
    store = IntentGraphStore()
    scores = []
    for event in normal_session():
        scores.append(store.score(event).graph_risk_score)
        store.record_call(event)
    assert max(scores) < store.config.risk_alert_threshold
