"""Core data models for the Zerra scanner engine.

Defines Pydantic models for scan configuration, findings, severity levels,
fix suggestions, and overall scan results.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class Severity(str, enum.Enum):
    """CVSS-aligned severity buckets."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ScanMode(str, enum.Enum):
    """Controls scan depth / time trade-off."""
    QUICK = "quick"       # ~1-3 min — changed files only (CI/PR)
    STANDARD = "standard" # ~5-15 min — full repo scan
    DEEP = "deep"         # ~15-60 min — full + dependency + secrets + DAST


class ScanStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FindingStatus(str, enum.Enum):
    OPEN = "open"
    FIXED = "fixed"
    IGNORED = "ignored"
    FALSE_POSITIVE = "false_positive"


class VulnerabilityType(str, enum.Enum):
    """Broad category of vulnerability."""
    SAST = "sast"           # Static code analysis finding
    SCA = "sca"             # Dependency / supply-chain
    SECRET = "secret"       # Leaked credential / token
    MISCONFIG = "misconfig" # Infrastructure / config issue
    DAST = "dast"           # Runtime / dynamic finding


class FixSuggestion(BaseModel):
    """A proposed code patch for a finding."""
    file_path: str = Field(..., description="Relative path to the file to patch")
    original_code: str = Field(..., description="Lines that should be replaced")
    fixed_code: str = Field(..., description="Replacement lines")
    explanation: str = Field(..., description="Human-readable explanation of the fix")


class Finding(BaseModel):
    """A single security finding produced by a scan."""
    id: str = Field(default_factory=lambda: uuid4().hex[:12])
    title: str
    description: str
    severity: Severity
    vulnerability_type: VulnerabilityType
    cwe_id: Optional[str] = None          # e.g. "CWE-79"
    cvss_score: Optional[float] = None    # 0.0 - 10.0
    owasp_category: Optional[str] = None  # e.g. "A03:2021 Injection"
    file_path: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    code_snippet: Optional[str] = None
    rule_id: Optional[str] = None         # ID of the rule that triggered
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    is_reachable: Optional[bool] = None   # Reachability analysis result
    status: FindingStatus = FindingStatus.OPEN
    fix_suggestion: Optional[FixSuggestion] = None
    references: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    first_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # SCA-specific fields
    package_name: Optional[str] = None
    package_version: Optional[str] = None
    fixed_version: Optional[str] = None
    cve_id: Optional[str] = None


class ScanConfig(BaseModel):
    """Configuration for a single scan run."""
    repo_url: str
    branch: Optional[str] = "main"
    commit_sha: Optional[str] = None
    mode: ScanMode = ScanMode.STANDARD
    target_paths: list[str] = Field(default_factory=list,
                                     description="Limit scan to these paths (empty = full repo)")
    excluded_paths: list[str] = Field(
        default_factory=lambda: [
            "node_modules", "vendor", ".git", "__pycache__",
            "dist", "build", ".next", "venv", ".venv",
        ]
    )
    enable_sast: bool = True
    enable_sca: bool = True
    enable_secrets: bool = True
    github_token: Optional[str] = None
    max_file_size_kb: int = 500


class ScanResult(BaseModel):
    """Aggregate result of a complete scan run."""
    id: str = Field(default_factory=lambda: uuid4().hex[:16])
    repo_url: str
    branch: Optional[str] = None
    commit_sha: Optional[str] = None
    mode: ScanMode
    status: ScanStatus = ScanStatus.QUEUED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    findings: list[Finding] = Field(default_factory=list)
    files_scanned: int = 0
    languages_detected: list[str] = Field(default_factory=list)
    error_message: Optional[str] = None

    @property
    def critical_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.CRITICAL)

    @property
    def high_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.HIGH)

    @property
    def medium_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.MEDIUM)

    @property
    def low_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.LOW)

    @property
    def security_score(self) -> str:
        """A-F letter grade based on finding severity distribution."""
        total_weight = (
            self.critical_count * 10
            + self.high_count * 5
            + self.medium_count * 2
            + self.low_count * 1
        )
        if total_weight == 0:
            return "A+"
        if total_weight <= 3:
            return "A"
        if total_weight <= 8:
            return "B"
        if total_weight <= 15:
            return "C"
        if total_weight <= 25:
            return "D"
        return "F"
