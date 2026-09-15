"""Discord notification channel for Zerra.

Sends rich embed messages to a Discord channel via incoming webhook.
"""

from __future__ import annotations

import json
import logging
import urllib.request
from typing import Any

from agent.scanner.models import Finding, ScanResult, Severity

logger = logging.getLogger(__name__)

_SEVERITY_COLORS = {
    Severity.CRITICAL: 0xDC2626,  # Red
    Severity.HIGH: 0xF97316,       # Orange
    Severity.MEDIUM: 0xEAB308,     # Yellow
    Severity.LOW: 0x22C55E,        # Green
    Severity.INFO: 0x3B82F6,       # Blue
}

_SEVERITY_EMOJI = {
    Severity.CRITICAL: "🔴",
    Severity.HIGH: "🟠",
    Severity.MEDIUM: "🟡",
    Severity.LOW: "🟢",
    Severity.INFO: "🔵",
}


class DiscordChannel:
    """Sends notifications to Discord via webhook."""

    def __init__(self, webhook_url: str) -> None:
        self.webhook_url = webhook_url

    def _send(self, payload: dict[str, Any]) -> None:
        """Send a payload to the Discord webhook."""
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.webhook_url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10):
                pass
        except Exception as exc:
            logger.error("Discord webhook failed: %s", exc)
            raise

    def send_scan_alert(self, scan_result: ScanResult, findings: list[Finding]) -> None:
        """Send a scan completion alert with an embed."""
        grade = scan_result.security_score
        grade_emoji = {"A+": "🏆", "A": "✅", "B": "👍", "C": "⚠️", "D": "🟠", "F": "🔴"}.get(grade, "❓")

        # Determine embed color from worst severity
        color = 0x22C55E  # green default
        if scan_result.critical_count > 0:
            color = _SEVERITY_COLORS[Severity.CRITICAL]
        elif scan_result.high_count > 0:
            color = _SEVERITY_COLORS[Severity.HIGH]
        elif scan_result.medium_count > 0:
            color = _SEVERITY_COLORS[Severity.MEDIUM]

        fields = [
            {"name": "🔴 Critical", "value": str(scan_result.critical_count), "inline": True},
            {"name": "🟠 High", "value": str(scan_result.high_count), "inline": True},
            {"name": "🟡 Medium", "value": str(scan_result.medium_count), "inline": True},
            {"name": "🟢 Low", "value": str(scan_result.low_count), "inline": True},
            {"name": "📁 Files Scanned", "value": str(scan_result.files_scanned), "inline": True},
            {"name": "⏱️ Duration", "value": f"{scan_result.duration_seconds:.1f}s" if scan_result.duration_seconds else "N/A", "inline": True},
        ]

        # Add top findings
        if findings:
            top_lines = []
            for f in sorted(findings, key=lambda x: x.severity.value)[:5]:
                emoji = _SEVERITY_EMOJI.get(f.severity, "❓")
                location = f"`{f.file_path}:{f.line_start}`" if f.file_path else ""
                top_lines.append(f"{emoji} **{f.title}** {location}")
            fields.append({
                "name": "📋 Top Findings",
                "value": "\n".join(top_lines),
                "inline": False,
            })

        embed: dict[str, Any] = {
            "title": f"{grade_emoji} Zerra Scan Complete — Grade: {grade}",
            "description": f"Repository: `{scan_result.repo_url}`\nBranch: `{scan_result.branch or 'default'}`",
            "color": color,
            "fields": fields,
            "footer": {"text": "Zerra Security Scanner"},
            "timestamp": scan_result.completed_at.isoformat() if scan_result.completed_at else None,
        }

        self._send({
            "username": "Zerra Security",
            "avatar_url": "https://raw.githubusercontent.com/sjsreehari/zerra/main/.github/logo.png",
            "embeds": [embed],
        })

    def send_finding_alert(self, finding: Finding, repo_name: str = "") -> None:
        """Send a single finding alert."""
        emoji = _SEVERITY_EMOJI.get(finding.severity, "❓")
        color = _SEVERITY_COLORS.get(finding.severity, 0x6B7280)

        embed: dict[str, Any] = {
            "title": f"{emoji} {finding.title}",
            "description": finding.description[:500],
            "color": color,
            "fields": [
                {"name": "Severity", "value": finding.severity.value.upper(), "inline": True},
                {"name": "CWE", "value": finding.cwe_id or "N/A", "inline": True},
                {"name": "File", "value": f"`{finding.file_path}:{finding.line_start}`" if finding.file_path else "N/A", "inline": True},
            ],
            "footer": {"text": f"Zerra • {repo_name}" if repo_name else "Zerra Security Scanner"},
        }

        if finding.code_snippet:
            embed["fields"].append({
                "name": "Code",
                "value": f"```\n{finding.code_snippet[:200]}\n```",
                "inline": False,
            })

        self._send({
            "username": "Zerra Security",
            "embeds": [embed],
        })

    def send_test(self) -> None:
        """Send a test notification."""
        self._send({
            "username": "Zerra Security",
            "embeds": [{
                "title": "✅ Zerra Discord Integration Active",
                "description": "Discord notifications are configured correctly.",
                "color": 0x22C55E,
                "footer": {"text": "Zerra Security Scanner — Test Message"},
            }],
        })
