"""Main repository scanner orchestrator for Zerra.

Clones a repo, runs all scan types (SAST, SCA, Secrets), aggregates
findings, and produces a ScanResult.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from agent.scanner.models import (
    ScanConfig,
    ScanMode,
    ScanResult,
    ScanStatus,
    Finding,
)
from agent.scanner.languages import detect_languages
from agent.scanner.sast import load_all_rules, scan_directory_with_rules
from agent.scanner.sca import scan_manifests
from agent.scanner.secrets import scan_directory_for_secrets

logger = logging.getLogger(__name__)


class RepoScanner:
    """Orchestrates a full security scan of a Git repository.

    Usage::

        scanner = RepoScanner()
        result = scanner.scan(ScanConfig(repo_url="https://github.com/user/repo"))
        print(result.security_score, len(result.findings))
    """

    def __init__(self, work_dir: str | Path | None = None) -> None:
        """
        Parameters
        ----------
        work_dir:
            Directory to clone repos into. Uses a system temp dir if not set.
        """
        self._work_dir = Path(work_dir) if work_dir else None

    def _clone_repo(self, config: ScanConfig) -> Path:
        """Clone or copy the repository to a local directory."""
        repo_url = config.repo_url.rstrip("/")

        # If it's a local path, just use it directly
        if os.path.isdir(repo_url):
            return Path(repo_url)

        # Create a temp directory for cloning
        base = self._work_dir or Path(tempfile.gettempdir()) / "zerra_scans"
        base.mkdir(parents=True, exist_ok=True)

        # Extract repo name for the directory
        repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
        clone_dir = base / f"{repo_name}_{int(time.time())}"

        # Build the clone command
        clone_cmd = ["git", "clone", "--depth", "1"]
        if config.branch:
            clone_cmd.extend(["--branch", config.branch])

        # Handle authentication
        if config.github_token and "github.com" in repo_url:
            # Insert token into URL for private repos
            auth_url = repo_url.replace(
                "https://github.com",
                f"https://{config.github_token}@github.com"
            )
            clone_cmd.extend([auth_url, str(clone_dir)])
        else:
            clone_cmd.extend([repo_url, str(clone_dir)])

        try:
            result = subprocess.run(
                clone_cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode != 0:
                raise RuntimeError(f"git clone failed: {result.stderr}")
        except subprocess.TimeoutExpired:
            raise RuntimeError("git clone timed out after 120 seconds")

        return clone_dir

    def _count_files(self, repo_path: Path, excluded_dirs: list[str]) -> int:
        """Count scannable files in the repo."""
        count = 0
        exclude_set = set(excluded_dirs)
        for dirpath, dirnames, filenames in os.walk(repo_path):
            dirnames[:] = [d for d in dirnames if d not in exclude_set]
            count += len(filenames)
        return count

    def scan(self, config: ScanConfig) -> ScanResult:
        """Execute a full security scan based on the given configuration.

        Returns a ScanResult with all findings aggregated.
        """
        result = ScanResult(
            repo_url=config.repo_url,
            branch=config.branch,
            commit_sha=config.commit_sha,
            mode=config.mode,
            status=ScanStatus.RUNNING,
            started_at=datetime.now(timezone.utc),
        )

        clone_dir: Optional[Path] = None
        is_temp_clone = False

        try:
            # Step 1: Clone / locate the repository
            logger.info("Cloning repository: %s (branch: %s)", config.repo_url, config.branch)
            clone_dir = self._clone_repo(config)
            is_temp_clone = not os.path.isdir(config.repo_url)

            # Step 2: Detect languages and frameworks
            logger.info("Detecting languages...")
            lang_profile = detect_languages(clone_dir, config.excluded_paths)
            result.languages_detected = lang_profile.language_list
            result.files_scanned = self._count_files(clone_dir, config.excluded_paths)
            logger.info(
                "Detected: %s (%d files)",
                ", ".join(result.languages_detected) or "unknown",
                result.files_scanned,
            )

            all_findings: list[Finding] = []

            # Step 3: SAST scan
            if config.enable_sast:
                logger.info("Running SAST analysis...")
                rules = load_all_rules()
                sast_findings = scan_directory_with_rules(
                    clone_dir,
                    rules=rules,
                    excluded_dirs=config.excluded_paths,
                    max_file_size_kb=config.max_file_size_kb,
                )
                logger.info("SAST: %d findings", len(sast_findings))
                all_findings.extend(sast_findings)

            # Step 4: Secrets detection
            if config.enable_secrets:
                logger.info("Scanning for secrets...")
                secret_findings = scan_directory_for_secrets(
                    clone_dir,
                    excluded_dirs=config.excluded_paths,
                )
                logger.info("Secrets: %d findings", len(secret_findings))
                all_findings.extend(secret_findings)

            # Step 5: SCA (dependency vulnerabilities)
            if config.enable_sca and config.mode != ScanMode.QUICK:
                logger.info("Running SCA analysis...")
                sca_findings = scan_manifests(
                    clone_dir,
                    excluded_dirs=config.excluded_paths,
                )
                logger.info("SCA: %d findings", len(sca_findings))
                all_findings.extend(sca_findings)

            # Deduplicate findings
            result.findings = self._deduplicate_findings(all_findings)
            result.status = ScanStatus.COMPLETED
            result.completed_at = datetime.now(timezone.utc)
            result.duration_seconds = (
                result.completed_at - result.started_at
            ).total_seconds()

            logger.info(
                "Scan complete: %d findings (C:%d H:%d M:%d L:%d) in %.1fs — Grade: %s",
                len(result.findings),
                result.critical_count,
                result.high_count,
                result.medium_count,
                result.low_count,
                result.duration_seconds,
                result.security_score,
            )

        except Exception as exc:
            result.status = ScanStatus.FAILED
            result.error_message = str(exc)
            result.completed_at = datetime.now(timezone.utc)
            if result.started_at:
                result.duration_seconds = (
                    result.completed_at - result.started_at
                ).total_seconds()
            logger.error("Scan failed: %s", exc)

        finally:
            # Clean up cloned repo
            if clone_dir and is_temp_clone and clone_dir.exists():
                try:
                    shutil.rmtree(clone_dir)
                except OSError:
                    pass

        return result

    @staticmethod
    def _deduplicate_findings(findings: list[Finding]) -> list[Finding]:
        """Remove duplicate findings based on file+line+rule."""
        seen: set[str] = set()
        unique: list[Finding] = []
        for f in findings:
            key = f"{f.file_path}:{f.line_start}:{f.rule_id}"
            if key not in seen:
                seen.add(key)
                unique.append(f)
        return unique

    async def scan_async(self, config: ScanConfig) -> ScanResult:
        """Async wrapper for the scan method (runs in thread pool)."""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.scan, config)
