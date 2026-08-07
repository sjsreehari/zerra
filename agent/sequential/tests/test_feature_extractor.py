from datetime import datetime, timedelta, timezone

from agent.sequential.feature_extractor import extract_features
from agent.sequential.models import CallEvent, SequenceWindow


def test_extracts_cardinality_timing_and_sensitivity() -> None:
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    events = [CallEvent(str(i), "x", start + timedelta(seconds=i), "/items", "GET", str(100 + i), response_fields=["ssn"] if i == 4 else []) for i in range(5)]
    features = extract_features(SequenceWindow("x", events))
    assert features["distinct_object_count"] == 5
    assert features["object_id_delta_pattern"] == 1.0
    assert features["sensitivity_touched"] == 1.0
    assert features["read_write_ratio"] == 1.0
