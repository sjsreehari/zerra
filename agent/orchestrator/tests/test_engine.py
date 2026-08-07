from datetime import datetime, timedelta, timezone

from agent.contracts import CallEvent, IdentityType, Verdict
from agent.graph import IntentGraphStore
from agent.identity import IdentityRegistry
from agent.orchestrator import SentraEngine
from agent.sequential.scorer_service import reset_for_tests
from agent.trust import TrustScoreStore


def _engine() -> SentraEngine:
    reset_for_tests()
    return SentraEngine(IdentityRegistry(), IntentGraphStore(), TrustScoreStore())


def _event(call_id: str, identity_id: str, endpoint: str, object_id: str | None = None, **updates) -> CallEvent:
    values = dict(id=call_id, identity_id=identity_id, identity_type=IdentityType.HUMAN,
                  timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc), endpoint=endpoint, method="GET",
                  object_id=object_id)
    values.update(updates)
    return CallEvent(**values)


def test_normal_human_access_is_allowed() -> None:
    decision = _engine().evaluate(_event("h1", "human-alice", "/invoices/inv-a-001", "inv-a-001", tenant_id="tenant-a"))
    assert decision.verdict is Verdict.ALLOW and decision.risk_card is None


def test_cross_tenant_access_steps_up_or_blocks_with_card() -> None:
    decision = _engine().evaluate(_event("h2", "human-alice", "/invoices/inv-b-001", "inv-b-001", tenant_id="tenant-b"))
    assert decision.verdict in {Verdict.STEP_UP, Verdict.BLOCK}
    assert decision.risk_card is not None


def test_agent_scope_violation_blocks() -> None:
    decision = _engine().evaluate(_event("s1", "finance-agent", "/admin/users"))
    assert decision.verdict is Verdict.BLOCK
    assert decision.risk_card.owasp_tag.startswith("OWASP API5")


def test_revoked_and_unknown_identities_block() -> None:
    engine = _engine()
    engine.registry.revoke("attacker-agent")
    assert engine.evaluate(_event("r1", "attacker-agent", "/invoices/inv-a-001")).verdict is Verdict.BLOCK
    assert engine.evaluate(_event("u1", "unknown", "/invoices/inv-a-001")).verdict is Verdict.BLOCK


def test_end_to_end_enumeration_is_eventually_non_allow_with_card() -> None:
    engine = _engine()
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    normal = engine.evaluate(_event("n1", "human-alice", "/profile", timestamp=start))
    assert normal.verdict is Verdict.ALLOW
    result = None
    for index, offset in enumerate((0, 4, 7, 9, 10), start=1):
        result = engine.evaluate(_event(f"a{index}", "attacker-agent", f"/invoices/inv-a-{index:03d}",
                    f"inv-a-{index:03d}", timestamp=start + timedelta(seconds=offset), tenant_id="tenant-a",
                    sensitive_fields_touched=["ssn"] if index == 5 else []))
    assert result.verdict in {Verdict.STEP_UP, Verdict.BLOCK}
    assert result.risk_card is not None
