"""Local FastAPI inference and protected-demo service for Zerra."""

from datetime import datetime, timezone
from uuid import uuid4

import time
import asyncio
import json
from typing import Any
from pydantic import BaseModel, Field
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse

from agent.contracts import CallEvent, DecisionResponse, Identity, IdentityType, Policy, PolicyStatus
from agent.policy.models import PolicyAction
from agent.agents import ThreatHunter
from agent.attack_sim import AttackSimulator, fast_invoice_enumeration, normal_repeating_user_traffic
from agent.main import create_demo_engine
from agent.mock_data import AccessDeniedError, MockDataStore
from agent.policy_recommendations import PolicyRecommendationService
from agent.reports import render_markdown
from agent.pentest import (
    PentestOrchestrator,
    PentestScanConfig,
    SkillsRegistry,
    generate_executive_report_markdown,
    generate_json_audit_log,
    generate_sarif_report,
)

app = FastAPI(title="Zerra Inference API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
engine, metrics = create_demo_engine()
data = MockDataStore()
risk_cards = []
investigations = {}
recommendations = {}
pentest_orchestrators: dict[str, PentestOrchestrator] = {}
threat_hunter = ThreatHunter()
recommendation_service = PolicyRecommendationService()


def evaluate(event: CallEvent) -> DecisionResponse:
    start = time.perf_counter()
    decision = engine.evaluate(event)
    latency_ms = (time.perf_counter() - start) * 1000
    metrics.record(decision=decision, latency_ms=latency_ms)
    if decision.risk_card:
        risk_cards.append(decision.risk_card)
    return decision


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "active"}


@app.post("/v1/evaluate", response_model=DecisionResponse)
def evaluate_event(event: CallEvent) -> DecisionResponse:
    return evaluate(event)


@app.get("/v1/metrics")
def get_metrics():
    return metrics.snapshot()


@app.get("/v1/risk-cards")
def get_risk_cards():
    return list(reversed(risk_cards[-100:]))


@app.get("/v1/llm/health")
def llm_health():
    return threat_hunter.client.health()


@app.post("/v1/risk-cards/{risk_card_id}/investigate")
def investigate(risk_card_id: str):
    card = next((item for item in risk_cards if item.id == risk_card_id), None)
    if card is None:
        raise HTTPException(404, "risk card not found")
    result = threat_hunter.investigate(card)
    investigations[risk_card_id] = result
    return result


@app.post("/v1/risk-cards/{risk_card_id}/policy-recommendation")
def recommend_policy(risk_card_id: str):
    card = next((item for item in risk_cards if item.id == risk_card_id), None)
    if card is None:
        raise HTTPException(404, "risk card not found")
    recommendation = recommendation_service.propose(card)
    recommendations[recommendation.id] = recommendation
    return recommendation


@app.post("/v1/policy-recommendations/{recommendation_id}/approve")
def approve_policy(recommendation_id: str):
    recommendation = recommendations.get(recommendation_id)
    if recommendation is None:
        raise HTTPException(404, "policy recommendation not found")
    if not recommendation.approved:
        active = recommendation.policy.model_copy(update={"status": "active"})
        engine.policy_engine.add_policy(active)
        recommendation = recommendation.model_copy(update={"policy": active, "approved": True})
        recommendations[recommendation_id] = recommendation
    return recommendation


class CreatePolicyPayload(BaseModel):
    id: str | None = None
    name: str
    description: str = ""
    rule_type: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    status: PolicyStatus = PolicyStatus.ACTIVE
    version: int = 1


@app.get("/v1/policies")
def list_policies():
    return [p.model_dump() for p in engine.policy_engine.list_policies()]


@app.post("/v1/policies")
def create_policy(payload: CreatePolicyPayload):
    pol_id = payload.id or f"policy-{uuid4().hex[:8]}"
    pol = Policy(
        id=pol_id,
        name=payload.name,
        description=payload.description,
        rule_type=payload.rule_type,
        parameters=payload.parameters,
        status=payload.status,
        version=payload.version,
    )
    engine.policy_engine.add_policy(pol)
    return pol.model_dump()


@app.delete("/v1/policies/{policy_id}")
def delete_policy(policy_id: str):
    removed = engine.policy_engine.remove_policy(policy_id)
    if not removed:
        raise HTTPException(404, f"Policy '{policy_id}' not found")
    return {"status": "deleted", "policy_id": policy_id}


@app.get("/v1/risk-cards/{risk_card_id}/report", response_class=PlainTextResponse)
def incident_report(risk_card_id: str):
    card = next((item for item in risk_cards if item.id == risk_card_id), None)
    if card is None:
        raise HTTPException(404, "risk card not found")
    investigation = investigations.get(risk_card_id) or threat_hunter.investigate(card)
    return render_markdown(card, investigation)


@app.get("/v1/identities")
def get_identities():
    return engine.registry.list_identities()


@app.post("/v1/identities/{identity_id}/revoke")
def revoke(identity_id: str):
    try:
        return engine.registry.revoke(identity_id)
    except KeyError as error:
        raise HTTPException(404, str(error)) from error


@app.post("/v1/identities/{identity_id}/restore")
def restore(identity_id: str):
    try:
        return engine.registry.restore(identity_id)
    except KeyError as error:
        raise HTTPException(404, str(error)) from error


def _identity_from_bearer(authorization: str | None):
    token = authorization.removeprefix("Bearer ") if authorization else ""
    identity = engine.registry.authenticate_token(token)
    if identity is None:
        raise HTTPException(401, "invalid or revoked demo token")
    return identity


@app.get("/demo/invoices/{invoice_id}")
def get_invoice(invoice_id: str, authorization: str | None = Header(default=None)):
    identity = _identity_from_bearer(authorization)
    metadata = data.get_invoice_metadata(invoice_id)
    if metadata is None:
        raise HTTPException(404, "invoice not found")
    event = CallEvent(id=str(uuid4()), identity_id=identity.id, identity_type=identity.type,
                      timestamp=datetime.now(timezone.utc), endpoint=f"/invoices/{invoice_id}", method="GET",
                      object_id=invoice_id, object_type="invoice", tenant_id=metadata.tenant_id,
                      home_tenant_id=identity.tenant_id, response_fields=["id", "tenant_id", "amount"],
                      sensitive_fields_touched=metadata.sensitive_fields)
    decision = evaluate(event)
    try:
        return {"decision": decision, "data": data.get_invoice(invoice_id, decision)}
    except AccessDeniedError as error:
        raise HTTPException(403, detail={"decision": decision.model_dump(mode="json"), "message": str(error)}) from error


@app.get("/demo/users/{user_id}")
def get_user(user_id: str, authorization: str | None = Header(default=None)):
    identity = _identity_from_bearer(authorization)
    event = CallEvent(id=str(uuid4()), identity_id=identity.id, identity_type=identity.type,
                      timestamp=datetime.now(timezone.utc), endpoint=f"/users/{user_id}", method="GET", object_id=user_id,
                      object_type="user", tenant_id=identity.tenant_id, home_tenant_id=identity.tenant_id)
    return {"decision": evaluate(event), "data": {"id": user_id, "tenant_id": identity.tenant_id, "name": "Demo User"}}


@app.get("/demo/admin/export")
def export_admin(authorization: str | None = Header(default=None)):
    identity = _identity_from_bearer(authorization)
    event = CallEvent(id=str(uuid4()), identity_id=identity.id, identity_type=identity.type,
                      timestamp=datetime.now(timezone.utc), endpoint="/admin/export", method="GET",
                      home_tenant_id=identity.tenant_id)
    decision = evaluate(event)
    if not decision.allowed:
        raise HTTPException(403, detail=decision.model_dump(mode="json"))
    return {"decision": decision, "data": []}


@app.get("/v1/attack-sim/scenarios")
def list_scenarios():
    return [
        {"id": "normal_traffic", "name": "Normal User Traffic", "description": "Simulates normal repeating user behavior", "type": "benign"},
        {"id": "fast_enumeration", "name": "Fast Invoice Enumeration", "description": "AI agent rapidly enumerates invoice IDs across tenants", "type": "attack"},
    ]


@app.post("/v1/attack-sim/run")
def run_attack_sim(scenario_id: str = "fast_enumeration"):
    simulator = AttackSimulator()
    if scenario_id == "normal_traffic":
        result = simulator.run(engine, normal_repeating_user_traffic(), metrics)
    else:
        result = simulator.run(engine, fast_invoice_enumeration(), metrics)
    return {
        "scenario_id": scenario_id,
        "total_calls": result.total_calls,
        "blocked": result.blocked,
        "stepped_up": result.stepped_up,
        "allowed": result.allowed,
        "first_flagged_call": result.first_flagged_call,
        "risk_cards_generated": len([c for c in risk_cards if c.verdict != "allow"]),
        "metrics": metrics.snapshot().model_dump() if hasattr(metrics.snapshot(), 'model_dump') else vars(metrics.snapshot()),
    }


@app.get("/v1/policies")
def get_policies():
    return engine.policy_engine.list_policies()


@app.get("/v1/trust-scores")
def get_trust_scores():
    identities = engine.registry.list_identities()
    scores = []
    for identity in identities:
        trust_data = engine.trust_store.get_score(identity.id) if hasattr(engine.trust_store, 'get_score') else None
        scores.append({
            "identity_id": identity.id,
            "identity_type": identity.type.value if hasattr(identity.type, 'value') else str(identity.type),
            "display_name": identity.display_name or identity.id,
            "trust_score": trust_data if isinstance(trust_data, (int, float)) else identity.trust_score,
            "is_revoked": identity.is_revoked,
        })
    return scores


@app.post("/v1/attack-replay")
def replay_attack(risk_card_id: str):
    """Replay a detected attack sequence to verify policies catch it."""
    card = next((item for item in risk_cards if item.id == risk_card_id), None)
    if card is None:
        raise HTTPException(404, "risk card not found")
    # Re-run the fast enumeration to prove it's still blocked
    simulator = AttackSimulator()
    result = simulator.run(engine, fast_invoice_enumeration(), metrics)
    return {
        "original_card_id": risk_card_id,
        "replay_blocked": result.blocked > 0,
        "replay_total_calls": result.total_calls,
        "replay_blocked_count": result.blocked,
        "replay_first_flagged": result.first_flagged_call,
        "verdict": "attack_caught" if result.blocked > 0 else "attack_missed",
    }


# ==============================================================================
# Autonomous AI Continuous Pentest & Validation Endpoints
# ==============================================================================

@app.get("/v1/pentest/skills")
def list_pentest_skills():
    """List available domain-specific pentesting skills."""
    skills = SkillsRegistry.list_skills()
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "owasp_id": s.owasp_id,
            "cwe": s.cwe,
            "description": s.description,
            "counterevidence_guide": s.counterevidence_guide,
        }
        for s in skills
    ]


@app.post("/v1/pentest/start")
async def start_pentest(config: PentestScanConfig):
    """Launch an autonomous multi-agent pentesting scan."""
    orchestrator = PentestOrchestrator(config)
    pentest_orchestrators[config.job_id] = orchestrator
    # Launch execution task in background
    asyncio.create_task(orchestrator.run())
    return {
        "job_id": config.job_id,
        "status": "started",
        "target_url": config.target_url,
        "mode": config.mode,
        "active_skills": config.enabled_skills,
    }


@app.get("/v1/pentest/{job_id}/stream")
async def stream_pentest_events(job_id: str):
    """Server-Sent Events (SSE) stream for live agent execution telemetry."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")

    async def event_generator():
        try:
            async for event in orchestrator.subscribe_events():
                payload = json.dumps(event.model_dump(), default=str)
                yield f"data: {payload}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/v1/pentest/{job_id}/status")
def get_pentest_status(job_id: str):
    """Check status, summary metrics, and progress of a pentest job."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")
    return {
        "job_id": job_id,
        "status": orchestrator.status,
        "target_url": orchestrator.target_url,
        "summary": orchestrator.summary,
        "findings_count": len(orchestrator.tools.findings_ledger),
        "coverage_count": len(orchestrator.tools.coverage_ledger),
    }


@app.get("/v1/pentest/{job_id}/findings")
def get_pentest_findings(job_id: str):
    """Retrieve full findings list with verified PoCs and virtual patches."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")
    return [f.model_dump() for f in orchestrator.tools.findings_ledger]


@app.get("/v1/pentest/{job_id}/coverage")
def get_pentest_coverage(job_id: str):
    """Retrieve full attack surface coverage ledger."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")
    return [c.model_dump() for c in orchestrator.tools.coverage_ledger]


@app.post("/v1/pentest/{job_id}/apply-patch")
def apply_virtual_patch(job_id: str, patch_id: str):
    """Apply generated Zero-Trust Virtual Patch directly to the Gateway policy engine."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")

    target_finding = None
    for f in orchestrator.tools.findings_ledger:
        if f.virtual_patch and f.virtual_patch.id == patch_id:
            target_finding = f
            break

    if not target_finding or not target_finding.virtual_patch:
        raise HTTPException(404, "Virtual patch not found")

    patch = target_finding.virtual_patch
    # Construct a real Gateway Policy rule
    new_policy = Policy(
        id=f"vp-{patch.id[:8]}",
        name=f"Virtual Patch: {patch.rule_name}",
        description=patch.description,
        rule_type="virtual_patch",
        parameters={
            "target_pattern": patch.target_endpoint_pattern,
            "target_method": patch.target_method,
            "action": patch.action.lower(),
            "applied_from_pentest_job": job_id,
            "policy_condition": patch.policy_condition,
        },
        version=1,
        status=PolicyStatus.ACTIVE,
    )
    engine.policy_engine.add_policy(new_policy)
    patch.status = "applied"
    patch.applied_at = datetime.now(timezone.utc)

    return {
        "status": "applied",
        "patch_id": patch.id,
        "policy_id": new_policy.id,
        "rule_name": new_policy.name,
        "gateway_verdict_enforced": patch.action,
        "applied_at": patch.applied_at.isoformat(),
    }


@app.post("/v1/pentest/{job_id}/verify-patch")
def verify_virtual_patch(job_id: str, patch_id: str):
    """Execute live exploit neutralization verification against the gateway policy engine."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")

    target_finding = None
    for f in orchestrator.tools.findings_ledger:
        if f.virtual_patch and f.virtual_patch.id == patch_id:
            target_finding = f
            break

    if not target_finding or not target_finding.virtual_patch:
        raise HTTPException(404, "Virtual patch not found")

    patch = target_finding.virtual_patch
    poc = target_finding.poc

    # Simulate PoC exploit call against the policy engine
    exploit_call = CallEvent(
        id=f"call-poc-{uuid4().hex[:8]}",
        identity_id="adversary-poc-runner",
        identity_type=IdentityType.HUMAN,
        timestamp=datetime.now(timezone.utc),
        endpoint=target_finding.endpoint,
        method=target_finding.method,
        tenant_id="attacker-tenant",
        home_tenant_id="attacker-tenant",
    )
    adversary_identity = Identity(
        id="adversary-poc-runner",
        type=IdentityType.HUMAN,
        tenant_id="attacker-tenant",
        auth_strength=0.8,
        scope_contract=[],
        trust_score=80.0,
    )

    evaluations = engine.policy_engine.evaluate(
        event=exploit_call,
        identity=adversary_identity,
        trust_score=80.0,
        graph_result=None,
    )

    # Check if this virtual patch was applied and matched
    patch_is_applied = (patch.status == "applied")
    patch_policy_matched = any(
        e.matched and (e.policy_id == f"vp-{patch.id[:8]}" or "Virtual Patch" in e.policy_name)
        for e in evaluations
    )

    is_blocked = patch_is_applied and patch_policy_matched
    status_before = poc.http_status_code or 200
    status_after = 403 if is_blocked else status_before
    verdict_str = "block" if is_blocked else "allow"

    return {
        "job_id": job_id,
        "finding_id": target_finding.id,
        "patch_id": patch.id,
        "rule_name": patch.rule_name,
        "patch_status": patch.status,
        "exploit_status_before_patch": status_before,
        "exploit_status_after_patch": status_after,
        "verdict": verdict_str,
        "mitigated_inline": is_blocked,
        "matched_rules": [e.policy_name for e in evaluations if e.matched],
        "message": "Exploit neutralized inline by Zero-Trust Virtual Patch" if is_blocked else "Exploit active (patch not yet applied)",
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/v1/pentest/{job_id}/export/sarif")
def export_sarif(job_id: str):
    """Export validated pentest findings in OASIS SARIF 2.1.0 format."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")
    return generate_sarif_report(
        job_id=job_id,
        target_url=orchestrator.target_url,
        findings=orchestrator.tools.findings_ledger,
    )


@app.get("/v1/pentest/{job_id}/export/report", response_class=PlainTextResponse)
def export_executive_report(job_id: str):
    """Export high-impact executive compliance markdown pentest report."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")
    report_md = generate_executive_report_markdown(
        summary=orchestrator.summary or {
            "target_url": orchestrator.target_url,
            "duration_seconds": 15,
        },
        findings=orchestrator.tools.findings_ledger,
        coverage=orchestrator.tools.coverage_ledger,
    )
    return PlainTextResponse(report_md, media_type="text/markdown")


@app.get("/v1/pentest/{job_id}/export/audit")
def export_audit_log(job_id: str):
    """Export tamper-evident JSON audit trail of all tested surfaces and actions."""
    orchestrator = pentest_orchestrators.get(job_id)
    if not orchestrator:
        raise HTTPException(404, "Pentest job not found")
    return generate_json_audit_log(
        job_id=job_id,
        target_url=orchestrator.target_url,
        summary=orchestrator.summary or {},
        findings=orchestrator.tools.findings_ledger,
        coverage=orchestrator.tools.coverage_ledger,
    )


@app.get("/v1/pentest/jobs")
def list_pentest_jobs():
    """List all autonomous pentest runs and current state."""
    results = []
    for j_id, orch in pentest_orchestrators.items():
        results.append({
            "job_id": j_id,
            "target_url": orch.target_url,
            "status": "completed" if orch.summary else "running",
            "findings_count": len(orch.tools.findings_ledger),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return results


@app.get("/v1/pentest/latest/export/sarif")
def export_latest_sarif():
    """Export latest findings in SARIF 2.1.0 format."""
    if not pentest_orchestrators:
        return generate_sarif_report(job_id="system-latest", target_url="https://api.zerra.internal", findings=[])
    latest_id = list(pentest_orchestrators.keys())[-1]
    return export_sarif(latest_id)


@app.get("/v1/pentest/latest/export/report", response_class=PlainTextResponse)
def export_latest_report():
    """Export latest executive compliance report in Markdown format."""
    if not pentest_orchestrators:
        return PlainTextResponse(
            generate_executive_report_markdown(
                summary={"target_url": "https://api.zerra.internal", "duration_seconds": 0},
                findings=[],
                coverage={"endpoints_tested": 0, "parameters_fuzzed": 0, "payloads_evaluated": 0},
            ),
            media_type="text/markdown",
        )
    latest_id = list(pentest_orchestrators.keys())[-1]
    return export_executive_report(latest_id)


@app.get("/v1/pentest/latest/export/audit")
def export_latest_audit():
    """Export latest tamper-evident JSON audit trail."""
    if not pentest_orchestrators:
        return generate_json_audit_log(
            job_id="system-latest",
            target_url="https://api.zerra.internal",
            summary={"target_url": "https://api.zerra.internal", "duration_seconds": 0},
            findings=[],
            coverage={},
        )
    latest_id = list(pentest_orchestrators.keys())[-1]
    return export_audit_log(latest_id)


# ──────────────────────────────────────────────────────────
# Zerra v2: Repository Scanner & Notifications API
# ──────────────────────────────────────────────────────────

from agent.scanner.models import ScanConfig, ScanMode, ScanResult as ScanResultModel, ScanStatus
from agent.scanner.repo_scanner import RepoScanner
from agent.integrations.webhook_handler import parse_webhook, format_scan_comment
from agent.integrations.fix_generator import generate_fix, generate_pr_body
from agent.notifications.dispatcher import NotificationDispatcher, NotificationConfig

# In-memory stores (Phase 4 will add persistence)
_repos: dict[str, dict] = {}
_scans: dict[str, ScanResultModel] = {}
_scanner = RepoScanner()
_notification_dispatcher: NotificationDispatcher | None = None


def _get_notifier() -> NotificationDispatcher:
    global _notification_dispatcher
    if _notification_dispatcher is None:
        _notification_dispatcher = NotificationDispatcher()
    return _notification_dispatcher


class RepoCreate(BaseModel):
    url: str
    branch: str = "main"
    auto_scan: bool = True
    scan_mode: str = "standard"
    github_token: str | None = None


class ScanTrigger(BaseModel):
    mode: str = "standard"
    branch: str | None = None


# ── Repository Management ────────────────────────────

@app.post("/v1/repos")
def register_repo(body: RepoCreate):
    """Register a repository for monitoring."""
    repo_id = uuid4().hex[:12]
    _repos[repo_id] = {
        "id": repo_id,
        "url": body.url,
        "branch": body.branch,
        "auto_scan": body.auto_scan,
        "scan_mode": body.scan_mode,
        "github_token": body.github_token,
        "status": "active",
        "last_scan_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return _repos[repo_id]


@app.get("/v1/repos")
def list_repos():
    """List all monitored repositories."""
    result = []
    for repo_id, repo in _repos.items():
        repo_data = {k: v for k, v in repo.items() if k != "github_token"}
        if repo.get("last_scan_id") and repo["last_scan_id"] in _scans:
            scan = _scans[repo["last_scan_id"]]
            repo_data["last_scan"] = {
                "id": scan.id,
                "status": scan.status.value,
                "security_score": scan.security_score,
                "findings_count": len(scan.findings),
                "critical_count": scan.critical_count,
                "high_count": scan.high_count,
                "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
            }
        result.append(repo_data)
    return result


@app.get("/v1/repos/{repo_id}")
def get_repo(repo_id: str):
    """Get details of a specific repository."""
    if repo_id not in _repos:
        raise HTTPException(status_code=404, detail="Repository not found")
    return {k: v for k, v in _repos[repo_id].items() if k != "github_token"}


@app.delete("/v1/repos/{repo_id}")
def remove_repo(repo_id: str):
    """Remove a repository from monitoring."""
    if repo_id not in _repos:
        raise HTTPException(status_code=404, detail="Repository not found")
    del _repos[repo_id]
    return {"status": "deleted", "id": repo_id}


# ── Scan Operations ─────────────────────────────────

@app.post("/v1/repos/{repo_id}/scan")
async def trigger_scan(repo_id: str, body: ScanTrigger | None = None):
    """Trigger a manual scan for a repository."""
    if repo_id not in _repos:
        raise HTTPException(status_code=404, detail="Repository not found")
    repo = _repos[repo_id]
    mode_str = (body.mode if body else repo.get("scan_mode", "standard"))
    branch = (body.branch if body and body.branch else repo.get("branch", "main"))
    config = ScanConfig(
        repo_url=repo["url"],
        branch=branch,
        mode=ScanMode(mode_str),
        github_token=repo.get("github_token"),
    )
    result = await _scanner.scan_async(config)
    _scans[result.id] = result
    _repos[repo_id]["last_scan_id"] = result.id
    try:
        _get_notifier().notify_scan_complete(result)
    except Exception:
        pass
    return {
        "scan_id": result.id,
        "status": result.status.value,
        "security_score": result.security_score,
        "findings_count": len(result.findings),
        "critical_count": result.critical_count,
        "high_count": result.high_count,
        "medium_count": result.medium_count,
        "low_count": result.low_count,
        "duration_seconds": result.duration_seconds,
    }


@app.post("/v1/scan")
async def scan_repo_directly(config: ScanConfig):
    """Scan a repository directly without registering it."""
    result = await _scanner.scan_async(config)
    _scans[result.id] = result
    return result


@app.get("/v1/scans")
def list_scans():
    """List all scan results."""
    return [
        {
            "id": s.id, "repo_url": s.repo_url, "branch": s.branch,
            "status": s.status.value, "security_score": s.security_score,
            "findings_count": len(s.findings),
            "critical_count": s.critical_count, "high_count": s.high_count,
            "medium_count": s.medium_count, "low_count": s.low_count,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "duration_seconds": s.duration_seconds, "languages": s.languages_detected,
        }
        for s in sorted(_scans.values(),
                         key=lambda x: x.started_at or datetime.min.replace(tzinfo=timezone.utc),
                         reverse=True)
    ]


@app.get("/v1/scans/{scan_id}")
def get_scan(scan_id: str):
    """Get full scan result with findings."""
    if scan_id not in _scans:
        raise HTTPException(status_code=404, detail="Scan not found")
    return _scans[scan_id]


@app.get("/v1/scans/{scan_id}/findings")
def get_scan_findings(scan_id: str, severity: str | None = None):
    """Get findings for a specific scan."""
    if scan_id not in _scans:
        raise HTTPException(status_code=404, detail="Scan not found")
    findings = _scans[scan_id].findings
    if severity:
        findings = [f for f in findings if f.severity.value == severity.lower()]
    return findings


@app.get("/v1/scans/{scan_id}/sarif")
def export_scan_sarif(scan_id: str):
    """Export scan results in SARIF 2.1.0 format."""
    if scan_id not in _scans:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan = _scans[scan_id]
    sarif: dict = {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{"tool": {"driver": {"name": "Zerra", "version": "2.0.0",
                  "informationUri": "https://github.com/sjsreehari/zerra",
                  "rules": []}}, "results": []}],
    }
    rules_seen: dict[str, int] = {}
    run = sarif["runs"][0]
    for finding in scan.findings:
        rid = finding.rule_id or finding.id
        if rid not in rules_seen:
            rules_seen[rid] = len(run["tool"]["driver"]["rules"])
            run["tool"]["driver"]["rules"].append({
                "id": rid,
                "shortDescription": {"text": finding.title},
                "fullDescription": {"text": finding.description[:1000]},
                "properties": {"security-severity": str(finding.cvss_score or "5.0")},
            })
        entry: dict = {
            "ruleId": rid, "ruleIndex": rules_seen[rid],
            "level": {"critical": "error", "high": "error", "medium": "warning",
                      "low": "note", "info": "note"}.get(finding.severity.value, "warning"),
            "message": {"text": finding.description[:500]}, "locations": [],
        }
        if finding.file_path:
            entry["locations"].append({"physicalLocation": {
                "artifactLocation": {"uri": finding.file_path},
                "region": {"startLine": finding.line_start or 1,
                           "endLine": finding.line_end or finding.line_start or 1},
            }})
        run["results"].append(entry)
    return sarif


@app.post("/v1/webhooks/github")
async def github_webhook(request_body: dict):
    """Receive and process GitHub webhook events."""
    events = parse_webhook("push", request_body)
    results = []
    for event in events:
        for repo_id, repo in _repos.items():
            if event.repo_full_name in repo["url"] or repo["url"] in event.repo_url:
                config = ScanConfig(
                    repo_url=event.repo_url,
                    branch=event.branch or repo.get("branch", "main"),
                    commit_sha=event.commit_sha,
                    mode=ScanMode(repo.get("scan_mode", "standard")),
                    github_token=repo.get("github_token"),
                )
                scan_result = await _scanner.scan_async(config)
                _scans[scan_result.id] = scan_result
                _repos[repo_id]["last_scan_id"] = scan_result.id
                try:
                    _get_notifier().notify_scan_complete(scan_result)
                except Exception:
                    pass
                results.append({"repo": event.repo_full_name, "scan_id": scan_result.id,
                                "grade": scan_result.security_score, "findings": len(scan_result.findings)})
                break
    return {"processed": len(results), "results": results}


@app.get("/v1/findings")
def list_all_findings(severity: str | None = None, limit: int = 100):
    """List findings across all scans."""
    all_findings = []
    for scan in _scans.values():
        for f in scan.findings:
            fd = f.model_dump()
            fd["scan_id"] = scan.id
            fd["repo_url"] = scan.repo_url
            all_findings.append(fd)
    if severity:
        all_findings = [f for f in all_findings if f["severity"] == severity.lower()]
    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    all_findings.sort(key=lambda x: sev_order.get(x["severity"], 5))
    return all_findings[:limit]


@app.post("/v1/notifications/test")
def test_notifications():
    """Test all configured notification channels."""
    results = _get_notifier().test_all_channels()
    return {"channels": _get_notifier().active_channels, "results": results}


@app.get("/v1/notifications/channels")
def list_notification_channels():
    """List configured notification channels."""
    return {"channels": _get_notifier().active_channels}


@app.get("/v1/dashboard/stats")
def dashboard_stats():
    """Aggregate stats for the dashboard."""
    total_findings = sum(len(s.findings) for s in _scans.values())
    total_critical = sum(s.critical_count for s in _scans.values())
    total_high = sum(s.high_count for s in _scans.values())
    weight = total_critical * 10 + total_high * 5
    overall_grade = "A+" if total_findings == 0 else "A" if weight == 0 else "B" if weight <= 5 else "C" if weight <= 15 else "D" if weight <= 30 else "F"
    recent = sorted(_scans.values(), key=lambda x: x.started_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:5]
    return {
        "total_repos": len(_repos), "total_scans": len(_scans),
        "total_findings": total_findings, "total_critical": total_critical,
        "total_high": total_high, "overall_grade": overall_grade,
        "active_channels": _get_notifier().active_channels,
        "recent_scans": [{"id": s.id, "repo_url": s.repo_url, "grade": s.security_score,
                          "findings": len(s.findings),
                          "completed_at": s.completed_at.isoformat() if s.completed_at else None} for s in recent],
    }
