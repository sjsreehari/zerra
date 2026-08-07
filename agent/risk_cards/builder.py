"""Deterministic Risk Card evidence and ATT&CK/API mapping."""

from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid5

from agent.contracts import CallEvent, RiskCard, Verdict
from agent.graph import GraphScoreResult
from agent.policy import PolicyEvaluation
from agent.sequential.models import SequenceRiskScore
from agent.trust import TrustScoreResult


class RiskCardBuilder:
    def build(self, *, event: CallEvent, verdict: Verdict, graph_result: GraphScoreResult | None,
              sequence_result: SequenceRiskScore | None, trust_result: TrustScoreResult | None,
              policy_results: list[PolicyEvaluation] | None = None) -> RiskCard:
        if verdict is Verdict.ALLOW:
            raise ValueError("Risk cards are only created for step_up or block decisions")
        policies = [result for result in policy_results or [] if result.matched]
        graph_score = graph_result.graph_risk_score if graph_result else 0.0
        sequence_score = sequence_result.sequence_risk_score if sequence_result else 0.0
        trust_score = trust_result.trust_score if trust_result else 0.0
        names = " ".join(f"{item.policy_id} {item.reason}" for item in policies).lower()
        pattern = sequence_result.triggered_pattern.pattern_name if sequence_result and sequence_result.triggered_pattern else None
        hard = any(key in names for key in ("revok", "scope", "cross-tenant"))
        confidence = min(1.0, max(graph_score, sequence_score, 0.95 if hard else 0.0))
        owasp, mitre = self._tags(names, pattern, graph_result)
        evidence = [f"call {event.id}"]
        if graph_result:
            evidence.append(f"graph: {graph_result.evidence}")
        if pattern and sequence_result and sequence_result.triggered_pattern:
            evidence.append(f"sequence: {pattern} at call index {sequence_result.triggered_pattern.matched_at_call_index}")
        if trust_result:
            evidence.append(f"trust: {trust_result.evidence}")
        evidence.extend(f"policy {item.policy_name}: {item.reason}" for item in policies)
        factors = ([{"graph": graph_result.evidence}] if graph_result else []) + ([{"sequence_pattern": pattern}] if pattern else []) + ([{"trust": trust_result.evidence}] if trust_result else []) + [{"policy": item.model_dump()} for item in policies]
        return RiskCard(id=str(uuid5(NAMESPACE_URL, f"{event.id}:{verdict.value}")), identity_id=event.identity_id,
                        call_ids=[event.id], verdict=verdict, confidence=confidence, graph_risk_score=graph_score,
                        sequence_risk_score=sequence_score, trust_score=trust_score, owasp_tag=owasp, mitre_tag=mitre,
                        evidence="; ".join(evidence), timestamp=datetime.now(timezone.utc), factors=factors)

    @staticmethod
    def _tags(policy_text: str, pattern: str | None, graph_result: GraphScoreResult | None) -> tuple[str, str]:
        graph_text = graph_result.evidence.lower() if graph_result else ""
        if "revok" in policy_text:
            return "OWASP API2: Broken Authentication", "T1078-adjacent: Valid Accounts"
        if "scope" in policy_text:
            return "OWASP API5: Broken Function Level Authorization", "T1078-adjacent: Valid Accounts"
        if "cross-tenant" in policy_text or "cross-tenant" in graph_text:
            return "OWASP API1: Broken Object Level Authorization", "T1190-adjacent: Exploit Public-Facing Application"
        if pattern == "credential_probing":
            return "OWASP API2: Broken Authentication", "T1110-adjacent: Brute Force"
        if pattern == "enumeration_exfil" or "distinct objects" in graph_text:
            return "OWASP API1: Broken Object Level Authorization", "T1190-adjacent: Exploit Public-Facing Application"
        return "OWASP API4: Unrestricted Resource Consumption", "T1496-adjacent: Resource Hijacking"
