"""Dependency-injected pure Python security decision pipeline."""

from datetime import datetime, timezone

from agent.contracts import (CallEvent, DecisionResponse, IdentityType, TrustZone,
                             Verdict)
from agent.graph import IntentGraphStore
from agent.identity import IdentityRegistry
from agent.sequential.models import CallEvent as SequenceCallEvent
from agent.sequential.scorer_service import score as score_sequence
from agent.trust import TrustScoreInputs, TrustScoreStore

from .risk_cards import RiskCardBuilder


class SentraEngine:
    def __init__(self, registry: IdentityRegistry, graph_store: IntentGraphStore, trust_store: TrustScoreStore) -> None:
        self.registry = registry
        self.graph_store = graph_store
        self.trust_store = trust_store
        self.risk_cards = RiskCardBuilder()

    def evaluate(self, event: CallEvent) -> DecisionResponse:
        identity = self.registry.get(event.identity_id)
        if identity is None:
            return self._immediate(event, "unknown identity", "identity-resolution", hard_block=True)
        enriched = event.model_copy(update={"identity_type": identity.type, "home_tenant_id": identity.tenant_id,
                                             "scope_contract": identity.scope_contract})
        if identity.is_revoked:
            self.graph_store.record_call(enriched)
            return self._immediate(enriched, "identity revoked: kill switch is active", "identity-revocation", hard_block=True)
        scope_violation = identity.type in {IdentityType.AGENT, IdentityType.MCP_SERVER} and not self.registry.is_endpoint_allowed(identity, enriched.endpoint)
        graph = self.graph_store.score(enriched)
        sequence = score_sequence(self._sequence_event(enriched))
        trust = self.trust_store.process(TrustScoreInputs(identity.id, enriched.id, identity.auth_strength,
                                                          graph.graph_risk_score, sequence.sequence_risk_score,
                                                          enriched.sensitive_fields_touched))
        self.graph_store.record_call(enriched)
        verdict = Verdict.BLOCK if scope_violation else Verdict(trust.verdict.value)
        reason = "agent scope contract violation" if scope_violation else trust.evidence
        policies = ["agent-scope-contract"] if scope_violation else []
        return self._response(enriched, verdict, trust.trust_score, graph.graph_risk_score, sequence.sequence_risk_score,
                              graph.evidence, sequence.triggered_pattern.pattern_name if sequence.triggered_pattern else None,
                              trust.evidence, reason, policies)

    @staticmethod
    def _sequence_event(event: CallEvent) -> SequenceCallEvent:
        return SequenceCallEvent(id=event.id, identity_id=event.identity_id, timestamp=event.timestamp,
                                 endpoint=event.endpoint, method=event.method, object_id=event.object_id,
                                 object_type=event.object_type, status_code=event.status_code,
                                 response_fields=[*event.response_fields, *event.sensitive_fields_touched],
                                 identity_type=event.identity_type.value, scope_contract=event.scope_contract,
                                 params=event.metadata)

    def _immediate(self, event: CallEvent, reason: str, policy: str, hard_block: bool) -> DecisionResponse:
        return self._response(event, Verdict.BLOCK, 0.0, 0.0, 0.0, "not scored", None, reason, reason, [policy], hard_block)

    def _response(self, event: CallEvent, verdict: Verdict, trust_score: float, graph_score: float, sequence_score: float,
                  graph_evidence: str, pattern: str | None, trust_evidence: str, reason: str,
                  policies: list[str], hard_block: bool = False) -> DecisionResponse:
        zone = TrustZone.GREEN if verdict is Verdict.ALLOW else TrustZone.YELLOW if verdict is Verdict.STEP_UP else TrustZone.RED
        card = None if verdict is Verdict.ALLOW else self.risk_cards.build(event, verdict, trust_score, graph_score,
            sequence_score, graph_evidence, pattern, trust_evidence, reason, hard_block)
        return DecisionResponse(call_id=event.id, identity_id=event.identity_id, verdict=verdict,
                                trust_score=trust_score, zone=zone, graph_risk_score=graph_score,
                                sequence_risk_score=sequence_score, allowed=verdict is Verdict.ALLOW,
                                reason=reason, risk_card=card, timestamp=datetime.now(timezone.utc),
                                policy_ids_applied=policies)
