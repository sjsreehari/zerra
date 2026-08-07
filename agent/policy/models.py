from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class PolicyAction(str, Enum):
    ALLOW = "allow"
    STEP_UP = "step_up"
    BLOCK = "block"


class PolicyEvaluation(BaseModel):
    policy_id: str
    policy_name: str
    matched: bool
    action: PolicyAction
    reason: str
    evidence: dict[str, Any] = Field(default_factory=dict)
    evaluated_at: datetime


class PolicySimulationResult(BaseModel):
    policy_id: str
    total_events: int
    matched_events: int
    would_allow: int
    would_step_up: int
    would_block: int
    matches: list[PolicyEvaluation]
    summary: str
