"""Stable, validated data contracts for local security decisions."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class IdentityType(str, Enum):
    HUMAN = "human"
    SERVICE = "service"
    AGENT = "agent"
    MCP_SERVER = "mcp_server"


class Verdict(str, Enum):
    ALLOW = "allow"
    STEP_UP = "step_up"
    BLOCK = "block"


class TrustZone(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class PolicyStatus(str, Enum):
    DRAFT = "draft"
    SIMULATED = "simulated"
    ACTIVE = "active"


class Identity(BaseModel):
    id: str
    type: IdentityType
    tenant_id: str
    auth_strength: float = Field(ge=0, le=1)
    scope_contract: list[str] = Field(default_factory=list)
    trust_score: float = Field(default=100, ge=0, le=100)
    is_revoked: bool = False
    display_name: str | None = None


class CallEvent(BaseModel):
    """An immutable-by-convention request observation supplied to the engine."""
    model_config = ConfigDict(extra="forbid")

    id: str
    identity_id: str
    identity_type: IdentityType
    timestamp: AwareDatetime
    endpoint: str
    method: str
    object_id: str | None = None
    object_type: str | None = None
    tenant_id: str | None = None
    home_tenant_id: str | None = None
    status_code: int = 200
    response_fields: list[str] = Field(default_factory=list)
    sensitive_fields_touched: list[str] = Field(default_factory=list)
    scope_contract: list[str] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RiskCard(BaseModel):
    id: str
    identity_id: str
    call_ids: list[str]
    verdict: Verdict
    confidence: float = Field(ge=0, le=1)
    graph_risk_score: float = Field(ge=0, le=1)
    sequence_risk_score: float = Field(ge=0, le=1)
    trust_score: float = Field(ge=0, le=100)
    owasp_tag: str
    mitre_tag: str
    evidence: str
    timestamp: AwareDatetime
    factors: list[dict[str, Any]] = Field(default_factory=list)


class Policy(BaseModel):
    id: str
    name: str
    description: str
    rule_type: str
    parameters: dict[str, Any]
    version: int = Field(ge=1)
    status: PolicyStatus


class DecisionResponse(BaseModel):
    call_id: str
    identity_id: str
    verdict: Verdict
    trust_score: float = Field(ge=0, le=100)
    zone: TrustZone
    graph_risk_score: float = Field(ge=0, le=1)
    sequence_risk_score: float = Field(ge=0, le=1)
    allowed: bool
    reason: str
    risk_card: RiskCard | None = None
    timestamp: AwareDatetime
    policy_ids_applied: list[str] = Field(default_factory=list)
