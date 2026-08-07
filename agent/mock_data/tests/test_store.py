from datetime import datetime, timezone

import pytest

from agent.contracts import DecisionResponse, TrustZone, Verdict
from agent.mock_data import AccessDeniedError, MockDataStore


def _decision(verdict: Verdict) -> DecisionResponse:
    return DecisionResponse(call_id="c", identity_id="human-alice", verdict=verdict, trust_score=100,
                            zone=TrustZone.GREEN if verdict is Verdict.ALLOW else TrustZone.RED,
                            graph_risk_score=0, sequence_risk_score=0, allowed=verdict is Verdict.ALLOW,
                            reason="test", timestamp=datetime.now(timezone.utc))


def test_metadata_and_cross_tenant_metadata_are_available_pre_decision() -> None:
    store = MockDataStore()
    assert store.get_invoice_metadata("inv-a-001").sensitive_fields == ["ssn", "salary", "internal_notes"]
    assert store.get_invoice_metadata("inv-b-001").tenant_id == "tenant-b"


def test_protected_records_require_allow() -> None:
    store = MockDataStore()
    with pytest.raises(AccessDeniedError):
        store.get_invoice("inv-a-001", _decision(Verdict.BLOCK))
    assert store.get_invoice("inv-a-001", _decision(Verdict.ALLOW)).id == "inv-a-001"
