"""Fixed, timezone-aware traffic fixtures that feed the engine directly."""

from datetime import datetime, timedelta, timezone

from agent.contracts import CallEvent, IdentityType

from .simulator import ScenarioEvent, ScenarioType

_START = datetime(2026, 1, 1, 12, tzinfo=timezone.utc)


def _event(scenario: ScenarioType, malicious: bool, call: int, identity: str, endpoint: str, object_id: str | None,
           at: datetime, tenant: str = "tenant-a", status: int = 200, sensitive: list[str] | None = None) -> ScenarioEvent:
    return ScenarioEvent(scenario=scenario, expected_malicious=malicious, event=CallEvent(
        id=f"{scenario.value}-{call}", identity_id=identity, identity_type=IdentityType.HUMAN, timestamp=at,
        endpoint=endpoint, method="GET", object_id=object_id, object_type="invoice", tenant_id=tenant,
        status_code=status, sensitive_fields_touched=sensitive or []))


def normal_repeating_user_traffic(identity_id: str = "human-alice", n_calls: int = 20) -> list[ScenarioEvent]:
    return [_event(ScenarioType.NORMAL, False, i, identity_id, f"/invoices/inv-a-{(i % 3) + 1:03d}",
                   f"inv-a-{(i % 3) + 1:03d}", _START + timedelta(seconds=i * 30)) for i in range(1, n_calls + 1)]


def fast_invoice_enumeration(identity_id: str = "attacker-agent", n_calls: int = 10) -> list[ScenarioEvent]:
    return [_event(ScenarioType.FAST_ENUMERATION, True, i, identity_id, f"/invoices/inv-a-{i:03d}", f"inv-a-{i:03d}",
                   _START + timedelta(seconds=i), sensitive=["ssn"] if i >= 5 else []) for i in range(1, n_calls + 1)]


def slow_mutated_enumeration(identity_id: str = "attacker-agent", n_calls: int = 10) -> list[ScenarioEvent]:
    gaps = (0, 9, 17, 24, 30, 35, 39, 42, 44, 45)
    return [_event(ScenarioType.SLOW_MUTATED_ENUMERATION, True, i, identity_id, f"/invoices/inv-a-{i:03d}", f"inv-a-{i:03d}",
                   _START + timedelta(seconds=gaps[i - 1]), sensitive=["salary"] if i >= 5 else []) for i in range(1, n_calls + 1)]


def cross_tenant_access(identity_id: str = "attacker-agent") -> list[ScenarioEvent]:
    return [_event(ScenarioType.CROSS_TENANT, True, 1, identity_id, "/invoices/inv-a-001", "inv-a-001", _START),
            _event(ScenarioType.CROSS_TENANT, True, 2, identity_id, "/invoices/inv-b-001", "inv-b-001", _START + timedelta(seconds=2), tenant="tenant-b")]


def agent_scope_violation(identity_id: str = "finance-agent") -> list[ScenarioEvent]:
    return [_event(ScenarioType.SCOPE_VIOLATION, True, 1, identity_id, "/admin/export", None, _START)]


def credential_probing(identity_id: str = "attacker-agent", n_calls: int = 4) -> list[ScenarioEvent]:
    return [_event(ScenarioType.CREDENTIAL_PROBING, True, i, identity_id, "/invoices/login", None, _START + timedelta(seconds=i), status=401)
            for i in range(1, n_calls + 1)]
