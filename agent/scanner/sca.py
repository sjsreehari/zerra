"""Software Composition Analysis (SCA) for Zerra scanner.

Parses dependency manifests (package.json, requirements.txt, go.mod, etc.)
and checks known vulnerabilities via the OSV.dev API.
"""

from __future__ import annotations

import json
import re
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Optional

from agent.scanner.models import Finding, Severity, VulnerabilityType


# ---------------------------------------------------------------------------
# Manifest parsers
# ---------------------------------------------------------------------------

def _parse_package_json(manifest_path: Path) -> list[dict[str, str]]:
    """Extract dependencies from package.json."""
    deps: list[dict[str, str]] = []
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return deps

    for section in ("dependencies", "devDependencies"):
        for name, version in data.get(section, {}).items():
            clean = re.sub(r"[~^>=<]", "", version).strip()
            deps.append({"name": name, "version": clean, "ecosystem": "npm"})
    return deps


def _parse_requirements_txt(manifest_path: Path) -> list[dict[str, str]]:
    """Extract dependencies from requirements.txt."""
    deps: list[dict[str, str]] = []
    try:
        lines = manifest_path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return deps

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        # Parse formats: package==1.0.0, package>=1.0.0, package~=1.0.0
        match = re.match(r"^([A-Za-z0-9_\-\.]+)\s*(?:[=~!<>]+\s*)?(\S*)", line)
        if match:
            name, version = match.group(1), match.group(2)
            deps.append({"name": name, "version": version or "latest", "ecosystem": "PyPI"})
    return deps


def _parse_go_mod(manifest_path: Path) -> list[dict[str, str]]:
    """Extract dependencies from go.mod."""
    deps: list[dict[str, str]] = []
    try:
        content = manifest_path.read_text(encoding="utf-8")
    except OSError:
        return deps

    in_require = False
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("require ("):
            in_require = True
            continue
        if stripped == ")" and in_require:
            in_require = False
            continue
        if in_require:
            parts = stripped.split()
            if len(parts) >= 2 and not parts[0].startswith("//"):
                deps.append({
                    "name": parts[0],
                    "version": parts[1].lstrip("v"),
                    "ecosystem": "Go",
                })
        elif stripped.startswith("require "):
            parts = stripped.replace("require ", "").split()
            if len(parts) >= 2:
                deps.append({
                    "name": parts[0],
                    "version": parts[1].lstrip("v"),
                    "ecosystem": "Go",
                })
    return deps


def _parse_gemfile(manifest_path: Path) -> list[dict[str, str]]:
    """Extract dependencies from Gemfile."""
    deps: list[dict[str, str]] = []
    try:
        lines = manifest_path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return deps

    for line in lines:
        match = re.match(r"""^\s*gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?""", line)
        if match:
            deps.append({
                "name": match.group(1),
                "version": (match.group(2) or "latest").lstrip("~> >="),
                "ecosystem": "RubyGems",
            })
    return deps


def _parse_composer_json(manifest_path: Path) -> list[dict[str, str]]:
    """Extract dependencies from composer.json."""
    deps: list[dict[str, str]] = []
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return deps

    for section in ("require", "require-dev"):
        for name, version in data.get(section, {}).items():
            if name == "php" or name.startswith("ext-"):
                continue
            clean = re.sub(r"[~^>=<|]", "", version).strip()
            deps.append({"name": name, "version": clean, "ecosystem": "Packagist"})
    return deps


# Maps manifest filenames → parser functions
MANIFEST_PARSERS: dict[str, Any] = {
    "package.json": _parse_package_json,
    "requirements.txt": _parse_requirements_txt,
    "go.mod": _parse_go_mod,
    "Gemfile": _parse_gemfile,
    "composer.json": _parse_composer_json,
}


# ---------------------------------------------------------------------------
# OSV.dev vulnerability lookup
# ---------------------------------------------------------------------------

_OSV_API_URL = "https://api.osv.dev/v1/query"


def _osv_severity_to_zerra(osv_severity: str) -> Severity:
    """Map OSV severity labels to Zerra severity."""
    mapping = {
        "CRITICAL": Severity.CRITICAL,
        "HIGH": Severity.HIGH,
        "MODERATE": Severity.MEDIUM,
        "MEDIUM": Severity.MEDIUM,
        "LOW": Severity.LOW,
    }
    return mapping.get(osv_severity.upper(), Severity.MEDIUM)


def _query_osv(package_name: str, version: str, ecosystem: str) -> list[dict[str, Any]]:
    """Query the OSV.dev API for known vulnerabilities.

    Returns a list of vulnerability dicts from the OSV response.
    Falls back gracefully if the API is unreachable.
    """
    payload = json.dumps({
        "version": version,
        "package": {"name": package_name, "ecosystem": ecosystem},
    }).encode("utf-8")

    request = urllib.request.Request(
        _OSV_API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as resp:
            data = json.loads(resp.read())
            return data.get("vulns", [])
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, OSError):
        return []


def check_dependency(
    package_name: str,
    version: str,
    ecosystem: str,
    manifest_path: str,
) -> list[Finding]:
    """Check a single dependency for known vulnerabilities."""
    findings: list[Finding] = []
    vulns = _query_osv(package_name, version, ecosystem)

    for vuln in vulns:
        vuln_id = vuln.get("id", "UNKNOWN")
        summary = vuln.get("summary", f"Vulnerability in {package_name}")
        details = vuln.get("details", summary)

        # Extract severity
        severity = Severity.MEDIUM
        cvss_score: Optional[float] = None
        for sev in vuln.get("severity", []):
            if sev.get("type") == "CVSS_V3":
                score_str = sev.get("score", "")
                try:
                    cvss_score = float(score_str.split("/")[0]) if "/" in str(score_str) else float(score_str)
                except (ValueError, TypeError):
                    pass

        # Determine severity from CVSS score
        if cvss_score is not None:
            if cvss_score >= 9.0:
                severity = Severity.CRITICAL
            elif cvss_score >= 7.0:
                severity = Severity.HIGH
            elif cvss_score >= 4.0:
                severity = Severity.MEDIUM
            else:
                severity = Severity.LOW

        # Extract fixed version
        fixed_version: Optional[str] = None
        for affected in vuln.get("affected", []):
            for rng in affected.get("ranges", []):
                for event in rng.get("events", []):
                    if "fixed" in event:
                        fixed_version = event["fixed"]

        # Extract aliases (CVE IDs)
        aliases = vuln.get("aliases", [])
        cve_id = next((a for a in aliases if a.startswith("CVE-")), None)

        # Extract CWE
        cwe_ids = vuln.get("database_specific", {}).get("cwe_ids", [])
        cwe_id = cwe_ids[0] if cwe_ids else None

        references_list = [ref.get("url", "") for ref in vuln.get("references", []) if ref.get("url")]

        findings.append(Finding(
            title=f"{vuln_id}: {summary[:120]}",
            description=details[:1000],
            severity=severity,
            vulnerability_type=VulnerabilityType.SCA,
            cwe_id=cwe_id,
            cvss_score=cvss_score,
            file_path=manifest_path,
            rule_id=f"zerra/sca/{vuln_id.lower()}",
            confidence=0.95,
            package_name=package_name,
            package_version=version,
            fixed_version=fixed_version,
            cve_id=cve_id,
            references=references_list[:5],
        ))

    return findings


def scan_manifests(
    repo_path: str | Path,
    excluded_dirs: list[str] | None = None,
) -> list[Finding]:
    """Scan all dependency manifests in a repo for known vulnerabilities."""
    root = Path(repo_path)
    if excluded_dirs is None:
        excluded_dirs = ["node_modules", ".git", "__pycache__", "vendor",
                         "dist", "build", ".next", "venv", ".venv"]
    exclude_set = set(excluded_dirs)
    all_findings: list[Finding] = []

    import os
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in exclude_set]
        for fname in filenames:
            if fname in MANIFEST_PARSERS:
                fpath = Path(dirpath) / fname
                rel_path = str(fpath.relative_to(root)).replace("\\", "/")
                parser = MANIFEST_PARSERS[fname]
                deps = parser(fpath)

                for dep in deps:
                    if dep["version"] in ("latest", "*", ""):
                        continue
                    dep_findings = check_dependency(
                        dep["name"], dep["version"], dep["ecosystem"], rel_path
                    )
                    all_findings.extend(dep_findings)

    return all_findings
