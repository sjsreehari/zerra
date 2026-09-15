"""Email notification channel for Zerra.

Sends HTML-formatted security digest emails via SMTP.
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from agent.scanner.models import Finding, ScanResult, Severity

logger = logging.getLogger(__name__)


class EmailChannel:
    """Sends security notifications via SMTP email."""

    def __init__(
        self,
        smtp_host: str,
        smtp_port: int = 587,
        smtp_user: str | None = None,
        smtp_password: str | None = None,
        from_addr: str = "zerra@security.local",
        to_addrs: list[str] | None = None,
        use_tls: bool = True,
    ) -> None:
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_addr = from_addr
        self.to_addrs = to_addrs or []
        self.use_tls = use_tls

    def _send_email(self, subject: str, html_body: str) -> None:
        """Send an HTML email."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = ", ".join(self.to_addrs)

        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15) as server:
                if self.use_tls:
                    server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_addr, self.to_addrs, msg.as_string())
        except Exception as exc:
            logger.error("Email send failed: %s", exc)
            raise

    def send_scan_alert(self, scan_result: ScanResult, findings: list[Finding]) -> None:
        """Send a scan completion email."""
        grade = scan_result.security_score
        severity_color = "#22c55e" if grade in ("A+", "A") else "#eab308" if grade in ("B", "C") else "#dc2626"

        findings_html = ""
        for f in sorted(findings, key=lambda x: x.severity.value)[:20]:
            sev_color = {
                "critical": "#dc2626", "high": "#f97316",
                "medium": "#eab308", "low": "#22c55e", "info": "#3b82f6"
            }.get(f.severity.value, "#6b7280")
            findings_html += f"""
            <tr>
                <td style="padding:8px;border-bottom:1px solid #1e293b;">
                    <span style="background:{sev_color};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">{f.severity.value.upper()}</span>
                </td>
                <td style="padding:8px;border-bottom:1px solid #1e293b;color:#e2e8f0;">{f.title}</td>
                <td style="padding:8px;border-bottom:1px solid #1e293b;color:#94a3b8;font-family:monospace;font-size:12px;">{f.file_path or 'N/A'}</td>
                <td style="padding:8px;border-bottom:1px solid #1e293b;color:#94a3b8;">{f.cwe_id or 'N/A'}</td>
            </tr>
            """

        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="max-width:640px;margin:0 auto;padding:24px;">
                <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:12px;overflow:hidden;">
                    <!-- Header -->
                    <div style="padding:24px;background:linear-gradient(135deg,#1e40af,#7c3aed);text-align:center;">
                        <h1 style="margin:0;color:white;font-size:24px;">🔒 Zerra Security Report</h1>
                        <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">{scan_result.repo_url}</p>
                    </div>

                    <!-- Score Card -->
                    <div style="padding:24px;text-align:center;">
                        <div style="display:inline-block;background:{severity_color}20;border:2px solid {severity_color};border-radius:16px;padding:16px 32px;">
                            <div style="font-size:48px;font-weight:bold;color:{severity_color};">{grade}</div>
                            <div style="color:#94a3b8;font-size:12px;margin-top:4px;">Security Grade</div>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div style="padding:0 24px 24px;display:flex;justify-content:space-around;">
                        <div style="text-align:center;flex:1;">
                            <div style="color:#dc2626;font-size:24px;font-weight:bold;">{scan_result.critical_count}</div>
                            <div style="color:#94a3b8;font-size:11px;">Critical</div>
                        </div>
                        <div style="text-align:center;flex:1;">
                            <div style="color:#f97316;font-size:24px;font-weight:bold;">{scan_result.high_count}</div>
                            <div style="color:#94a3b8;font-size:11px;">High</div>
                        </div>
                        <div style="text-align:center;flex:1;">
                            <div style="color:#eab308;font-size:24px;font-weight:bold;">{scan_result.medium_count}</div>
                            <div style="color:#94a3b8;font-size:11px;">Medium</div>
                        </div>
                        <div style="text-align:center;flex:1;">
                            <div style="color:#22c55e;font-size:24px;font-weight:bold;">{scan_result.low_count}</div>
                            <div style="color:#94a3b8;font-size:11px;">Low</div>
                        </div>
                    </div>

                    <!-- Findings Table -->
                    {"" if not findings_html else f'''
                    <div style="padding:0 24px 24px;">
                        <h3 style="color:#e2e8f0;margin:0 0 12px;">Findings</h3>
                        <table style="width:100%;border-collapse:collapse;">
                            <tr style="border-bottom:2px solid #334155;">
                                <th style="padding:8px;text-align:left;color:#94a3b8;font-size:11px;">Severity</th>
                                <th style="padding:8px;text-align:left;color:#94a3b8;font-size:11px;">Finding</th>
                                <th style="padding:8px;text-align:left;color:#94a3b8;font-size:11px;">File</th>
                                <th style="padding:8px;text-align:left;color:#94a3b8;font-size:11px;">CWE</th>
                            </tr>
                            {findings_html}
                        </table>
                    </div>
                    '''}

                    <!-- Footer -->
                    <div style="padding:16px 24px;background:#0f172a;border-top:1px solid #1e293b;text-align:center;">
                        <p style="margin:0;color:#64748b;font-size:12px;">
                            Powered by <strong style="color:#818cf8;">Zerra Security Scanner</strong>
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        subject = f"[Zerra] Security Scan: {grade} — {scan_result.repo_url.split('/')[-1]}"
        self._send_email(subject, html)

    def send_finding_alert(self, finding: Finding, repo_name: str = "") -> None:
        """Send a single critical finding alert email."""
        html = f"""
        <html>
        <body style="margin:0;padding:20px;background:#0f172a;font-family:sans-serif;">
            <div style="max-width:540px;margin:0 auto;background:#1e293b;border-radius:8px;padding:24px;border:1px solid #334155;">
                <h2 style="color:#f87171;margin:0 0 8px;">⚠️ {finding.severity.value.upper()}: {finding.title}</h2>
                <p style="color:#94a3b8;margin:0 0 16px;">Repository: {repo_name}</p>
                <p style="color:#e2e8f0;">{finding.description[:500]}</p>
                <div style="margin-top:16px;padding:12px;background:#0f172a;border-radius:4px;">
                    <code style="color:#67e8f9;font-size:13px;">{finding.file_path}:{finding.line_start}</code>
                </div>
            </div>
        </body>
        </html>
        """
        subject = f"[Zerra] 🔴 {finding.severity.value.upper()}: {finding.title}"
        self._send_email(subject, html)

    def send_test(self) -> None:
        """Send a test email."""
        html = """
        <html>
        <body style="margin:0;padding:20px;background:#0f172a;font-family:sans-serif;">
            <div style="max-width:540px;margin:0 auto;background:#1e293b;border-radius:8px;padding:24px;text-align:center;border:1px solid #334155;">
                <h2 style="color:#22c55e;">✅ Zerra Email Integration Active</h2>
                <p style="color:#94a3b8;">Email notifications are configured correctly.</p>
            </div>
        </body>
        </html>
        """
        self._send_email("[Zerra] Test Notification", html)
