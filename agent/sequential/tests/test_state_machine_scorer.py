import json
from datetime import datetime
from pathlib import Path

from agent.sequential.models import CallEvent
from agent.sequential.scorer_service import reset_for_tests, score

FIXTURES = Path(__file__).parent / "fixtures"


def _events(name: str):
    rows = json.loads((FIXTURES / name).read_text())
    return [CallEvent(**{**row, "timestamp": datetime.fromisoformat(row["timestamp"])}) for row in rows]


def test_enumeration_attack_flags_within_six_calls() -> None:
    reset_for_tests()
    result = None
    for event in _events("enumeration_attack.json"):
        result = score(event)
    assert result is not None and result.triggered_pattern is not None
    assert result.triggered_pattern.pattern_name == "enumeration_exfil"
    assert result.sequence_risk_score >= 0.85
    assert result.triggered_pattern.matched_at_call_index <= 5


def test_normal_traffic_has_no_pattern_match() -> None:
    reset_for_tests()
    for event in _events("normal_traffic.json"):
        result = score(event)
    assert result.triggered_pattern is None
    assert result.sequence_risk_score == 0.0


def test_mutated_attack_generalizes() -> None:
    reset_for_tests()
    for event in _events("mutated_enumeration_attack.json"):
        result = score(event)
    assert result.triggered_pattern and result.triggered_pattern.pattern_name == "enumeration_exfil"
