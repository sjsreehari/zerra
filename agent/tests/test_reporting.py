"""Unit tests for SARIF 2.1.0 and executive compliance reporting."""

import pytest
from fastapi.testclient import TestClient

from agent.api import app
from agent.pentest import (
    ClosureState,
    CoverageOutcome,
    CoverageRecord,
    GatewayVirtualPatch,
    PentestScanConfig,
    PoCArtifact,
    CounterevidenceAnalysis,
    ScanMode,
    Severity,
    VulnerabilityFinding,
    generate_executive_report_markdown,
    generate_json_audit_log,
    generate_sarif_report,
)
from agent.pentest.orchestrator import PentestOrchestrator


@pytest.fixture
def sample_finding():
    return VulnerabilityFinding(
        job_id="test-job-001",
        title="Cross-Tenant Broken Object Level Authorization",
        owasp_id="API1:2023",
        cwe="CWE-639",
        severity=Severity.HIGH,
        closure_state=ClosureState.CONFIRMED,
        endpoint="/invoices/{invoice_id}",
        method="GET",
        description="Unauthenticated access to cross-tenant invoices.",
        technical_analysis="IDOR on invoice endpoint leaks commercial billing data.",
        poc=PoCArtifact(
            code="curl -i http://localhost:8000/invoices/inv-002",
            target_endpoint="/invoices/inv-002",
            expected_indicator="amount",
            actual_indicator="amount: 4500",
            verified=True,
        ),
        counterevidence=CounterevidenceAnalysis(
            argument_against="Might be a public receipt.",
            assumptions=["Invoices are tenant confidential"],
            why_it_matters="Discloses unauthenticated corporate billing records.",
            confidence="high",
        ),
        remediation_advice="Enforce tenant ownership validation.",
        code_fix_before="def invoice(id): return db[id]",
        code_fix_after="def invoice(id, user): check_tenant(user, id); return db[id]",
        virtual_patch=GatewayVirtualPatch(
            rule_name="BOLA-Invoices",
            target_endpoint_pattern="/invoices/*",
            target_method="GET",
            action="BLOCK",
            description="Block unauthorized invoice enumeration",
        ),
    )


@pytest.fixture
def sample_coverage():
    return [
        CoverageRecord(
            surface="/invoices/{invoice_id}",
            method="GET",
            risk_area="BOLA",
            outcome=CoverageOutcome.VULNERABLE,
            evidence="200 OK with cross-tenant data",
        ),
        CoverageRecord(
            surface="/health",
            method="GET",
            risk_area="Availability",
            outcome=CoverageOutcome.PASSED,
            evidence="200 OK active",
        ),
    ]


def test_generate_sarif_report(sample_finding):
    """Verify SARIF 2.1.0 document compliance."""
    sarif = generate_sarif_report(
        job_id="test-job-001",
        target_url="http://127.0.0.1:8000",
        findings=[sample_finding],
    )

    assert sarif["version"] == "2.1.0"
    assert "$schema" in sarif
    assert len(sarif["runs"]) == 1

    run = sarif["runs"][0]
    assert run["tool"]["driver"]["name"] == "Zerra Continuous Security Platform"
    assert len(run["tool"]["driver"]["rules"]) == 1
    assert run["tool"]["driver"]["rules"][0]["id"] == "API1:2023"

    assert len(run["results"]) == 1
    res = run["results"][0]
    assert res["ruleId"] == "API1:2023"
    assert res["level"] == "error"
    assert len(res["fixes"]) == 1


def test_generate_executive_report_markdown(sample_finding, sample_coverage):
    """Verify high-impact executive compliance markdown generation."""
    md = generate_executive_report_markdown(
        summary={"target_url": "http://127.0.0.1:8000", "duration_seconds": 12.5},
        findings=[sample_finding],
        coverage=sample_coverage,
    )

    assert "# Zerra Executive Security Assessment & Pentest Report" in md
    assert "Overall Risk Score" in md
    assert "OWASP API Security Top 10 (2023) Compliance Scorecard" in md
    assert "API1:2023" in md
    assert "Verified Proof-of-Concept Exploit" in md
    assert "curl -i http://localhost:8000/invoices/inv-002" in md
    assert "Inline Zero-Trust Gateway Virtual Patch" in md
    assert "Attack Surface Coverage Ledger" in md


def test_generate_json_audit_log(sample_finding, sample_coverage):
    """Verify structured audit log contains all records."""
    audit = generate_json_audit_log(
        job_id="test-job-001",
        target_url="http://127.0.0.1:8000",
        summary={"status": "completed"},
        findings=[sample_finding],
        coverage=sample_coverage,
    )

    assert audit["audit_version"] == "1.0.0"
    assert audit["job_id"] == "test-job-001"
    assert len(audit["findings"]) == 1
    assert len(audit["coverage_records"]) == 2


def test_api_export_endpoints():
    """Verify HTTP export routes for SARIF, report, and audit."""
    client = TestClient(app)

    # Start a scan
    start_resp = client.post("/v1/pentest/start", json={"target_url": "http://127.0.0.1:8000", "mode": "quick"})
    job_id = start_resp.json()["job_id"]

    # Test SARIF export
    sarif_resp = client.get(f"/v1/pentest/{job_id}/export/sarif")
    assert sarif_resp.status_code == 200
    assert sarif_resp.json()["version"] == "2.1.0"

    # Test Markdown report export
    report_resp = client.get(f"/v1/pentest/{job_id}/export/report")
    assert report_resp.status_code == 200
    assert "Zerra Executive Security Assessment" in report_resp.text

    # Test Audit log export
    audit_resp = client.get(f"/v1/pentest/{job_id}/export/audit")
    assert audit_resp.status_code == 200
    assert audit_resp.json()["audit_version"] == "1.0.0"
