"""In-memory demo identities. Never store plaintext API tokens in production."""

from fnmatch import fnmatchcase

from agent.contracts import Identity, IdentityType


class IdentityRegistry:
    """Local token lookup plus deterministic Agent Firewall scope enforcement."""
    def __init__(self) -> None:
        identities = [
            Identity(id="human-alice", type=IdentityType.HUMAN, tenant_id="tenant-a", auth_strength=.95, display_name="Alice"),
            Identity(id="billing-service", type=IdentityType.SERVICE, tenant_id="tenant-a", auth_strength=.90, display_name="Billing Service"),
            Identity(id="finance-agent", type=IdentityType.AGENT, tenant_id="tenant-a", auth_strength=.92, scope_contract=["/invoices/*"], display_name="Finance Agent"),
            Identity(id="attacker-agent", type=IdentityType.AGENT, tenant_id="tenant-a", auth_strength=.80, scope_contract=["/invoices/*"], display_name="Attacker Agent"),
        ]
        self._identities = {identity.id: identity for identity in identities}
        # Deliberately plaintext only for an isolated, in-memory demo.
        self._tokens = {"demo-human-token": "human-alice", "demo-billing-token": "billing-service",
                        "demo-finance-agent-token": "finance-agent", "demo-attacker-token": "attacker-agent"}

    def authenticate_token(self, token: str) -> Identity | None:
        identity_id = self._tokens.get(token)
        identity = self._identities.get(identity_id) if identity_id else None
        return identity if identity and not identity.is_revoked else None

    def get(self, identity_id: str) -> Identity | None:
        return self._identities.get(identity_id)

    def list_identities(self) -> list[Identity]:
        return list(self._identities.values())

    def revoke(self, identity_id: str) -> Identity:
        identity = self._require(identity_id)
        updated = identity.model_copy(update={"is_revoked": True})
        self._identities[identity_id] = updated
        return updated

    def restore(self, identity_id: str) -> Identity:
        identity = self._require(identity_id)
        updated = identity.model_copy(update={"is_revoked": False})
        self._identities[identity_id] = updated
        return updated

    def is_endpoint_allowed(self, identity: Identity, endpoint: str) -> bool:
        if identity.is_revoked:
            return False
        if not identity.scope_contract:
            return identity.type in {IdentityType.HUMAN, IdentityType.SERVICE}
        return any(fnmatchcase(endpoint, pattern) for pattern in identity.scope_contract)

    def _require(self, identity_id: str) -> Identity:
        identity = self.get(identity_id)
        if identity is None:
            raise KeyError(f"Unknown identity: {identity_id}")
        return identity
