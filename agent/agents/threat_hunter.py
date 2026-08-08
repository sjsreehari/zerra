"""Evidence-bound LLM threat hunting with deterministic fallback output."""

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from agent.contracts import RiskCard
from agent.llm import OllamaClient, OllamaUnavailable, redact


class Investigation(BaseModel):
    risk_card_id: str
    severity: str
    confidence: float = Field(ge=0, le=1)
    incident_summary: str
    attack_hypothesis: str
    owasp: list[str]
    mitre: list[str]
    recommended_actions: list[str]
    human_review_required: bool = True
    source: str
    created_at: datetime


class ThreatHunter:
    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or OllamaClient()

    def investigate(self, card: RiskCard) -> Investigation:
        evidence = {"risk_card": card.model_dump(mode="json"), "instruction": "Use only supplied evidence. Return concise JSON with severity, confidence, incident_summary, attack_hypothesis, owasp, mitre, recommended_actions."}
        try:
            output = self.client.json("You are SENTRA's offline security analyst. Never invent facts or authorize actions.", evidence)
            return Investigation(risk_card_id=card.id, severity=str(output.get("severity", "high")), confidence=float(output.get("confidence", card.confidence)), incident_summary=str(output.get("incident_summary", card.evidence)), attack_hypothesis=str(output.get("attack_hypothesis", card.owasp_tag)), owasp=list(output.get("owasp", [card.owasp_tag])), mitre=list(output.get("mitre", [card.mitre_tag])), recommended_actions=list(output.get("recommended_actions", self._actions(card))), source="ollama", created_at=datetime.now(timezone.utc))
        except OllamaUnavailable:
            return Investigation(risk_card_id=card.id, severity="critical" if card.verdict.value == "block" else "high", confidence=card.confidence, incident_summary=card.evidence, attack_hypothesis=f"Observed {card.owasp_tag} associated with {card.identity_id}.", owasp=[card.owasp_tag], mitre=[card.mitre_tag], recommended_actions=self._actions(card), source="deterministic-fallback", created_at=datetime.now(timezone.utc))

    @staticmethod
    def _actions(card: RiskCard) -> list[str]:
        return [f"Keep {card.identity_id} restricted pending review.", "Review the affected request timeline and tenant access logs.", "Simulate a tighter policy before any activation."]
