"""Microsoft Teams notification channel for Zerra.

Sends Adaptive Card messages to a Teams channel via incoming webhook.
"""

from __future__ import annotations

import json
import logging
import urllib.request
from typing import Any

from agent.scanner.models import Finding, ScanResult, Severity

logger = logging.getLogger(__name__)

_SEVERITY_COLORS = {
    Severity.CRITICAL: "attention",  # Red
    Severity.HIGH: "warning",        # Orange/Yellow
    Severity.MEDIUM: "warning",
    Severity.LOW: "good",            # Green
    Severity.INFO: "accent",         # Blue
}


class TeamsChannel:
    """Sends notifications to Microsoft Teams via incoming webhook."""

    def __init__(self, webhook_url: str) -> None:
        self.webhook_url = webhook_url

    def _send(self, card: dict[str, Any]) -> None:
        """Send an Adaptive Card to Teams."""
        payload = {
            "type": "message",
            "attachments": [{
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": card,
            }],
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.webhook_url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=15):
                pass
        except Exception as exc:
            logger.error("Teams webhook failed: %s", exc)
            raise

    def send_scan_alert(self, scan_result: ScanResult, findings: list[Finding]) -> None:
        """Send a scan completion alert as an Adaptive Card."""
        grade = scan_result.security_score
        repo_name = scan_result.repo_url.split("/")[-1].replace(".git", "")

        # Build findings table
        finding_rows: list[dict[str, Any]] = []
        for f in sorted(findings, key=lambda x: x.severity.value)[:10]:
            color = _SEVERITY_COLORS.get(f.severity, "default")
            finding_rows.append({
                "type": "TableRow",
                "cells": [
                    {"type": "TableCell", "items": [{"type": "TextBlock", "text": f.severity.value.upper(), "color": color, "weight": "bolder", "size": "small"}]},
                    {"type": "TableCell", "items": [{"type": "TextBlock", "text": f.title[:60], "size": "small", "wrap": True}]},
                    {"type": "TableCell", "items": [{"type": "TextBlock", "text": f.file_path or "N/A", "size": "small", "fontType": "monospace"}]},
                ],
            })

        card: dict[str, Any] = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.5",
            "body": [
                {
                    "type": "TextBlock",
                    "text": f"🔒 Zerra Security Scan — Grade: {grade}",
                    "weight": "bolder",
                    "size": "large",
                    "wrap": True,
                },
                {
                    "type": "TextBlock",
                    "text": f"Repository: {repo_name} | Branch: {scan_result.branch or 'default'}",
                    "isSubtle": True,
                    "spacing": "none",
                },
                {
                    "type": "ColumnSet",
                    "columns": [
                        {"type": "Column", "width": "stretch", "items": [
                            {"type": "TextBlock", "text": str(scan_result.critical_count), "size": "extraLarge", "weight": "bolder", "color": "attention", "horizontalAlignment": "center"},
                            {"type": "TextBlock", "text": "Critical", "size": "small", "horizontalAlignment": "center", "isSubtle": True},
                        ]},
                        {"type": "Column", "width": "stretch", "items": [
                            {"type": "TextBlock", "text": str(scan_result.high_count), "size": "extraLarge", "weight": "bolder", "color": "warning", "horizontalAlignment": "center"},
                            {"type": "TextBlock", "text": "High", "size": "small", "horizontalAlignment": "center", "isSubtle": True},
                        ]},
                        {"type": "Column", "width": "stretch", "items": [
                            {"type": "TextBlock", "text": str(scan_result.medium_count), "size": "extraLarge", "weight": "bolder", "horizontalAlignment": "center"},
                            {"type": "TextBlock", "text": "Medium", "size": "small", "horizontalAlignment": "center", "isSubtle": True},
                        ]},
                        {"type": "Column", "width": "stretch", "items": [
                            {"type": "TextBlock", "text": str(scan_result.low_count), "size": "extraLarge", "weight": "bolder", "color": "good", "horizontalAlignment": "center"},
                            {"type": "TextBlock", "text": "Low", "size": "small", "horizontalAlignment": "center", "isSubtle": True},
                        ]},
                    ],
                },
            ],
        }

        if finding_rows:
            card["body"].append({
                "type": "Table",
                "gridStyle": "accent",
                "firstRowAsHeader": True,
                "columns": [
                    {"width": 1}, {"width": 3}, {"width": 2},
                ],
                "rows": [
                    {"type": "TableRow", "style": "accent", "cells": [
                        {"type": "TableCell", "items": [{"type": "TextBlock", "text": "Severity", "weight": "bolder", "size": "small"}]},
                        {"type": "TableCell", "items": [{"type": "TextBlock", "text": "Finding", "weight": "bolder", "size": "small"}]},
                        {"type": "TableCell", "items": [{"type": "TextBlock", "text": "File", "weight": "bolder", "size": "small"}]},
                    ]},
                    *finding_rows,
                ],
            })

        self._send(card)

    def send_finding_alert(self, finding: Finding, repo_name: str = "") -> None:
        """Send a single finding alert."""
        color = _SEVERITY_COLORS.get(finding.severity, "default")

        card: dict[str, Any] = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.5",
            "body": [
                {"type": "TextBlock", "text": f"⚠️ Zerra Security Alert", "weight": "bolder", "size": "large"},
                {"type": "TextBlock", "text": f"{finding.severity.value.upper()}: {finding.title}", "weight": "bolder", "color": color, "wrap": True},
                {"type": "TextBlock", "text": finding.description[:400], "wrap": True, "size": "small"},
                {"type": "FactSet", "facts": [
                    {"title": "Repository", "value": repo_name or "N/A"},
                    {"title": "File", "value": f"{finding.file_path}:{finding.line_start}" if finding.file_path else "N/A"},
                    {"title": "CWE", "value": finding.cwe_id or "N/A"},
                ]},
            ],
        }
        self._send(card)

    def send_test(self) -> None:
        """Send a test notification."""
        card: dict[str, Any] = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.5",
            "body": [
                {"type": "TextBlock", "text": "✅ Zerra Teams Integration Active", "weight": "bolder", "size": "large", "color": "good"},
                {"type": "TextBlock", "text": "Microsoft Teams notifications are configured correctly.", "wrap": True},
            ],
        }
        self._send(card)
