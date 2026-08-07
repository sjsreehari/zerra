"""Dependency-injected pure Python security decision pipeline."""

from datetime import datetime, timezone

from agent.contracts import (CallEvent, DecisionResponse, IdentityType, TrustZone,
                             Verdict)
from agent.graph import IntentGraphStore
from agent.identity import IdentityRegistry
from agent.policy import PolicyAction, PolicyEngine
from agent.risk_cards import RiskCardBuilder
from agent.sequential.models import CallEvent as SequenceCallEvent
from agent.sequential.scorer_service import score as score_sequence
from agent.trust import TrustScoreInputs, TrustScoreStore

class SentraEngine:
    def __init__(self, registry: IdentityRegistry, graph_store: IntentGraphStore, trust_store: TrustScoreStore,
                 policy_engine: PolicyEngine | None = None) -> None:
        self.registry = registry
        self.graph_store = graph_store
        self.trust_store = trust_store
        self.policy_engine = policy_engine or PolicyEngine()
        self.risk_cards = RiskCardBuilder()

    def evaluate(self, event: CallEvent) -> DecisionResponse:
        identity = self.registry.get(event.identity_id)
        if identity is None:
            return self._immediate(event, "unknown identity", "identity-resolution", hard_block=True)
        enriched = event.model_copy(update={"identity_type": identity.type, "home_tenant_id": identity.tenant_id,
                                             "scope_contract": identity.scope_contract})
        graph = self.graph_store.score(enriched)
        sequence = score_sequence(self._sequence_event(enriched))
        trust = self.trust_store.process(TrustScoreInputs(identity.id, enriched.id, identity.auth_strength,
                                                          graph.graph_risk_score, sequence.sequence_risk_score,
                                                          enriched.sensitive_fields_touched))
        self.graph_store.record_call(enriched)
        evaluations = self.policy_engine.evaluate(event=enriched, identity=identity, trust_score=trust.trust_score, graph_result=graph)
        policy_action = self.policy_engine.final_action(evaluations)
        verdict = Verdict(policy_action.value) if policy_action is not PolicyAction.ALLOW else Verdict(trust.verdict.value)
        matched = [item for item in evaluations if item.matched]
        reason = matched[0].reason if matched else trust.evidence
        return self._response(enriched, verdict, graph, sequence, trust, reason, [item.policy_id for item in matched], evaluations)

    @staticmethod
    def _sequence_event(event: CallEvent) -> SequenceCallEvent:
        return SequenceCallEvent(id=event.id, identity_id=event.identity_id, timestamp=event.timestamp,
                                 endpoint=event.endpoint, method=event.method, object_id=event.object_id,
                                 object_type=event.object_type, status_code=event.status_code,
                                 response_fields=[*event.response_fields, *event.sensitive_fields_touched],
                                 identity_type=event.identity_type.value, scope_contract=event.scope_contract,
                                 params=event.metadata)

    def _immediate(self, event: CallEvent, reason: str, policy: str, hard_block: bool) -> DecisionResponse:
        from agent.policy import PolicyEvaluation
        evaluation = PolicyEvaluation(policy_id=policy, policy_name=policy, matched=True, action=PolicyAction.BLOCK,
                                      reason=reason, evaluated_at=datetime.now(timezone.utc))
        return self._response(event, Verdict.BLOCK, None, None, None, reason, [policy], [evaluation])

    def _response(self, event: CallEvent, verdict: Verdict, graph, sequence, trust, reason: str,
                  policies: list[str], evaluations) -> DecisionResponse:
        zone = TrustZone.GREEN if verdict is Verdict.ALLOW else TrustZone.YELLOW if verdict is Verdict.STEP_UP else TrustZone.RED
        graph_score = graph.graph_risk_score if graph else 0.0
        sequence_score = sequence.sequence_risk_score if sequence else 0.0
        trust_score = trust.trust_score if trust else 0.0
        card = None if verdict is Verdict.ALLOW else self.risk_cards.build(event=event, verdict=verdict,
            graph_result=graph, sequence_result=sequence, trust_result=trust, policy_results=evaluations)
        return DecisionResponse(call_id=event.id, identity_id=event.identity_id, verdict=verdict,
                                trust_score=trust_score, zone=zone, graph_risk_score=graph_score,
                                sequence_risk_score=sequence_score, allowed=verdict is Verdict.ALLOW,
                                reason=reason, risk_card=card, timestamp=datetime.now(timezone.utc),
                                policy_ids_applied=policies)
