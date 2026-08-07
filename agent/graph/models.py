"""Public graph result models and permissive adapters for shared call events."""

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NodeType(str, Enum):
    IDENTITY = "identity"
    OBJECT = "object"
    ENDPOINT = "endpoint"
    TENANT = "tenant"


class RelationType(str, Enum):
    IDENTITY_TO_OBJECT = "touches"
    IDENTITY_TO_ENDPOINT = "calls"
    OBJECT_TO_TENANT = "belongs_to"


class GraphEdge(BaseModel):
    src: str
    dst: str
    relation: RelationType
    first_seen: datetime
    last_seen: datetime
    weight: float = 1.0
    call_count: int = 1


class SignalResult(BaseModel):
    name: str
    score: float = Field(ge=0.0, le=1.0)
    raw_value: float
    threshold: float
    fired: bool
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphScoreResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    identity_id: str
    call_id: str
    graph_risk_score: float = Field(ge=0.0, le=1.0)
    signals: list[SignalResult]
    evidence: str


@dataclass(frozen=True, slots=True)
class CallView:
    """Normalized event view; accepts dicts, dataclasses, and Pydantic shared models."""

    call_id: str
    identity_id: str
    object_id: str
    object_type: str
    endpoint: str
    tenant_id: str | None
    home_tenant_id: str | None
    timestamp: datetime


def _read(value: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        if isinstance(value, dict) and name in value and value[name] is not None:
            return value[name]
        if hasattr(value, name):
            candidate = getattr(value, name)
            if candidate is not None:
                return candidate
    return default


def _timestamp(value: Any) -> datetime:
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if not isinstance(value, datetime):
        return datetime.now(UTC)
    return value.replace(tzinfo=value.tzinfo or UTC)


def normalize_call(call: Any) -> CallView:
    """Adapt common CallEvent field names without coupling this package to agent models."""
    identity = _read(call, "identity_id", "user_id", "principal_id")
    nested_identity = _read(call, "identity", "principal")
    if identity is None and nested_identity is not None:
        identity = _read(nested_identity, "id", "identity_id", "user_id")
    object_id = _read(call, "object_id", "resource_id", "target_id", "entity_id")
    if identity is None or object_id is None:
        raise ValueError("CallEvent must provide identity_id (or identity.id) and object_id (or resource_id)")
    tenant = _read(call, "tenant_id", "object_tenant_id", "target_tenant_id")
    home_tenant = _read(call, "home_tenant_id", "identity_tenant_id")
    if home_tenant is None and nested_identity is not None:
        home_tenant = _read(nested_identity, "tenant_id", "home_tenant_id")
    return CallView(
        call_id=str(_read(call, "call_id", "event_id", "request_id", "id", default=f"{identity}:{object_id}")),
        identity_id=str(identity),
        object_id=str(object_id),
        object_type=str(_read(call, "object_type", "resource_type", "entity_type", default="object")),
        endpoint=str(_read(call, "endpoint", "path", "route", default="unknown")),
        tenant_id=str(tenant) if tenant is not None else None,
        home_tenant_id=str(home_tenant) if home_tenant is not None else None,
        timestamp=_timestamp(_read(call, "timestamp", "occurred_at", "created_at", "time")),
    )
