"""Secrets detection engine for Zerra scanner.

Uses regex patterns for known credential formats and Shannon entropy
analysis for high-entropy strings that may be secrets.
"""

from __future__ import annotations

import math
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from agent.scanner.models import Finding, Severity, VulnerabilityType


@dataclass
class SecretPattern:
    """A regex-based pattern for detecting a specific type of secret."""
    name: str
    pattern: re.Pattern[str]
    severity: Severity = Severity.HIGH
    description: str = ""
    cwe_id: str = "CWE-798"  # Use of Hard-coded Credentials


# Built-in patterns for common secret types
_PATTERNS: list[SecretPattern] = [
    # AWS
    SecretPattern(
        name="AWS Access Key ID",
        pattern=re.compile(r"(?:^|[^A-Za-z0-9/+=])(?:AKIA[0-9A-Z]{16})(?:[^A-Za-z0-9/+=]|$)"),
        severity=Severity.CRITICAL,
        description="AWS access key ID detected — can provide access to AWS resources",
    ),
    SecretPattern(
        name="AWS Secret Access Key",
        pattern=re.compile(r"""(?:aws_secret_access_key|secret_key|aws_secret)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?""", re.IGNORECASE),
        severity=Severity.CRITICAL,
        description="AWS secret access key — provides full programmatic access to AWS",
    ),
    # GitHub
    SecretPattern(
        name="GitHub Token",
        pattern=re.compile(r"(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}"),
        severity=Severity.CRITICAL,
        description="GitHub personal access token or OAuth token",
    ),
    SecretPattern(
        name="GitHub Fine-Grained Token",
        pattern=re.compile(r"github_pat_[A-Za-z0-9_]{22,255}"),
        severity=Severity.CRITICAL,
        description="GitHub fine-grained personal access token",
    ),
    # Google
    SecretPattern(
        name="Google API Key",
        pattern=re.compile(r"AIza[0-9A-Za-z\-_]{35}"),
        severity=Severity.HIGH,
        description="Google API key — may provide access to Google Cloud services",
    ),
    # Stripe
    SecretPattern(
        name="Stripe Secret Key",
        pattern=re.compile(r"sk_live_[0-9a-zA-Z]{24,99}"),
        severity=Severity.CRITICAL,
        description="Stripe secret API key — provides full access to payment operations",
    ),
    SecretPattern(
        name="Stripe Publishable Key",
        pattern=re.compile(r"pk_live_[0-9a-zA-Z]{24,99}"),
        severity=Severity.LOW,
        description="Stripe publishable key — typically safe but confirms Stripe usage",
    ),
    # Slack
    SecretPattern(
        name="Slack Webhook URL",
        pattern=re.compile(r"https://hooks\.slack\.com/services/T[a-zA-Z0-9_]{8,}/B[a-zA-Z0-9_]{8,}/[a-zA-Z0-9_]{24,}"),
        severity=Severity.MEDIUM,
        description="Slack incoming webhook URL",
    ),
    SecretPattern(
        name="Slack Bot Token",
        pattern=re.compile(r"xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}"),
        severity=Severity.HIGH,
        description="Slack bot user OAuth token",
    ),
    # Database connection strings
    SecretPattern(
        name="Database Connection String",
        pattern=re.compile(r"(?:mongodb\+srv|postgres(?:ql)?|mysql|mssql)://[^\s'\"<>]+:[^\s'\"<>]+@[^\s'\"<>]+", re.IGNORECASE),
        severity=Severity.CRITICAL,
        description="Database connection string with embedded credentials",
    ),
    # Private keys
    SecretPattern(
        name="Private Key",
        pattern=re.compile(r"-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----"),
        severity=Severity.CRITICAL,
        description="Private key file content embedded in source code",
    ),
    # JWT
    SecretPattern(
        name="JWT Secret",
        pattern=re.compile(r"""(?:jwt[_-]?secret|jwt[_-]?key|token[_-]?secret)\s*[=:]\s*['"]([^'"]{8,})['"]""", re.IGNORECASE),
        severity=Severity.HIGH,
        description="Hardcoded JWT secret — allows forging authentication tokens",
    ),
    # Generic API keys
    SecretPattern(
        name="Generic API Key",
        pattern=re.compile(r"""(?:api[_-]?key|apikey|api[_-]?secret|access[_-]?key)\s*[=:]\s*['"]([A-Za-z0-9_\-]{16,64})['"]""", re.IGNORECASE),
        severity=Severity.MEDIUM,
        description="Potential hardcoded API key",
    ),
    # Discord
    SecretPattern(
        name="Discord Bot Token",
        pattern=re.compile(r"[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}"),
        severity=Severity.HIGH,
        description="Discord bot authentication token",
    ),
    SecretPattern(
        name="Discord Webhook URL",
        pattern=re.compile(r"https://discord(?:app)?\.com/api/webhooks/[0-9]+/[A-Za-z0-9_\-]+"),
        severity=Severity.MEDIUM,
        description="Discord webhook URL",
    ),
    # SendGrid
    SecretPattern(
        name="SendGrid API Key",
        pattern=re.compile(r"SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}"),
        severity=Severity.HIGH,
        description="SendGrid API key for email services",
    ),
    # Twilio
    SecretPattern(
        name="Twilio Auth Token",
        pattern=re.compile(r"""(?:twilio[_-]?auth[_-]?token)\s*[=:]\s*['"]([a-f0-9]{32})['"]""", re.IGNORECASE),
        severity=Severity.HIGH,
        description="Twilio authentication token",
    ),
    # OpenAI
    SecretPattern(
        name="OpenAI API Key",
        pattern=re.compile(r"sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}"),
        severity=Severity.HIGH,
        description="OpenAI API key",
    ),
    # Passwords in config
    SecretPattern(
        name="Hardcoded Password",
        pattern=re.compile(r"""(?:password|passwd|pwd)\s*[=:]\s*['"]([^'"]{4,})['"]""", re.IGNORECASE),
        severity=Severity.HIGH,
        description="Hardcoded password in configuration or source code",
        cwe_id="CWE-259",
    ),
]

# Files to always skip during secret scanning
_SKIP_EXTENSIONS: frozenset[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
    ".ttf", ".eot", ".mp3", ".mp4", ".avi", ".zip", ".tar", ".gz",
    ".bz2", ".7z", ".pdf", ".lock", ".min.js", ".min.css",
    ".map", ".pyc", ".pyo", ".class", ".o", ".so", ".dll", ".exe",
})

_SKIP_FILENAMES: frozenset[str] = frozenset({
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "poetry.lock", "Cargo.lock", "Gemfile.lock", "go.sum",
    "composer.lock", "uv.lock",
})


def _shannon_entropy(data: str) -> float:
    """Calculate Shannon entropy of a string."""
    if not data:
        return 0.0
    freq: dict[str, int] = {}
    for ch in data:
        freq[ch] = freq.get(ch, 0) + 1
    length = len(data)
    return -sum((c / length) * math.log2(c / length) for c in freq.values())


def _is_high_entropy(token: str, threshold: float = 4.5) -> bool:
    """Check if a token has suspiciously high entropy (likely a secret)."""
    if len(token) < 16:
        return False
    return _shannon_entropy(token) >= threshold


def _extract_high_entropy_strings(line: str) -> list[str]:
    """Extract candidate secret tokens from a line using entropy."""
    # Look for quoted strings and assignment values
    candidates: list[str] = []
    for match in re.finditer(r"""['"]([A-Za-z0-9+/=_\-]{16,})['"]""", line):
        token = match.group(1)
        if _is_high_entropy(token):
            candidates.append(token)
    return candidates


def scan_file_for_secrets(
    file_path: Path,
    repo_root: Path,
    *,
    max_line_length: int = 1000,
    use_entropy: bool = True,
) -> list[Finding]:
    """Scan a single file for hardcoded secrets.

    Returns a list of Finding objects for each detected secret.
    """
    findings: list[Finding] = []
    rel_path = str(file_path.relative_to(repo_root)).replace("\\", "/")

    # Skip binary / irrelevant files
    if file_path.suffix.lower() in _SKIP_EXTENSIONS:
        return findings
    if file_path.name in _SKIP_FILENAMES:
        return findings

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, UnicodeDecodeError):
        return findings

    lines = content.splitlines()

    for line_num, line in enumerate(lines, start=1):
        # Skip very long lines (likely minified / generated)
        if len(line) > max_line_length:
            continue

        # Skip obvious comments with example/placeholder values
        stripped = line.strip()
        if stripped.startswith("#") or stripped.startswith("//"):
            lower = stripped.lower()
            if any(kw in lower for kw in ("example", "placeholder", "your-", "xxx", "changeme", "todo")):
                continue

        # Pattern-based detection
        for sp in _PATTERNS:
            if sp.pattern.search(line):
                snippet = line.strip()[:200]
                findings.append(Finding(
                    title=f"{sp.name} Detected",
                    description=sp.description,
                    severity=sp.severity,
                    vulnerability_type=VulnerabilityType.SECRET,
                    cwe_id=sp.cwe_id,
                    file_path=rel_path,
                    line_start=line_num,
                    line_end=line_num,
                    code_snippet=snippet,
                    rule_id=f"zerra/secrets/{sp.name.lower().replace(' ', '-')}",
                    confidence=0.9,
                    references=[
                        "https://cwe.mitre.org/data/definitions/798.html",
                    ],
                ))
                break  # One finding per line max

        # Entropy-based detection (catches secrets not matching known patterns)
        if use_entropy:
            for token in _extract_high_entropy_strings(line):
                # Make sure we didn't already catch it via pattern
                already_found = any(
                    f.line_start == line_num and f.file_path == rel_path
                    for f in findings
                )
                if not already_found:
                    findings.append(Finding(
                        title="High-Entropy Secret Candidate",
                        description=f"A high-entropy string was detected that may be a hardcoded secret or API key (entropy: {_shannon_entropy(token):.2f})",
                        severity=Severity.MEDIUM,
                        vulnerability_type=VulnerabilityType.SECRET,
                        cwe_id="CWE-798",
                        file_path=rel_path,
                        line_start=line_num,
                        line_end=line_num,
                        code_snippet=line.strip()[:200],
                        rule_id="zerra/secrets/high-entropy",
                        confidence=0.6,
                    ))

    return findings


def scan_directory_for_secrets(
    repo_path: str | Path,
    excluded_dirs: list[str] | None = None,
) -> list[Finding]:
    """Recursively scan a directory tree for secrets."""
    root = Path(repo_path)
    if excluded_dirs is None:
        excluded_dirs = ["node_modules", ".git", "__pycache__", "vendor",
                         "dist", "build", ".next", "venv", ".venv"]
    exclude_set = set(excluded_dirs)
    all_findings: list[Finding] = []

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in exclude_set]
        for fname in filenames:
            fpath = Path(dirpath) / fname
            all_findings.extend(scan_file_for_secrets(fpath, root))

    return all_findings
