"""GitHub webhook handler for Zerra.

Receives GitHub webhook events (push, pull_request, installation) and
triggers appropriate scan workflows.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class WebhookEvent(BaseModel):
    """Parsed GitHub webhook event."""
    event_type: str                     # "push", "pull_request", "installation"
    action: Optional[str] = None       # e.g. "opened", "synchronize"
    repo_full_name: str                # "owner/repo"
    repo_url: str                      # clone URL
    branch: Optional[str] = None
    commit_sha: Optional[str] = None
    pr_number: Optional[int] = None
    sender: Optional[str] = None       # GitHub username
    changed_files: list[str] = Field(default_factory=list)


def parse_push_event(payload: dict[str, Any]) -> WebhookEvent:
    """Parse a GitHub push webhook payload."""
    ref = payload.get("ref", "")
    branch = ref.replace("refs/heads/", "") if ref.startswith("refs/heads/") else None

    repo = payload.get("repository", {})
    commits = payload.get("commits", [])

    changed: list[str] = []
    for commit in commits:
        changed.extend(commit.get("added", []))
        changed.extend(commit.get("modified", []))

    return WebhookEvent(
        event_type="push",
        repo_full_name=repo.get("full_name", ""),
        repo_url=repo.get("clone_url", ""),
        branch=branch,
        commit_sha=payload.get("after"),
        sender=payload.get("sender", {}).get("login"),
        changed_files=list(set(changed)),
    )


def parse_pull_request_event(payload: dict[str, Any]) -> WebhookEvent:
    """Parse a GitHub pull_request webhook payload."""
    pr = payload.get("pull_request", {})
    head = pr.get("head", {})
    repo = payload.get("repository", {})

    return WebhookEvent(
        event_type="pull_request",
        action=payload.get("action"),
        repo_full_name=repo.get("full_name", ""),
        repo_url=head.get("repo", {}).get("clone_url", repo.get("clone_url", "")),
        branch=head.get("ref"),
        commit_sha=head.get("sha"),
        pr_number=pr.get("number"),
        sender=payload.get("sender", {}).get("login"),
    )


def parse_installation_event(payload: dict[str, Any]) -> list[WebhookEvent]:
    """Parse a GitHub App installation webhook payload.

    Returns a list of events — one per repository installed on.
    """
    events: list[WebhookEvent] = []
    action = payload.get("action")
    repos = payload.get("repositories", payload.get("repositories_added", []))

    for repo in repos:
        events.append(WebhookEvent(
            event_type="installation",
            action=action,
            repo_full_name=repo.get("full_name", ""),
            repo_url=f"https://github.com/{repo.get('full_name', '')}.git",
            sender=payload.get("sender", {}).get("login"),
        ))

    return events


def parse_webhook(event_type: str, payload: dict[str, Any]) -> list[WebhookEvent]:
    """Route a webhook payload to the appropriate parser.

    Returns a list of WebhookEvent objects.
    """
    if event_type == "push":
        return [parse_push_event(payload)]
    elif event_type == "pull_request":
        action = payload.get("action", "")
        if action in ("opened", "synchronize", "reopened"):
            return [parse_pull_request_event(payload)]
        logger.debug("Ignoring PR action: %s", action)
        return []
    elif event_type in ("installation", "installation_repositories"):
        return parse_installation_event(payload)
    else:
        logger.debug("Ignoring webhook event type: %s", event_type)
        return []


def format_scan_comment(
    scan_result: Any,
    pr_url: str | None = None,
) -> str:
    """Format a scan result as a GitHub PR/commit comment in Markdown."""
    from agent.scanner.models import ScanResult

    if not isinstance(scan_result, ScanResult):
        return "⚠️ Scan result format error"

    grade_emoji = {
        "A+": "🏆", "A": "✅", "B": "👍", "C": "⚠️", "D": "🟠", "F": "🔴"
    }
    emoji = grade_emoji.get(scan_result.security_score, "❓")

    lines = [
        f"## {emoji} Zerra Security Scan — Grade: **{scan_result.security_score}**",
        "",
        f"**Status:** {scan_result.status.value} | "
        f"**Files:** {scan_result.files_scanned} | "
        f"**Duration:** {scan_result.duration_seconds:.1f}s" if scan_result.duration_seconds else "",
        "",
        "### Finding Summary",
        "",
        f"| 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low |",
        f"|:-----------:|:-------:|:---------:|:------:|",
        f"| {scan_result.critical_count} | {scan_result.high_count} | "
        f"{scan_result.medium_count} | {scan_result.low_count} |",
        "",
    ]

    if scan_result.findings:
        lines.append("### Top Findings")
        lines.append("")
        for f in sorted(scan_result.findings, key=lambda x: x.severity.value)[:10]:
            severity_badge = {
                "critical": "🔴", "high": "🟠", "medium": "🟡",
                "low": "🟢", "info": "🔵"
            }.get(f.severity.value, "❓")
            location = f"`{f.file_path}:{f.line_start}`" if f.file_path else "N/A"
            lines.append(f"- {severity_badge} **{f.title}** — {location}")

        if len(scan_result.findings) > 10:
            lines.append(f"\n*...and {len(scan_result.findings) - 10} more findings*")
    else:
        lines.append("✅ **No security issues found!**")

    lines.extend([
        "",
        "---",
        "*Powered by [Zerra Security Scanner](https://github.com/sjsreehari/zerra)*",
    ])

    return "\n".join(lines)
