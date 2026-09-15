"""Central notification dispatcher for Zerra.

Fans out security alerts to all configured channels with severity-based
routing (e.g. only CRITICAL goes to WhatsApp, everything to Discord).
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from agent.scanner.models import Finding, ScanResult, Severity

logger = logging.getLogger(__name__)


class NotificationConfig:
    """Configuration for notification channels."""

    def __init__(
        self,
        *,
        discord_webhook_url: str | None = None,
        email_smtp_host: str | None = None,
        email_smtp_port: int = 587,
        email_smtp_user: str | None = None,
        email_smtp_password: str | None = None,
        email_from: str | None = None,
        email_to: list[str] | None = None,
        whatsapp_api_url: str | None = None,
        whatsapp_api_token: str | None = None,
        whatsapp_phone_number: str | None = None,
        teams_webhook_url: str | None = None,
        min_severity_discord: Severity = Severity.LOW,
        min_severity_email: Severity = Severity.MEDIUM,
        min_severity_whatsapp: Severity = Severity.CRITICAL,
        min_severity_teams: Severity = Severity.MEDIUM,
    ) -> None:
        self.discord_webhook_url = discord_webhook_url
        self.email_smtp_host = email_smtp_host
        self.email_smtp_port = email_smtp_port
        self.email_smtp_user = email_smtp_user
        self.email_smtp_password = email_smtp_password
        self.email_from = email_from
        self.email_to = email_to or []
        self.whatsapp_api_url = whatsapp_api_url
        self.whatsapp_api_token = whatsapp_api_token
        self.whatsapp_phone_number = whatsapp_phone_number
        self.teams_webhook_url = teams_webhook_url
        self.min_severity_discord = min_severity_discord
        self.min_severity_email = min_severity_email
        self.min_severity_whatsapp = min_severity_whatsapp
        self.min_severity_teams = min_severity_teams

    @classmethod
    def from_env(cls) -> NotificationConfig:
        """Load config from environment variables."""
        import os
        return cls(
            discord_webhook_url=os.environ.get("ZERRA_DISCORD_WEBHOOK_URL"),
            email_smtp_host=os.environ.get("ZERRA_SMTP_HOST"),
            email_smtp_port=int(os.environ.get("ZERRA_SMTP_PORT", "587")),
            email_smtp_user=os.environ.get("ZERRA_SMTP_USER"),
            email_smtp_password=os.environ.get("ZERRA_SMTP_PASSWORD"),
            email_from=os.environ.get("ZERRA_EMAIL_FROM"),
            email_to=(os.environ.get("ZERRA_EMAIL_TO") or "").split(","),
            whatsapp_api_url=os.environ.get("ZERRA_WHATSAPP_API_URL"),
            whatsapp_api_token=os.environ.get("ZERRA_WHATSAPP_API_TOKEN"),
            whatsapp_phone_number=os.environ.get("ZERRA_WHATSAPP_PHONE"),
            teams_webhook_url=os.environ.get("ZERRA_TEAMS_WEBHOOK_URL"),
        )


_SEVERITY_ORDER = {
    Severity.INFO: 0,
    Severity.LOW: 1,
    Severity.MEDIUM: 2,
    Severity.HIGH: 3,
    Severity.CRITICAL: 4,
}


def _severity_meets_threshold(finding_severity: Severity, min_severity: Severity) -> bool:
    return _SEVERITY_ORDER.get(finding_severity, 0) >= _SEVERITY_ORDER.get(min_severity, 0)


class NotificationDispatcher:
    """Dispatches scan alerts to configured notification channels."""

    def __init__(self, config: NotificationConfig | None = None) -> None:
        self.config = config or NotificationConfig.from_env()
        self._channels: list[tuple[str, Any]] = []
        self._init_channels()

    def _init_channels(self) -> None:
        """Initialize available notification channels."""
        if self.config.discord_webhook_url:
            from agent.notifications.channels.discord import DiscordChannel
            self._channels.append(("discord", DiscordChannel(self.config.discord_webhook_url)))

        if self.config.email_smtp_host and self.config.email_to:
            from agent.notifications.channels.email import EmailChannel
            self._channels.append(("email", EmailChannel(
                smtp_host=self.config.email_smtp_host,
                smtp_port=self.config.email_smtp_port,
                smtp_user=self.config.email_smtp_user,
                smtp_password=self.config.email_smtp_password,
                from_addr=self.config.email_from or "zerra@security.local",
                to_addrs=self.config.email_to,
            )))

        if self.config.whatsapp_api_url and self.config.whatsapp_api_token:
            from agent.notifications.channels.whatsapp import WhatsAppChannel
            self._channels.append(("whatsapp", WhatsAppChannel(
                api_url=self.config.whatsapp_api_url,
                api_token=self.config.whatsapp_api_token,
                phone_number=self.config.whatsapp_phone_number or "",
            )))

        if self.config.teams_webhook_url:
            from agent.notifications.channels.teams import TeamsChannel
            self._channels.append(("teams", TeamsChannel(self.config.teams_webhook_url)))

        logger.info("Notification channels initialized: %s",
                     [name for name, _ in self._channels] or ["none"])

    def _min_severity_for(self, channel_name: str) -> Severity:
        return {
            "discord": self.config.min_severity_discord,
            "email": self.config.min_severity_email,
            "whatsapp": self.config.min_severity_whatsapp,
            "teams": self.config.min_severity_teams,
        }.get(channel_name, Severity.MEDIUM)

    def notify_scan_complete(self, scan_result: ScanResult) -> dict[str, bool]:
        """Send scan completion notifications to all configured channels.

        Returns a dict of {channel_name: success} status.
        """
        results: dict[str, bool] = {}

        for channel_name, channel in self._channels:
            min_sev = self._min_severity_for(channel_name)

            # Check if any findings meet the severity threshold
            relevant_findings = [
                f for f in scan_result.findings
                if _severity_meets_threshold(f.severity, min_sev)
            ]

            if not relevant_findings and scan_result.findings:
                logger.debug("Skipping %s: no findings meet %s threshold",
                             channel_name, min_sev.value)
                results[channel_name] = True
                continue

            try:
                channel.send_scan_alert(scan_result, relevant_findings)
                results[channel_name] = True
                logger.info("Sent notification to %s", channel_name)
            except Exception as exc:
                results[channel_name] = False
                logger.error("Failed to send to %s: %s", channel_name, exc)

        return results

    def notify_finding(self, finding: Finding, repo_name: str = "") -> dict[str, bool]:
        """Send a single high-priority finding alert."""
        results: dict[str, bool] = {}

        for channel_name, channel in self._channels:
            min_sev = self._min_severity_for(channel_name)
            if not _severity_meets_threshold(finding.severity, min_sev):
                continue

            try:
                channel.send_finding_alert(finding, repo_name)
                results[channel_name] = True
            except Exception as exc:
                results[channel_name] = False
                logger.error("Failed to send finding to %s: %s", channel_name, exc)

        return results

    def test_all_channels(self) -> dict[str, bool]:
        """Send a test notification to all configured channels."""
        results: dict[str, bool] = {}
        for channel_name, channel in self._channels:
            try:
                channel.send_test()
                results[channel_name] = True
            except Exception as exc:
                results[channel_name] = False
                logger.error("Test failed for %s: %s", channel_name, exc)
        return results

    @property
    def active_channels(self) -> list[str]:
        return [name for name, _ in self._channels]
