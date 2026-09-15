"""WhatsApp notification channel for Zerra.

Sends formatted text alerts via WhatsApp Business API (or Twilio).
"""

from __future__ import annotations

import json
import logging
import urllib.request
from typing import Any

from agent.scanner.models import Finding, ScanResult, Severity

logger = logging.getLogger(__name__)


class WhatsAppChannel:
    """Sends notifications via WhatsApp Business API."""

    def __init__(
        self,
        api_url: str,
        api_token: str,
        phone_number: str,
    ) -> None:
        self.api_url = api_url.rstrip("/")
        self.api_token = api_token
        self.phone_number = phone_number

    def _send_message(self, text: str) -> None:
        """Send a text message via WhatsApp API."""
        payload = {
            "messaging_product": "whatsapp",
            "to": self.phone_number,
            "type": "text",
            "text": {"body": text},
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.api_url}/messages",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_token}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=15):
                pass
        except Exception as exc:
            logger.error("WhatsApp send failed: %s", exc)
            raise

    def send_scan_alert(self, scan_result: ScanResult, findings: list[Finding]) -> None:
        """Send a scan completion alert via WhatsApp."""
        grade = scan_result.security_score
        repo_name = scan_result.repo_url.split("/")[-1].replace(".git", "")

        severity_emojis = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🟢",
        }

        lines = [
            f"🔒 *Zerra Security Report*",
            f"",
            f"📦 Repo: {repo_name}",
            f"📊 Grade: *{grade}*",
            f"",
            f"🔴 Critical: {scan_result.critical_count}",
            f"🟠 High: {scan_result.high_count}",
            f"🟡 Medium: {scan_result.medium_count}",
            f"🟢 Low: {scan_result.low_count}",
        ]

        if findings:
            lines.append(f"\n📋 *Top Findings:*")
            for f in sorted(findings, key=lambda x: x.severity.value)[:5]:
                emoji = severity_emojis.get(f.severity.value, "❓")
                lines.append(f"{emoji} {f.title}")
                if f.file_path:
                    lines.append(f"   ↳ {f.file_path}:{f.line_start}")

        lines.append(f"\n_Sent by Zerra Security Scanner_")

        self._send_message("\n".join(lines))

    def send_finding_alert(self, finding: Finding, repo_name: str = "") -> None:
        """Send a critical finding alert."""
        emoji = {"critical": "🔴", "high": "🟠"}.get(finding.severity.value, "⚠️")

        message = (
            f"{emoji} *SECURITY ALERT*\n\n"
            f"*{finding.severity.value.upper()}*: {finding.title}\n"
            f"📦 Repo: {repo_name}\n"
            f"📄 File: {finding.file_path or 'N/A'}\n"
            f"🔗 CWE: {finding.cwe_id or 'N/A'}\n\n"
            f"{finding.description[:300]}\n\n"
            f"_Zerra Security Scanner_"
        )

        self._send_message(message)

    def send_test(self) -> None:
        """Send a test message."""
        self._send_message(
            "✅ *Zerra WhatsApp Integration Active*\n\n"
            "WhatsApp notifications are configured correctly.\n\n"
            "_Zerra Security Scanner — Test Message_"
        )
