"""Zerra end-to-end analysis orchestrator.

Ties together:
  1. RepoScanner  — scans a local folder or GitHub repo
  2. PREngine     — for each fixable finding, applies a fix + opens a PR
  3. GithubClient — creates Issues for unfixable findings
  4. Database     — stores scan results and findings

No AI API key is required. Pattern-based fixes cover the most common
vulnerability categories (SQL injection, command injection, hardcoded secrets,
weak hashes, XSS, insecure TLS, debug mode, etc.).

Usage::

    orchestrator = AnalysisOrchestrator(github_token="ghp_...")
    report = orchestrator.run(
        target="/path/to/local/project",
        github_repo_url="https://github.com/owner/repo",
    )
    print(report.summary())
"""

from __future__ import annotations

import logging
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from agent.scanner.models import ScanConfig, ScanMode, ScanResult
from agent.scanner.repo_scanner import RepoScanner
from agent.pr_engine import PREngine, EngineReport
from agent.db import get_db

logger = logging.getLogger(__name__)


@dataclass
class OrchestrationConfig:
    """Configuration for a full analysis run."""

    # What to scan — either a local path or a GitHub URL (will be cloned)
    target: str

    # GitHub repo URL for creating issues/PRs (can differ from target if target is local)
    github_repo_url: str = ""

    # GitHub PAT — fetched from vault/env if not provided
    github_token: str = ""

    # Git branch to scan and base PRs on
    branch: str = "main"

    # Scan depth
    mode: ScanMode = ScanMode.STANDARD

    # How many automatic PRs to open per run (safety limit)
    max_prs: int = 10

    # Whether to run project tests before accepting a fix
    run_tests: bool = True

    # Whether to open GitHub Issues for findings without auto-fixes
    open_issues: bool = True

    # Scan options
    enable_sast: bool = True
    enable_secrets: bool = True
    enable_sca: bool = True
    excluded_paths: list[str] = field(default_factory=lambda: [
        ".git", "node_modules", ".venv", "__pycache__", "dist", "build",
        ".next", "vendor", "target", ".cache",
    ])


@dataclass
class OrchestrationReport:
    """Full analysis report returned to the caller."""
    scan_id: str
    target: str
    github_repo_url: str
    security_score: str
    total_findings: int
    critical: int
    high: int
    medium: int
    low: int
    prs_opened: int
    issues_opened: int
    pr_urls: list[str]
    issue_urls: list[str]
    skipped: int
    duration_seconds: float
    started_at: str
    finished_at: str
    error: str = ""

    def summary(self) -> str:
        return (
            f"Grade {self.security_score} | "
            f"{self.total_findings} findings (C:{self.critical} H:{self.high} M:{self.medium} L:{self.low}) | "
            f"{self.prs_opened} PRs | {self.issues_opened} issues"
        )

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items()}


class AnalysisOrchestrator:
    """Runs the complete Zerra scan→fix→PR→issue pipeline."""

    def __init__(
        self,
        github_token: str = "",
        work_dir: Optional[str] = None,
    ) -> None:
        self._token = github_token or os.environ.get("GITHUB_TOKEN", "")
        self._work_dir = work_dir
        self._scanner = RepoScanner(work_dir=work_dir)

    def run(self, config: OrchestrationConfig) -> OrchestrationReport:
        """Execute a full analysis run. Blocking — run in a thread pool for async."""
        started_at = datetime.now(timezone.utc)
        logger.info("AnalysisOrchestrator: starting run for target=%s", config.target)

        # ── 1. Resolve token ──────────────────────────────────────────────────
        token = config.github_token or self._token
        if not token:
            # Try vault
            try:
                from agent.vault import vault
                if config.github_repo_url:
                    token = vault.get_github_token(config.github_repo_url) or ""
                token = token or vault.get("GITHUB_TOKEN") or ""
            except Exception:
                pass

        # ── 2. Run scanner ────────────────────────────────────────────────────
        scan_config = ScanConfig(
            repo_url=config.target,
            branch=config.branch,
            mode=config.mode,
            github_token=token,
            enable_sast=config.enable_sast,
            enable_secrets=config.enable_secrets,
            enable_sca=config.enable_sca,
            excluded_paths=config.excluded_paths,
        )

        logger.info("Scanning: %s", config.target)
        scan_result: ScanResult = self._scanner.scan(scan_config)

        # ── 3. Persist scan ───────────────────────────────────────────────────
        db = get_db()
        try:
            db.save_scan(scan_result)
            for finding in scan_result.findings:
                db.save_finding(finding, scan_result.id)
        except Exception as exc:
            logger.warning("Could not persist scan to DB: %s", exc)

        finished_at = datetime.now(timezone.utc)

        if scan_result.status.value == "failed":
            return OrchestrationReport(
                scan_id=scan_result.id,
                target=config.target,
                github_repo_url=config.github_repo_url,
                security_score="F",
                total_findings=0,
                critical=0, high=0, medium=0, low=0,
                prs_opened=0, issues_opened=0,
                pr_urls=[], issue_urls=[],
                skipped=0,
                duration_seconds=(finished_at - started_at).total_seconds(),
                started_at=started_at.isoformat(),
                finished_at=finished_at.isoformat(),
                error=scan_result.error_message or "Scan failed",
            )

        # ── 4. Run PR engine if token + repo URL provided ─────────────────────
        engine_report: Optional[EngineReport] = None
        if token and config.github_repo_url:
            # Determine local repo path
            local_path = config.target if Path(config.target).is_dir() else None
            if local_path:
                try:
                    engine = PREngine(
                        github_token=token,
                        repo_url=config.github_repo_url,
                        repo_path=local_path,
                        base_branch=config.branch,
                        max_prs=config.max_prs,
                        run_tests=config.run_tests,
                        open_issues_for_unfixable=config.open_issues,
                    )
                    engine_report = engine.process(scan_result)
                except Exception as exc:
                    logger.error("PREngine failed: %s", exc)
        else:
            if not token:
                logger.info("No GitHub token — skipping PR/issue creation")
            if not config.github_repo_url:
                logger.info("No github_repo_url — skipping PR/issue creation")

        finished_at = datetime.now(timezone.utc)

        pr_urls = [pr.pr_url for pr in (engine_report.prs_opened if engine_report else [])]
        issue_urls = [i.issue_url for i in (engine_report.issues_opened if engine_report else [])]
        skipped = len(engine_report.skipped) if engine_report else len(scan_result.findings)

        report = OrchestrationReport(
            scan_id=scan_result.id,
            target=config.target,
            github_repo_url=config.github_repo_url,
            security_score=scan_result.security_score,
            total_findings=len(scan_result.findings),
            critical=scan_result.critical_count,
            high=scan_result.high_count,
            medium=scan_result.medium_count,
            low=scan_result.low_count,
            prs_opened=len(pr_urls),
            issues_opened=len(issue_urls),
            pr_urls=pr_urls,
            issue_urls=issue_urls,
            skipped=skipped,
            duration_seconds=(finished_at - started_at).total_seconds(),
            started_at=started_at.isoformat(),
            finished_at=finished_at.isoformat(),
        )
        logger.info("OrchestrationReport: %s", report.summary())
        return report
