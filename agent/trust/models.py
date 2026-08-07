from datetime import datetime
from enum import Enum

from .schema import BaseModel, Field


class TrustZone(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class Verdict(str, Enum):
    ALLOW = "allow"
    STEP_UP = "step_up"
    BLOCK = "block"


class FactorBreakdown(BaseModel):
    name: str
    raw_value: float = Field(ge=0.0, le=1.0)
    weight: float = Field(ge=0.0, le=1.0)
    contribution: float = Field(ge=0.0, le=1.0)
    source_module: str


class ScoreState(BaseModel):
    identity_id: str
    trust_score: float = Field(default=100.0, ge=0.0, le=100.0)
    previous_score: float = Field(default=100.0, ge=0.0, le=100.0)
    zone: TrustZone = TrustZone.GREEN
    consecutive_zone_calls: int = Field(default=0, ge=0)
    last_updated: datetime
    ewma_state: float = Field(default=1.0, ge=0.0, le=1.0)
    call_count: int = Field(default=0, ge=0)


class TrustScoreResult(BaseModel):
    identity_id: str
    call_id: str
    trust_score: float = Field(ge=0.0, le=100.0)
    zone: TrustZone
    verdict: Verdict
    zone_changed: bool
    factors: list[FactorBreakdown]
    evidence: str
    timestamp: datetime
