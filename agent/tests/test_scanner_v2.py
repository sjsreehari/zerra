"""Comprehensive test suite for Zerra v2 Scanner, Integrations, Notifications, and Database."""

import os
import tempfile
from pathlib import Path
import pytest

from agent.scanner.models import Finding, Severity, VulnerabilityType, ScanConfig, ScanMode
from agent.scanner.languages import detect_languages
from agent.scanner.secrets import scan_file_for_secrets, scan_directory_for_secrets
from agent.scanner.sast import scan_directory_with_rules, load_all_rules
from agent.scanner.repo_scanner import RepoScanner
from agent.integrations.fix_generator import generate_fix
from agent.notifications.dispatcher import NotificationDispatcher
from agent.db.database import ZerraDatabase


def test_language_detection(tmp_path):
    (tmp_path / "main.py").write_text("print('hello')")
    (tmp_path / "service.go").write_text("package main")
    (tmp_path / "app.tsx").write_text("export default function App() {}")
    (tmp_path / "Cargo.toml").write_text("[package]\nname = 'test'")

    profile = detect_languages(tmp_path)
    langs = profile.language_list
    assert "python" in langs
    assert "go" in langs
    assert "typescript" in langs


def test_secret_detection(tmp_path):
    cfg_file = tmp_path / "config.py"
    cfg_file.write_text("""
AWS_ACCESS = "AKIAIOSFODNN7EXAMPLE"
STRIPE_KEY = "sk_test_51NABC1234567890abcdefghijklmnopqrstuvwxyz"
""")
    findings = scan_file_for_secrets(cfg_file, tmp_path)
    assert len(findings) >= 2
    rule_ids = [f.rule_id for f in findings]
    assert any("aws" in r.lower() for r in rule_ids)
    assert any("stripe" in r.lower() for r in rule_ids)


def test_sast_scanning_and_fix_generation(tmp_path):
    vuln_file = tmp_path / "models.py"
    vuln_file.write_text("""
def get_user(user_id):
    cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
""")
    rules = load_all_rules()
    findings = scan_directory_with_rules(tmp_path, rules=rules)
    assert len(findings) > 0

    sqli = next((f for f in findings if "sql" in (f.rule_id or "").lower()), findings[0])
    fix = generate_fix(sqli)
    assert fix is not None
    assert fix.file_path == "models.py"


def test_end_to_end_repo_scanner(tmp_path):
    # Setup miniature test repo
    (tmp_path / "app.py").write_text('API_KEY = "AKIAIOSFODNN7EXAMPLE"\ndef test(): pass\n')
    (tmp_path / "requirements.txt").write_text("urllib3==1.26.5\n")

    scanner = RepoScanner()
    config = ScanConfig(repo_url=str(tmp_path), mode=ScanMode.QUICK)
    result = scanner.scan(config)

    assert result.status.value == "completed"
    assert len(result.findings) >= 1
    assert result.security_score in ["A", "B", "C", "D", "F"]
    assert "python" in [l.lower() for l in result.languages_detected]


def test_database_persistence_and_stats(tmp_path):
    temp_db_path = str(tmp_path / "zerra_test.db")
    db = ZerraDatabase(temp_db_path)
    # Verify seed data
    db.seed_demo_data_if_empty()
    repos = db.list_repos()
    assert len(repos) >= 3

    scans = db.list_scans()
    assert len(scans) >= 2

    findings = db.list_findings()
    assert len(findings) >= 3

    stats = db.get_stats()
    assert stats["total_repos"] >= 3
    assert stats["total_findings"] >= 3
    assert stats["overall_grade"] in ["A+", "A", "B", "C", "D", "F"]

    # Insert custom repo
    custom_repo = {
        "id": "custom-123",
        "url": "https://github.com/test-org/secure-app",
        "branch": "main",
        "auto_scan": True,
        "scan_mode": "deep",
    }
    saved = db.save_repo(custom_repo)
    assert saved["url"] == "https://github.com/test-org/secure-app"

    fetched = db.get_repo("custom-123")
    assert fetched is not None
    assert fetched["branch"] == "main"


def test_notification_dispatcher():
    dispatcher = NotificationDispatcher()
    results = dispatcher.test_all_channels()
    assert isinstance(results, dict)
