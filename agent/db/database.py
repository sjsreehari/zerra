"""SQLite persistence layer for Zerra v2.

Provides durable storage for repositories, scan executions, security findings,
and integration events with automatic migrations and seed data.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

logger = logging.getLogger("zerra.db")

DB_PATH = os.environ.get("ZERRA_DB_PATH", str(Path(__file__).parent.parent / "zerra.db"))


class ZerraDatabase:
    """Thread-safe SQLite database manager for Zerra."""

    def __init__(self, db_path: str = DB_PATH) -> None:
        self.db_path = db_path
        self._init_schema()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def _init_schema(self) -> None:
        """Create tables and indices if not already present."""
        with self._get_conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS repositories (
                    id TEXT PRIMARY KEY,
                    url TEXT NOT NULL UNIQUE,
                    branch TEXT NOT NULL DEFAULT 'main',
                    auto_scan INTEGER NOT NULL DEFAULT 1,
                    scan_mode TEXT NOT NULL DEFAULT 'standard',
                    github_token TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    last_scan_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS scans (
                    id TEXT PRIMARY KEY,
                    repo_url TEXT NOT NULL,
                    branch TEXT NOT NULL DEFAULT 'main',
                    commit_sha TEXT,
                    mode TEXT NOT NULL DEFAULT 'standard',
                    status TEXT NOT NULL DEFAULT 'completed',
                    security_score TEXT NOT NULL DEFAULT 'B',
                    findings_count INTEGER NOT NULL DEFAULT 0,
                    critical_count INTEGER NOT NULL DEFAULT 0,
                    high_count INTEGER NOT NULL DEFAULT 0,
                    medium_count INTEGER NOT NULL DEFAULT 0,
                    low_count INTEGER NOT NULL DEFAULT 0,
                    info_count INTEGER NOT NULL DEFAULT 0,
                    duration_seconds REAL NOT NULL DEFAULT 0.0,
                    languages_json TEXT NOT NULL DEFAULT '[]',
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    raw_json TEXT
                );

                CREATE TABLE IF NOT EXISTS findings (
                    id TEXT PRIMARY KEY,
                    scan_id TEXT NOT NULL,
                    repo_url TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    vulnerability_type TEXT NOT NULL,
                    cwe_id TEXT,
                    cvss_score REAL,
                    owasp_category TEXT,
                    file_path TEXT,
                    line_start INTEGER,
                    line_end INTEGER,
                    code_snippet TEXT,
                    rule_id TEXT,
                    status TEXT NOT NULL DEFAULT 'open',
                    has_fix INTEGER NOT NULL DEFAULT 0,
                    fix_data_json TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS webhook_logs (
                    id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    repo_name TEXT NOT NULL,
                    commit_sha TEXT,
                    status TEXT NOT NULL,
                    scan_id TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_scans_repo_url ON scans(repo_url);
                CREATE INDEX IF NOT EXISTS idx_scans_started_at ON scans(started_at DESC);
                CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
                CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
                CREATE INDEX IF NOT EXISTS idx_findings_repo_url ON findings(repo_url);
            """)

    # ──────────────────────────────────────────────────────────
    # Repositories
    # ──────────────────────────────────────────────────────────

    def save_repo(self, repo: dict[str, Any]) -> dict[str, Any]:
        """Insert or update a repository record."""
        now = datetime.now(timezone.utc).isoformat()
        repo_id = repo.get("id") or uuid4().hex[:12]
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO repositories (id, url, branch, auto_scan, scan_mode, github_token, status, last_scan_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(url) DO UPDATE SET
                    branch=excluded.branch,
                    auto_scan=excluded.auto_scan,
                    scan_mode=excluded.scan_mode,
                    github_token=COALESCE(excluded.github_token, repositories.github_token),
                    status=excluded.status,
                    last_scan_id=COALESCE(excluded.last_scan_id, repositories.last_scan_id),
                    updated_at=excluded.updated_at
            """, (
                repo_id,
                repo["url"],
                repo.get("branch", "main"),
                1 if repo.get("auto_scan", True) else 0,
                repo.get("scan_mode", "standard"),
                repo.get("github_token"),
                repo.get("status", "active"),
                repo.get("last_scan_id"),
                repo.get("created_at", now),
                now,
            ))
            row = conn.execute("SELECT * FROM repositories WHERE url = ?", (repo["url"],)).fetchone()
            return dict(row)

    def get_repo(self, repo_id: str) -> Optional[dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,)).fetchone()
            return dict(row) if row else None

    def get_repo_by_url(self, url: str) -> Optional[dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM repositories WHERE url = ?", (url,)).fetchone()
            return dict(row) if row else None

    def list_repos(self) -> list[dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute("SELECT * FROM repositories ORDER BY created_at DESC").fetchall()
            return [dict(r) for r in rows]

    def delete_repo(self, repo_id: str) -> bool:
        with self._get_conn() as conn:
            cursor = conn.execute("DELETE FROM repositories WHERE id = ?", (repo_id,))
            return cursor.rowcount > 0

    def update_repo_last_scan(self, repo_id: str, scan_id: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE repositories SET last_scan_id = ?, updated_at = ? WHERE id = ?",
                (scan_id, now, repo_id),
            )

    # ──────────────────────────────────────────────────────────
    # Scans
    # ──────────────────────────────────────────────────────────

    def save_scan(self, scan_result: Any) -> None:
        """Save a ScanResult or scan dict and its findings into SQLite."""
        if hasattr(scan_result, "model_dump"):
            data = scan_result.model_dump(mode="json")
        elif isinstance(scan_result, dict):
            data = scan_result
        else:
            raise ValueError(f"Unsupported scan_result type: {type(scan_result)}")

        scan_id = data.get("id") or uuid4().hex[:12]
        started = data.get("started_at")
        if isinstance(started, datetime):
            started = started.isoformat()
        completed = data.get("completed_at")
        if isinstance(completed, datetime):
            completed = completed.isoformat()

        findings = data.get("findings", [])
        languages = json.dumps(data.get("languages_detected", []))

        with self._get_conn() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO scans (
                    id, repo_url, branch, commit_sha, mode, status,
                    security_score, findings_count, critical_count, high_count,
                    medium_count, low_count, info_count, duration_seconds,
                    languages_json, started_at, completed_at, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scan_id,
                data.get("repo_url", ""),
                data.get("branch", "main"),
                data.get("commit_sha"),
                str(data.get("mode", "standard")),
                str(data.get("status", "completed")),
                data.get("security_score", "B"),
                len(findings),
                data.get("critical_count", 0),
                data.get("high_count", 0),
                data.get("medium_count", 0),
                data.get("low_count", 0),
                data.get("info_count", 0),
                float(data.get("duration_seconds", 0.0)),
                languages,
                started or datetime.now(timezone.utc).isoformat(),
                completed,
                json.dumps(data),
            ))

            # Store findings
            for f in findings:
                f_id = f.get("id") or uuid4().hex[:12]
                conn.execute("""
                    INSERT OR REPLACE INTO findings (
                        id, scan_id, repo_url, title, description, severity,
                        vulnerability_type, cwe_id, cvss_score, owasp_category,
                        file_path, line_start, line_end, code_snippet, rule_id,
                        status, has_fix, fix_data_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f_id,
                    scan_id,
                    data.get("repo_url", ""),
                    f.get("title", "Finding"),
                    f.get("description", ""),
                    str(f.get("severity", "medium")),
                    str(f.get("vulnerability_type", "sast")),
                    f.get("cwe_id"),
                    f.get("cvss_score"),
                    f.get("owasp_category"),
                    f.get("file_path"),
                    f.get("line_start"),
                    f.get("line_end"),
                    f.get("code_snippet"),
                    f.get("rule_id"),
                    str(f.get("status", "open")),
                    1 if f.get("fix_suggestion") else 0,
                    json.dumps(f.get("fix_suggestion")) if f.get("fix_suggestion") else None,
                    datetime.now(timezone.utc).isoformat(),
                ))

            # Update repo's last_scan_id if repo exists
            conn.execute(
                "UPDATE repositories SET last_scan_id = ? WHERE url = ?",
                (scan_id, data.get("repo_url", "")),
            )

    def get_scan(self, scan_id: str) -> Optional[dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
            if not row:
                return None
            res = dict(row)
            if res.get("raw_json"):
                try:
                    return json.loads(res["raw_json"])
                except Exception:
                    pass
            # Reconstruct from fields
            findings_rows = conn.execute("SELECT * FROM findings WHERE scan_id = ?", (scan_id,)).fetchall()
            res["findings"] = [dict(f) for f in findings_rows]
            res["languages_detected"] = json.loads(res.get("languages_json", "[]"))
            return res

    def list_scans(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM scans ORDER BY started_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["languages"] = json.loads(d.get("languages_json", "[]"))
                d.pop("raw_json", None)
                result.append(d)
            return result

    # ──────────────────────────────────────────────────────────
    # Findings
    # ──────────────────────────────────────────────────────────

    def list_findings(
        self,
        severity: Optional[str] = None,
        repo_url: Optional[str] = None,
        scan_id: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        query = "SELECT * FROM findings WHERE 1=1"
        params: list[Any] = []
        if severity:
            query += " AND LOWER(severity) = LOWER(?)"
            params.append(severity)
        if repo_url:
            query += " AND repo_url = ?"
            params.append(repo_url)
        if scan_id:
            query += " AND scan_id = ?"
            params.append(scan_id)

        query += " ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, created_at DESC LIMIT ?"
        params.append(limit)

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            results = []
            for r in rows:
                item = dict(r)
                if item.get("fix_data_json"):
                    try:
                        item["fix_suggestion"] = json.loads(item["fix_data_json"])
                    except Exception:
                        item["fix_suggestion"] = None
                results.append(item)
            return results

    # ──────────────────────────────────────────────────────────
    # Dashboard Aggregations
    # ──────────────────────────────────────────────────────────

    def get_stats(self) -> dict[str, Any]:
        with self._get_conn() as conn:
            repo_count = conn.execute("SELECT COUNT(*) FROM repositories").fetchone()[0]
            scan_count = conn.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
            finding_count = conn.execute("SELECT COUNT(*) FROM findings").fetchone()[0]
            crit_count = conn.execute("SELECT COUNT(*) FROM findings WHERE LOWER(severity) = 'critical'").fetchone()[0]
            high_count = conn.execute("SELECT COUNT(*) FROM findings WHERE LOWER(severity) = 'high'").fetchone()[0]
            med_count = conn.execute("SELECT COUNT(*) FROM findings WHERE LOWER(severity) = 'medium'").fetchone()[0]
            low_count = conn.execute("SELECT COUNT(*) FROM findings WHERE LOWER(severity) = 'low'").fetchone()[0]

            # Overall grade calculation
            weight = crit_count * 10 + high_count * 5 + med_count * 2
            if scan_count == 0:
                overall_grade = "A+"
            elif weight == 0:
                overall_grade = "A"
            elif weight <= 5:
                overall_grade = "B"
            elif weight <= 15:
                overall_grade = "C"
            elif weight <= 30:
                overall_grade = "D"
            else:
                overall_grade = "F"

            recent_scans = conn.execute(
                "SELECT id, repo_url, security_score, findings_count, completed_at FROM scans ORDER BY started_at DESC LIMIT 5"
            ).fetchall()

            return {
                "total_repos": repo_count,
                "total_scans": scan_count,
                "total_findings": finding_count,
                "total_critical": crit_count,
                "total_high": high_count,
                "total_medium": med_count,
                "total_low": low_count,
                "overall_grade": overall_grade,
                "recent_scans": [
                    {
                        "id": r["id"],
                        "repo_url": r["repo_url"],
                        "grade": r["security_score"],
                        "findings": r["findings_count"],
                        "completed_at": r["completed_at"],
                    }
                    for r in recent_scans
                ],
            }

    # ──────────────────────────────────────────────────────────
    # Demo Seed Data
    # ──────────────────────────────────────────────────────────

    def seed_demo_data_if_empty(self) -> None:
        """Seed demo repos, scans, and findings if empty for instant out-of-the-box delight."""
        with self._get_conn() as conn:
            count = conn.execute("SELECT COUNT(*) FROM repositories").fetchone()[0]
            if count > 0:
                return

        demo_repos = [
            {
                "id": "repo-zerra-core",
                "url": "https://github.com/sjsreehari/zerra",
                "branch": "main",
                "auto_scan": 1,
                "scan_mode": "deep",
                "status": "active",
                "created_at": "2026-09-10T10:00:00Z",
            },
            {
                "id": "repo-payment-svc",
                "url": "https://github.com/zerra-sec/payment-gateway-service",
                "branch": "production",
                "auto_scan": 1,
                "scan_mode": "standard",
                "status": "active",
                "created_at": "2026-09-11T14:30:00Z",
            },
            {
                "id": "repo-auth-api",
                "url": "https://github.com/zerra-sec/auth-broker",
                "branch": "main",
                "auto_scan": 1,
                "scan_mode": "standard",
                "status": "active",
                "created_at": "2026-09-12T09:15:00Z",
            },
        ]

        for r in demo_repos:
            self.save_repo(r)

        # Demo scan 1 for zerra
        scan1 = {
            "id": "scan-demo-01",
            "repo_url": "https://github.com/sjsreehari/zerra",
            "branch": "main",
            "commit_sha": "a8f9c12",
            "mode": "deep",
            "status": "completed",
            "security_score": "A",
            "critical_count": 0,
            "high_count": 0,
            "medium_count": 2,
            "low_count": 1,
            "info_count": 1,
            "duration_seconds": 14.2,
            "languages_detected": ["Python", "TypeScript", "Shell"],
            "started_at": "2026-09-15T08:00:00Z",
            "completed_at": "2026-09-15T08:00:14Z",
            "findings": [
                {
                    "id": "find-demo-01",
                    "title": "Permissive CORS Wildcard Origin with Credentials",
                    "description": "CORS policy allows wildcard origin '*' while credentials mode is enabled, risking cross-origin token harvesting.",
                    "severity": "medium",
                    "vulnerability_type": "sast",
                    "cwe_id": "CWE-942",
                    "cvss_score": 5.4,
                    "owasp_category": "A05:2021 Security Misconfiguration",
                    "file_path": "agent/api.py",
                    "line_start": 35,
                    "line_end": 42,
                    "code_snippet": "allow_origins=['*'], allow_credentials=True",
                    "rule_id": "cors-permissive-origin",
                    "status": "open",
                    "fix_suggestion": {
                        "file_path": "agent/api.py",
                        "original_code": "allow_origins=['*']",
                        "fixed_code": "allow_origins=os.environ.get('ALLOWED_ORIGINS', 'https://app.zerra.io').split(',')",
                        "explanation": "Explicitly bind CORS origins to trusted domains via environment variables.",
                    },
                },
                {
                    "id": "find-demo-02",
                    "title": "Outdated Dependency: urllib3 Vulnerable to Proxy Leak",
                    "description": "CVE-2023-45803 in urllib3 < 2.0.7 allows potential HTTP request body leakage during redirects.",
                    "severity": "medium",
                    "vulnerability_type": "sca",
                    "cwe_id": "CWE-200",
                    "cvss_score": 5.3,
                    "owasp_category": "A06:2021 Vulnerable Components",
                    "file_path": "requirements.txt",
                    "line_start": 18,
                    "line_end": 18,
                    "code_snippet": "urllib3==1.26.15",
                    "rule_id": "sca-cve-2023-45803",
                    "status": "open",
                    "fix_suggestion": {
                        "file_path": "requirements.txt",
                        "original_code": "urllib3==1.26.15",
                        "fixed_code": "urllib3>=2.0.7",
                        "explanation": "Upgrade urllib3 to version 2.0.7 or higher to resolve CVE-2023-45803.",
                    },
                },
                {
                    "id": "find-demo-03",
                    "title": "Missing Security Headers in Sub-Route",
                    "description": "X-Content-Type-Options: nosniff header missing from raw markdown download route.",
                    "severity": "low",
                    "vulnerability_type": "sast",
                    "cwe_id": "CWE-693",
                    "cvss_score": 3.1,
                    "owasp_category": "A05:2021 Security Misconfiguration",
                    "file_path": "agent/api.py",
                    "line_start": 585,
                    "line_end": 595,
                    "code_snippet": "return PlainTextResponse(generate_report(), media_type='text/markdown')",
                    "rule_id": "missing-nosniff-header",
                    "status": "open",
                },
            ],
        }
        self.save_scan(scan1)

        # Demo scan 2 for payment gateway
        scan2 = {
            "id": "scan-demo-02",
            "repo_url": "https://github.com/zerra-sec/payment-gateway-service",
            "branch": "production",
            "commit_sha": "c4d7e10",
            "mode": "standard",
            "status": "completed",
            "security_score": "C",
            "critical_count": 1,
            "high_count": 2,
            "medium_count": 1,
            "low_count": 0,
            "info_count": 0,
            "duration_seconds": 8.7,
            "languages_detected": ["Go", "Docker"],
            "started_at": "2026-09-14T22:10:00Z",
            "completed_at": "2026-09-14T22:10:09Z",
            "findings": [
                {
                    "id": "find-demo-04",
                    "title": "Plaintext Stripe Secret Key in Source",
                    "description": "Live Stripe API secret key detected in payment configuration handler.",
                    "severity": "critical",
                    "vulnerability_type": "secret",
                    "cwe_id": "CWE-798",
                    "cvss_score": 9.8,
                    "owasp_category": "A07:2021 Identification and Authentication Failures",
                    "file_path": "internal/config/stripe.go",
                    "line_start": 14,
                    "line_end": 14,
                    "code_snippet": 'const StripeKey = "sk_test_51NABC1234567890abcdefghijklmnopqrstuvwxyz"',
                    "rule_id": "secret-stripe-api-key",
                    "status": "open",
                    "fix_suggestion": {
                        "file_path": "internal/config/stripe.go",
                        "original_code": 'const StripeKey = "sk_test_51NABC1234567890abcdefghijklmnopqrstuvwxyz"',
                        "fixed_code": 'var StripeKey = os.Getenv("STRIPE_SECRET_KEY")',
                        "explanation": "Store Stripe credentials in environment variables and rotate the compromised live key immediately.",
                    },
                },
                {
                    "id": "find-demo-05",
                    "title": "SQL Injection via Unsanitized Statement Concatenation",
                    "description": "User supplied transaction_id is directly concatenated into SQL query without parameterization.",
                    "severity": "high",
                    "vulnerability_type": "sast",
                    "cwe_id": "CWE-89",
                    "cvss_score": 8.5,
                    "owasp_category": "A03:2021 Injection",
                    "file_path": "internal/db/transactions.go",
                    "line_start": 68,
                    "line_end": 71,
                    "code_snippet": 'query := "SELECT * FROM transactions WHERE tx_id = \'" + txID + "\' AND status = \'settled\'"',
                    "rule_id": "sql-string-concatenation",
                    "status": "open",
                    "fix_suggestion": {
                        "file_path": "internal/db/transactions.go",
                        "original_code": 'query := "SELECT * FROM transactions WHERE tx_id = \'" + txID + "\' AND status = \'settled\'"',
                        "fixed_code": 'row := db.QueryRow("SELECT * FROM transactions WHERE tx_id = $1 AND status = \'settled\'", txID)',
                        "explanation": "Use parameterized queries ($1 placeholder) to prevent SQL injection.",
                    },
                },
            ],
        }
        self.save_scan(scan2)


# Global singleton instance
_db_instance: Optional[ZerraDatabase] = None


def get_db(db_path: str = DB_PATH) -> ZerraDatabase:
    """Return singleton instance of ZerraDatabase."""
    global _db_instance
    if _db_instance is None:
        _db_instance = ZerraDatabase(db_path)
        _db_instance.seed_demo_data_if_empty()
    return _db_instance
