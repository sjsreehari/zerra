"""Deterministic Risk Card construction; no model or network calls."""

from datetime import datetime, timezone
from uuid import uuid5, NAMESPACE_URL

from agent.contracts import CallEvent, RiskCard, Verdict


class RiskCardBuilder:
    def build(self, event: CallEvent, verdict: Verdict, trust_score: float, graph_score: float,
              sequence_score: float, graph_evidence: str, sequence_pattern: str | None,
              trust_evidence: str, reason: str, hard_block: bool = False) -> RiskCard:
        if "scope" in reason.lower():
            owasp, mitre = "OWASP API5: Broken Function Level Authorization", "T1078-adjacent"
        elif sequence_pattern == "credential_probing":
            owasp, mitre = "OWASP API2: Broken Authentication", "T1110-adjacent"
        else:
            owasp, mitre = "OWASP API1: Broken Object Level Authorization", "T1190-adjacent"
        confidence = max(.95 if hard_block else 0.0, graph_score, sequence_score)
        evidence = f"{reason}; graph: {graph_evidence}; sequence: {sequence_pattern or 'no matched pattern'}; trust: {trust_evidence}."
        return RiskCard(id=str(uuid5(NAMESPACE_URL, f"{event.id}:{verdict.value}")), identity_id=event.identity_id,
                        call_ids=[event.id], verdict=verdict, confidence=confidence, graph_risk_score=graph_score,
                        sequence_risk_score=sequence_score, trust_score=trust_score, owasp_tag=owasp,
                        mitre_tag=mitre, evidence=evidence, timestamp=datetime.now(timezone.utc),
                        factors=[{"graph_evidence": graph_evidence}, {"sequence_pattern": sequence_pattern}, {"trust_evidence": trust_evidence}])
