"""Data contracts for the sequence scorer.

If a shared ``agent.models.CallEvent`` is added later, the service accepts that
structural shape too; this local class keeps this independently deployable module
usable while the shared contract does not yet exist.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


@dataclass(frozen=True)
class CallEvent:
    id: str
    identity_id: str
    timestamp: datetime
    endpoint: str
    method: str
    object_id: Optional[str] = None
    object_type: Optional[str] = None
    status_code: int = 200
    response_fields: list[str] = field(default_factory=list)
    identity_type: str = "human"
    scope_contract: Optional[list[str]] = None
    params: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SequenceWindow:
    identity_id: str
    events: list[CallEvent]
    max_size: int = 10


@dataclass(frozen=True)
class PatternMatch:
    pattern_name: str
    matched_at_call_index: int
    confidence: float


@dataclass(frozen=True)
class SequenceRiskScore:
    identity_id: str
    sequence_risk_score: float
    triggered_pattern: Optional[PatternMatch]
    feature_snapshot: dict[str, Any]
    scored_at: datetime
    latency_ms: float


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
