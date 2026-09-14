"""Unit tests for Phase 3: Gateway Virtual Patch Enforcer & Live Exploit Neutralization Verification."""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from agent.api import app, pentest_orchestrators
from agent.contracts import CallEvent, Identity, IdentityType, Policy, PolicyStatus
from agent.policy.engine import PolicyEngine
from agent.policy.models import PolicyAction
from agent.pentest.agent_types import (
    ClosureState,
    CounterevidenceAnalysis,
    GatewayVirtualPatch,
    PentestScanConfig,
    PoCArtifact,
    Severity,
    VulnerabilityFinding,
)
from agent.pentest.orchestrator import PentestOrchestrator


@pytest.fixture
def client():
    return TestClient(app)


def test_policy_engine_virtual_patch_block():
    """Verify that PolicyEngine correctly evaluates virtual_patch rules matching endpoints and methods."""
    engine = PolicyEngine(policies=[])
    vp_policy = Policy(
        id="vp-test-01",
        name="Virtual Patch: Block User Infiltration",
        description="Mitigates BOLA on user profile endpoint",
        rule_type="virtual_patch",
        parameters={
            "target_pattern": "/api/v1/users/*",
            "target_method": "GET",
            "action": "block",
        },
        version=1,
        status=PolicyStatus.ACTIVE,
    )
    engine.add_policy(vp_policy)

    identity = Identity(
        id="caller-1",
        type=IdentityType.HUMAN,
        tenant_id="tenant-a",
        auth_strength=0.9,
    )

    # 1. Matching path and method
    matching_event = CallEvent(
        id="call-1",
        identity_id="caller-1",
        identity_type=IdentityType.HUMAN,
        timestamp=datetime.now(timezone.utc),
        endpoint="/api/v1/users/999",
        method="GET",
    )
    evals = engine.evaluate(event=matching_event, identity=identity, trust_score=100.0, graph_result=None)
    action = engine.final_action(evals)
    assert action == PolicyAction.BLOCK
    assert any(e.matched and e.policy_id == "vp-test-01" for e in evals)

    # 2. Non-matching endpoint
    other_endpoint_event = CallEvent(
        id="call-2",
        identity_id="caller-1",
        identity_type=IdentityType.HUMAN,
        timestamp=datetime.now(timezone.utc),
        endpoint="/api/v1/catalog/items",
        method="GET",
    )
    evals2 = engine.evaluate(event=other_endpoint_event, identity=identity, trust_score=100.0, graph_result=None)
    assert engine.final_action(evals2) == PolicyAction.ALLOW

    # 3. Non-matching method
    other_method_event = CallEvent(
        id="call-3",
        identity_id="caller-1",
        identity_type=IdentityType.HUMAN,
        timestamp=datetime.now(timezone.utc),
        endpoint="/api/v1/users/999",
        method="DELETE",
    )
    evals3 = engine.evaluate(event=other_method_event, identity=identity, trust_score=100.0, graph_result=None)
    assert engine.final_action(evals3) == PolicyAction.ALLOW


def test_policy_engine_virtual_patch_cross_tenant_condition():
    """Verify virtual patch evaluation with cross_tenant_object condition constraint."""
    engine = PolicyEngine(policies=[])
    vp_policy = Policy(
        id="vp-cross-tenant-01",
        name="Virtual Patch: BOLA Cross-Tenant Boundary",
        description="Blocks foreign tenant access",
        rule_type="virtual_patch",
        parameters={
            "target_pattern": "/api/v1/documents/*",
            "target_method": "*",
            "action": "block",
            "policy_condition": {"require_tenant_match": True},
        },
        version=1,
        status=PolicyStatus.ACTIVE,
    )
    engine.add_policy(vp_policy)

    home_identity = Identity(
        id="caller-home",
        type=IdentityType.AGENT,
        tenant_id="tenant-alpha",
        auth_strength=0.9,
    )

    # Same tenant request -> ALLOW
    same_tenant_call = CallEvent(
        id="call-same",
        identity_id="caller-home",
        identity_type=IdentityType.AGENT,
        timestamp=datetime.now(timezone.utc),
        endpoint="/api/v1/documents/doc-123",
        method="GET",
        tenant_id="tenant-alpha",
    )
    evals = engine.evaluate(event=same_tenant_call, identity=home_identity, trust_score=100.0, graph_result=None)
    assert engine.final_action(evals) == PolicyAction.ALLOW

    # Cross tenant request -> BLOCK
    cross_tenant_call = CallEvent(
        id="call-cross",
        identity_id="caller-home",
        identity_type=IdentityType.AGENT,
        timestamp=datetime.now(timezone.utc),
        endpoint="/api/v1/documents/doc-999",
        method="GET",
        tenant_id="tenant-beta",
    )
    evals_cross = engine.evaluate(event=cross_tenant_call, identity=home_identity, trust_score=100.0, graph_result=None)
    assert engine.final_action(evals_cross) == PolicyAction.BLOCK


def test_api_apply_and_verify_virtual_patch(client):
    """End-to-end test of /apply-patch and /verify-patch proving exploit neutralization."""
    job_id = "test-job-vp-verify"
    config = PentestScanConfig(job_id=job_id, target_url="http://test-target.local")
    orchestrator = PentestOrchestrator(config)

    vp = GatewayVirtualPatch(
        rule_name="BOLA Mitigation on /api/v1/orders/*",
        target_endpoint_pattern="/api/v1/orders/*",
        target_method="GET",
        action="BLOCK",
        description="Blocks unauthorized order enumeration",
    )

    finding = VulnerabilityFinding(
        job_id=job_id,
        title="BOLA Broken Object Level Auth",
        owasp_id="API1:2023",
        severity=Severity.HIGH,
        closure_state=ClosureState.CONFIRMED,
        endpoint="/api/v1/orders/1001",
        method="GET",
        description="IDOR allows accessing orders of other users",
        technical_analysis="Sequential ID mutation succeeded",
        poc=PoCArtifact(
            code="curl http://test-target.local/api/v1/orders/1001",
            target_endpoint="/api/v1/orders/1001",
            expected_indicator="order_id",
            actual_indicator="order_id",
            http_status_code=200,
            verified=True,
        ),
        counterevidence=CounterevidenceAnalysis(
            argument_against="Public order tracking",
            why_it_matters="Sensitive PII exposed",
            confidence="high",
        ),
        remediation_advice="Enforce tenant check in SQL query",
        virtual_patch=vp,
    )

    orchestrator.tools.findings_ledger.append(finding)
    pentest_orchestrators[job_id] = orchestrator

    # Step 1: Verify before patch is applied
    verify_before = client.post(f"/v1/pentest/{job_id}/verify-patch?patch_id={vp.id}")
    assert verify_before.status_code == 200
    data_before = verify_before.json()
    assert data_before["mitigated_inline"] is False
    assert data_before["exploit_status_after_patch"] == 200

    # Step 2: Apply the virtual patch
    apply_res = client.post(f"/v1/pentest/{job_id}/apply-patch?patch_id={vp.id}")
    assert apply_res.status_code == 200
    assert apply_res.json()["status"] == "applied"

    # Step 3: Verify after patch is applied
    verify_after = client.post(f"/v1/pentest/{job_id}/verify-patch?patch_id={vp.id}")
    assert verify_after.status_code == 200
    data_after = verify_after.json()
    assert data_after["mitigated_inline"] is True
    assert data_after["verdict"] == "block"
    assert data_after["exploit_status_after_patch"] == 403
    assert "Exploit neutralized inline" in data_after["message"]
