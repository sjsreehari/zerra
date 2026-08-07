"""Deterministic trust calculation: it returns a recommendation, not an HTTP action."""

from dataclasses import dataclass
from enum import Enum


class TrustVerdict(str, Enum):
    ALLOW = "allow"
    STEP_UP = "step_up"
    BLOCK = "block"


@dataclass(frozen=True)
class TrustScoreInputs:
    identity_id: str
    call_id: str
    auth_strength: float
    graph_risk_score: float
    sequence_risk_score: float
    sensitive_fields_touched: list[str]


@dataclass(frozen=True)
class TrustScoreResult:
    trust_score: float
    verdict: TrustVerdict
    evidence: str


class TrustScoreStore:
    def __init__(self) -> None:
        self._latest_scores: dict[str, float] = {}

    def process(self, inputs: TrustScoreInputs) -> TrustScoreResult:
        sensitive_penalty = min(.15, .05 * len(inputs.sensitive_fields_touched))
        risk = max(inputs.graph_risk_score, inputs.sequence_risk_score)
        trust = max(0.0, min(100.0, 100 * (1 - risk) - (1 - inputs.auth_strength) * 15 - sensitive_penalty * 100))
        verdict = TrustVerdict.BLOCK if risk >= .85 else TrustVerdict.STEP_UP if risk >= .5 else TrustVerdict.ALLOW
        result = TrustScoreResult(trust, verdict, f"max risk {risk:.2f}; auth strength {inputs.auth_strength:.2f}")
        self._latest_scores[inputs.identity_id] = trust
        return result
