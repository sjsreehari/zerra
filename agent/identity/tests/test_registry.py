from agent.contracts import Identity, IdentityType
from agent.identity import IdentityRegistry


def test_token_lookup_and_revocation_lifecycle() -> None:
    registry = IdentityRegistry()
    assert registry.authenticate_token("demo-attacker-token").id == "attacker-agent"
    registry.revoke("attacker-agent")
    assert registry.authenticate_token("demo-attacker-token") is None
    assert registry.restore("attacker-agent").is_revoked is False


def test_agent_scope_and_unscoped_default_denial() -> None:
    registry = IdentityRegistry()
    agent = registry.get("finance-agent")
    assert registry.is_endpoint_allowed(agent, "/invoices/inv-a-001")
    assert not registry.is_endpoint_allowed(agent, "/admin/users")
    unscoped = Identity(id="u", type=IdentityType.AGENT, tenant_id="t", auth_strength=.8)
    assert not registry.is_endpoint_allowed(unscoped, "/anything")
