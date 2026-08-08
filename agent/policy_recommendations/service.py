from datetime import datetime, timezone
from uuid import uuid4

from pydantic import BaseModel

from agent.contracts import Policy, PolicyStatus, RiskCard


class PolicyRecommendation(BaseModel):
    id: str
    policy: Policy
    reason: str
    risk_card_id: str
    approved: bool = False
    created_at: datetime


class PolicyRecommendationService:
    def propose(self, card: RiskCard) -> PolicyRecommendation:
        if "API1" in card.owasp_tag:
            rule_type, params = "cross_tenant_access", {"action": "block"}
        elif "API4" in card.owasp_tag or "enumeration" in card.evidence.lower():
            rule_type, params = "novel_object_rate", {"max_distinct_novel_objects": 5, "window_seconds": 60, "action": "step_up"}
        else:
            rule_type, params = "trust_score_threshold", {"step_up_below": 70, "block_below": 40}
        policy = Policy(id=f"llm-{uuid4()}", name=f"Recommended response for {card.owasp_tag}", description="Generated from a Risk Card; requires human approval.", rule_type=rule_type, parameters=params, version=1, status=PolicyStatus.DRAFT)
        return PolicyRecommendation(id=str(uuid4()), policy=policy, reason=f"Derived from Risk Card {card.id}: {card.evidence}", risk_card_id=card.id, created_at=datetime.now(timezone.utc))
