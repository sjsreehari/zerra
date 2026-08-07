from typing import Protocol

from .schema import BaseModel, Field


class TrustScoreInputs(BaseModel):
    """The per-call evidence contract consumed by the trust engine."""

    identity_id: str
    call_id: str
    auth_strength: float = Field(ge=0.0, le=1.0)
    graph_risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    sequence_risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    sensitive_fields_touched: list[str] = Field(default_factory=list)


class InputSource(Protocol):
    def get_score(self, identity_id: str, call_id: str) -> float: ...


class StubSequenceInput:
    """Safe placeholder while the sequence scorer is not wired in."""

    def get_score(self, identity_id: str, call_id: str) -> float:
        return 0.0
