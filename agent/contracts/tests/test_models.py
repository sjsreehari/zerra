from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from agent.contracts import CallEvent, Identity, IdentityType, RiskCard, Verdict


def test_invalid_identity_score_ranges_fail() -> None:
    with pytest.raises(ValidationError):
        Identity(id="x", type=IdentityType.HUMAN, tenant_id="t", auth_strength=1.1)
    with pytest.raises(ValidationError):
        Identity(id="x", type=IdentityType.HUMAN, tenant_id="t", auth_strength=.5, trust_score=-1)


def test_invalid_risk_card_ranges_fail() -> None:
    with pytest.raises(ValidationError):
        RiskCard(id="r", identity_id="x", call_ids=["c"], verdict=Verdict.BLOCK, confidence=1.1,
                 graph_risk_score=0, sequence_risk_score=0, trust_score=100, owasp_tag="x", mitre_tag="x",
                 evidence="x", timestamp=datetime.now(timezone.utc))


def test_event_requires_aware_timestamp_shape() -> None:
    event = CallEvent(id="c", identity_id="x", identity_type=IdentityType.HUMAN,
                      timestamp=datetime.now(timezone.utc), endpoint="/x", method="GET")
    assert event.metadata == {}
