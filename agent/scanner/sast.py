"""SAST rule engine for Zerra scanner.

Loads YAML-based security rules and applies regex pattern matching
against source code files to detect common vulnerability classes.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import yaml

from agent.scanner.models import Finding, Severity, VulnerabilityType


@dataclass
class SASTRule:
    """A single pattern-based security rule."""
    id: str
    title: str
    description: str
    severity: Severity
    pattern: re.Pattern[str]
    languages: list[str]          # e.g. ["python", "javascript"]
    cwe_id: Optional[str] = None
    owasp_category: Optional[str] = None
    fix_hint: Optional[str] = None
    confidence: float = 0.8
    file_patterns: list[str] = field(default_factory=list)  # e.g. ["*.py"]
    negative_pattern: Optional[re.Pattern[str]] = None  # If matched, suppress finding


def _severity_from_str(s: str) -> Severity:
    return Severity(s.lower())


def load_rules_from_yaml(yaml_path: Path) -> list[SASTRule]:
    """Parse a YAML rule file into SASTRule objects."""
    try:
        data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError):
        return []

    if not isinstance(data, dict) or "rules" not in data:
        return []

    rules: list[SASTRule] = []
    for r in data["rules"]:
        try:
            negative = None
            if r.get("negative_pattern"):
                negative = re.compile(r["negative_pattern"], re.IGNORECASE | re.MULTILINE)

            rules.append(SASTRule(
                id=r["id"],
                title=r["title"],
                description=r.get("description", ""),
                severity=_severity_from_str(r.get("severity", "medium")),
                pattern=re.compile(r["pattern"], re.IGNORECASE | re.MULTILINE),
                languages=r.get("languages", []),
                cwe_id=r.get("cwe_id"),
                owasp_category=r.get("owasp_category"),
                fix_hint=r.get("fix_hint"),
                confidence=float(r.get("confidence", 0.8)),
                file_patterns=r.get("file_patterns", []),
                negative_pattern=negative,
            ))
        except (KeyError, re.error):
            continue

    return rules


def load_all_rules(rules_dir: Path | None = None) -> list[SASTRule]:
    """Load all YAML rule files from the rules directory."""
    if rules_dir is None:
        rules_dir = Path(__file__).parent / "rules"

    all_rules: list[SASTRule] = []
    if not rules_dir.is_dir():
        return all_rules

    for yaml_file in sorted(rules_dir.glob("*.yaml")):
        all_rules.extend(load_rules_from_yaml(yaml_file))
    for yml_file in sorted(rules_dir.glob("*.yml")):
        all_rules.extend(load_rules_from_yaml(yml_file))

    return all_rules


# ---------------------------------------------------------------------------
# Extension → language mapping for rule filtering
# ---------------------------------------------------------------------------
_EXT_LANG: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".jsx": "javascript",
    ".go": "go",
    ".rb": "ruby",
    ".java": "java",
    ".php": "php",
    ".rs": "rust",
    ".cs": "csharp",
    ".html": "html",
    ".sql": "sql",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".xml": "xml",
    ".tf": "terraform",
    ".hcl": "terraform",
    ".sh": "shell",
}


def scan_file_with_rules(
    file_path: Path,
    repo_root: Path,
    rules: list[SASTRule],
    *,
    max_file_size_kb: int = 500,
) -> list[Finding]:
    """Scan a single file against SAST rules.

    Returns a list of Finding objects for each matched rule.
    """
    findings: list[Finding] = []
    rel_path = str(file_path.relative_to(repo_root)).replace("\\", "/")

    # Determine file language
    ext = file_path.suffix.lower()
    file_lang = _EXT_LANG.get(ext)
    if file_lang is None:
        return findings

    # Skip large files
    try:
        file_size = file_path.stat().st_size
    except OSError:
        return findings
    if file_size > max_file_size_kb * 1024:
        return findings

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return findings

    lines = content.splitlines()

    for rule in rules:
        # Check language applicability
        if rule.languages and file_lang not in rule.languages:
            continue

        # Check file pattern applicability
        if rule.file_patterns:
            matched = any(
                file_path.match(pat) for pat in rule.file_patterns
            )
            if not matched:
                continue

        # Check negative pattern (suppress if matched)
        if rule.negative_pattern and rule.negative_pattern.search(content):
            continue

        # Run the pattern against each line
        for line_num, line in enumerate(lines, start=1):
            if rule.pattern.search(line):
                snippet = line.strip()[:200]
                findings.append(Finding(
                    title=rule.title,
                    description=rule.description,
                    severity=rule.severity,
                    vulnerability_type=VulnerabilityType.SAST,
                    cwe_id=rule.cwe_id,
                    owasp_category=rule.owasp_category,
                    file_path=rel_path,
                    line_start=line_num,
                    line_end=line_num,
                    code_snippet=snippet,
                    rule_id=rule.id,
                    confidence=rule.confidence,
                    fix_suggestion=None,  # Fix generation is in Phase 2
                ))

    return findings


def scan_directory_with_rules(
    repo_path: str | Path,
    rules: list[SASTRule] | None = None,
    excluded_dirs: list[str] | None = None,
    max_file_size_kb: int = 500,
) -> list[Finding]:
    """Recursively scan a directory tree with SAST rules."""
    root = Path(repo_path)
    if rules is None:
        rules = load_all_rules()
    if excluded_dirs is None:
        excluded_dirs = ["node_modules", ".git", "__pycache__", "vendor",
                         "dist", "build", ".next", "venv", ".venv"]
    exclude_set = set(excluded_dirs)
    all_findings: list[Finding] = []

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in exclude_set]
        for fname in filenames:
            fpath = Path(dirpath) / fname
            all_findings.extend(
                scan_file_with_rules(fpath, root, rules, max_file_size_kb=max_file_size_kb)
            )

    return all_findings
