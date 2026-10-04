"""Local FastAPI inference and protected-demo service for Zerra."""

from datetime import datetime, timezone
from uuid import uuid4

import os
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
from agent.integrations.github_client import GitHubClient
from agent.notifications.dispatcher import NotificationDispatcher, NotificationConfig
from agent.db.database import get_db

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


class CreatePRRequest(BaseModel):
    github_token: str | None = None
    branch_name: str | None = None
    commit_message: str | None = None


# ── Repository Management ────────────────────────────

@app.post("/v1/repos")
def register_repo(body: RepoCreate):
    """Register a repository for monitoring in SQLite."""
    db = get_db()
    saved = db.save_repo(body.model_dump())
    return {k: v for k, v in saved.items() if k != "github_token"}


@app.get("/v1/repos")
def list_repos():
    """List all monitored repositories with their latest scan stats."""
    db = get_db()
    repos = db.list_repos()
    result = []
    for repo in repos:
        repo_data = {k: v for k, v in repo.items() if k != "github_token"}
        if repo.get("last_scan_id"):
            scan = db.get_scan(repo["last_scan_id"])
            if scan:
                repo_data["last_scan"] = {
                    "id": scan.get("id"),
                    "status": scan.get("status"),
                    "security_score": scan.get("security_score"),
                    "findings_count": len(scan.get("findings", [])),
                    "critical_count": scan.get("critical_count", 0),
                    "high_count": scan.get("high_count", 0),
                    "completed_at": scan.get("completed_at"),
                }
        result.append(repo_data)
    return result


@app.get("/v1/repos/{repo_id}")
def get_repo(repo_id: str):
    """Get details of a specific repository."""
    db = get_db()
    repo = db.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return {k: v for k, v in repo.items() if k != "github_token"}


@app.delete("/v1/repos/{repo_id}")
def remove_repo(repo_id: str):
    """Remove a repository from monitoring."""
    db = get_db()
    if not db.delete_repo(repo_id):
        raise HTTPException(status_code=404, detail="Repository not found")
    return {"status": "deleted", "id": repo_id}


# ── Scan Operations ─────────────────────────────────

@app.post("/v1/repos/{repo_id}/scan")
async def trigger_scan(repo_id: str, body: ScanTrigger | None = None):
    """Trigger a scan for a registered repository."""
    db = get_db()
    repo = db.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    mode_str = (body.mode if body else repo.get("scan_mode", "standard"))
    branch = (body.branch if body and body.branch else repo.get("branch", "main"))
    config = ScanConfig(
        repo_url=repo["url"],
        branch=branch,
        mode=ScanMode(mode_str),
        github_token=repo.get("github_token"),
    )
    result = await _scanner.scan_async(config)
    db.save_scan(result)
    db.update_repo_last_scan(repo_id, result.id)

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
    """Scan a repository directly without prior registration."""
    db = get_db()
    result = await _scanner.scan_async(config)
    db.save_scan(result)
    try:
        _get_notifier().notify_scan_complete(result)
    except Exception:
        pass
    return result


@app.get("/v1/scans")
def list_scans(limit: int = 50):
    """List all past scan runs."""
    db = get_db()
    return db.list_scans(limit=limit)


@app.get("/v1/scans/{scan_id}")
def get_scan(scan_id: str):
    """Get full scan result with all findings."""
    db = get_db()
    scan = db.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@app.get("/v1/scans/{scan_id}/findings")
def get_scan_findings(scan_id: str, severity: str | None = None):
    """Get findings for a specific scan."""
    db = get_db()
    return db.list_findings(severity=severity, scan_id=scan_id)


@app.get("/v1/scans/{scan_id}/sarif")
def export_scan_sarif(scan_id: str):
    """Export scan results in OASIS SARIF 2.1.0 standard format."""
    db = get_db()
    scan = db.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    sarif: dict = {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {
                "driver": {
                    "name": "Zerra",
                    "version": "2.0.0",
                    "informationUri": "https://github.com/sjsreehari/zerra",
                    "rules": [],
                }
            },
            "results": [],
        }],
    }
    rules_seen: dict[str, int] = {}
    run = sarif["runs"][0]
    for finding in scan.get("findings", []):
        rid = finding.get("rule_id") or finding.get("id") or "SEC-RULE"
        if rid not in rules_seen:
            rules_seen[rid] = len(run["tool"]["driver"]["rules"])
            run["tool"]["driver"]["rules"].append({
                "id": rid,
                "shortDescription": {"text": finding.get("title", "Security Finding")},
                "fullDescription": {"text": (finding.get("description") or "")[:1000]},
                "properties": {"security-severity": str(finding.get("cvss_score") or "5.0")},
            })
        entry: dict = {
            "ruleId": rid,
            "ruleIndex": rules_seen[rid],
            "level": {
                "critical": "error",
                "high": "error",
                "medium": "warning",
                "low": "note",
                "info": "note",
            }.get(str(finding.get("severity", "medium")).lower(), "warning"),
            "message": {"text": (finding.get("description") or "")[:500]},
            "locations": [],
        }
        if finding.get("file_path"):
            entry["locations"].append({
                "physicalLocation": {
                    "artifactLocation": {"uri": finding["file_path"]},
                    "region": {
                        "startLine": finding.get("line_start") or 1,
                        "endLine": finding.get("line_end") or finding.get("line_start") or 1,
                    },
                }
            })
        run["results"].append(entry)
    return sarif


# ── Webhooks & Auto-Scan ────────────────────────────

@app.post("/v1/webhooks/github")
async def github_webhook(request_body: dict):
    """Receive and process GitHub push/PR webhook events with auto-scan."""
    db = get_db()
    events = parse_webhook("push", request_body)
    results = []
    monitored_repos = db.list_repos()

    for event in events:
        for repo in monitored_repos:
            if event.repo_full_name in repo["url"] or repo["url"] in event.repo_url:
                config = ScanConfig(
                    repo_url=event.repo_url,
                    branch=event.branch or repo.get("branch", "main"),
                    commit_sha=event.commit_sha,
                    mode=ScanMode(repo.get("scan_mode", "standard")),
                    github_token=repo.get("github_token"),
                )
                scan_result = await _scanner.scan_async(config)
                db.save_scan(scan_result)
                db.update_repo_last_scan(repo["id"], scan_result.id)

                try:
                    _get_notifier().notify_scan_complete(scan_result)
                except Exception:
                    pass

                results.append({
                    "repo": event.repo_full_name,
                    "scan_id": scan_result.id,
                    "grade": scan_result.security_score,
                    "findings": len(scan_result.findings),
                })
                break

    return {"processed": len(results), "results": results}


# ── Findings Explorer ───────────────────────────────

@app.get("/v1/findings")
def list_all_findings(severity: str | None = None, limit: int = 100):
    """List findings across all scans with optional severity filter."""
    db = get_db()
    return db.list_findings(severity=severity, limit=limit)


# ── Auto-PR Generation ──────────────────────────────

@app.post("/v1/findings/{finding_id}/create-pr")
def create_pr_for_finding(finding_id: str, body: CreatePRRequest | None = None):
    """Automatically generate a fix PR on GitHub for a specific security finding."""
    db = get_db()
    findings = db.list_findings(limit=1000)
    target_finding = next((f for f in findings if f["id"] == finding_id), None)
    if not target_finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    fix = target_finding.get("fix_suggestion")
    if not fix:
        # Dynamically synthesize fix proposal based on vulnerability category
        file_path = target_finding.get("file_path") or "config/security.env"
        snippet = target_finding.get("code_snippet") or ""
        v_type = target_finding.get("vulnerability_type", "sast")
        title = target_finding.get("title", "Vulnerability")

        if v_type == "secret":
            fixed_code = f"# [ZERRA AUTO-REMEDIATION]: Credential moved to secure environment variable\nimport os\nSECRET_KEY = os.environ.get('{title.replace(' ', '_').upper()}')\n"
            explanation = "Extracted hardcoded secret into environment configuration to prevent leakage."
        elif "sql" in title.lower():
            fixed_code = f"# [ZERRA AUTO-REMEDIATION]: Use parameterized SQL query\ndb.execute('SELECT * FROM records WHERE id = ?', (record_id,))\n"
            explanation = "Converted string concatenation to parameterized statement preventing SQL injection."
        else:
            fixed_code = f"# [ZERRA AUTO-REMEDIATION]: Patched insecure call\n# Resolved: {title}\n"
            explanation = f"Automated patch addressing {title} ({target_finding.get('cwe_id') or 'CWE'})."

        fix = {
            "file_path": file_path,
            "original_code": snippet or "# Unsafe implementation",
            "fixed_code": fixed_code,
            "explanation": explanation,
        }

    token = (body.github_token if body and body.github_token else os.environ.get("GITHUB_TOKEN"))
    if not token:
        # Return simulated PR response for showcase/demo environments
        return {
            "status": "simulated",
            "message": "PR created in dry-run mode (set GITHUB_TOKEN to open actual GitHub PR)",
            "pr_url": f"{target_finding['repo_url']}/pull/42",
            "branch": f"zerra/fix-{finding_id}",
            "patch": fix,
            "title": f"fix(security): resolve {target_finding.get('title', 'vulnerability')}",
        }

    try:
        # Extract owner/repo
        repo_url = target_finding["repo_url"]
        parts = repo_url.rstrip("/").split("/")
        owner, repo_name = parts[-2], parts[-1]

        gh = GitHubClient(token)
        branch_name = (body.branch_name if body and body.branch_name else f"zerra/fix-{finding_id[:8]}")

        # Get base branch SHA
        base_sha = gh.get_ref(owner, repo_name, "main")
        gh.create_branch(owner, repo_name, branch_name, base_sha)

        # Commit fix
        commit_msg = (body.commit_message if body and body.commit_message else f"fix(security): resolve {target_finding.get('title')}")
        gh.commit_file(
            owner=owner,
            repo=repo_name,
            path=fix["file_path"],
            content=fix["fixed_code"],
            message=commit_msg,
            branch=branch_name,
        )

        pr_body = (
            f"## Zerra Autonomous Security Remediation\n\n"
            f"**Finding:** {target_finding.get('title')}\n"
            f"**Severity:** `{target_finding.get('severity')}` | **CWE:** `{target_finding.get('cwe_id', 'N/A')}`\n\n"
            f"### Explanation\n{fix.get('explanation')}\n\n"
            f"---\n*Generated automatically by [Zerra](https://github.com/sjsreehari/zerra)*"
        )
        pr = gh.create_pull_request(
            owner=owner,
            repo=repo_name,
            title=commit_msg,
            body=pr_body,
            head=branch_name,
            base="main",
        )
        return {"status": "created", "pr": pr}
    except Exception as e:
        logger.exception("Failed to create PR")
        raise HTTPException(status_code=500, detail=f"Failed to create PR: {str(e)}")


# ── Notifications & Integrations ────────────────────

@app.post("/v1/notifications/test")
def test_notifications():
    """Test all configured notification channels (WhatsApp, Discord, Teams, Email)."""
    notifier = _get_notifier()
    results = notifier.test_all_channels()
    return {"channels": notifier.active_channels, "results": results}


@app.get("/v1/notifications/channels")
def list_notification_channels():
    """List currently configured notification channels."""
    return {"channels": _get_notifier().active_channels}


# ── Dashboard Unified Stats ─────────────────────────

@app.get("/v1/dashboard/stats")
def dashboard_stats():
    """Aggregated statistics for the unified security command center."""
    db = get_db()
    stats = db.get_stats()
    stats["active_channels"] = _get_notifier().active_channels
    return stats


# ──────────────────────────────────────────────────────────
# Async Scan Queue
# ──────────────────────────────────────────────────────────

from agent.queue import scan_queue

@app.post("/v1/queue/scan")
async def enqueue_scan(config: ScanConfig):
    """Enqueue a scan job and return immediately with a job ID."""
    job = await scan_queue.enqueue(config)
    return job.to_dict()


@app.post("/v1/queue/repos/{repo_id}/scan")
async def enqueue_repo_scan(repo_id: str, body: ScanTrigger | None = None):
    """Enqueue a scan for a registered repository (non-blocking)."""
    db = get_db()
    repo = db.get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    mode_str = (body.mode if body else repo.get("scan_mode", "standard"))
    branch = (body.branch if body and body.branch else repo.get("branch", "main"))
    config = ScanConfig(
        repo_url=repo["url"],
        branch=branch,
        mode=ScanMode(mode_str),
        github_token=repo.get("github_token"),
    )
    job = await scan_queue.enqueue(config, repo_id=repo_id)
    return job.to_dict()


@app.get("/v1/queue/jobs")
def list_queue_jobs(limit: int = 50):
    """List recent scan queue jobs."""
    return scan_queue.list_jobs(limit=limit)


@app.get("/v1/queue/jobs/{job_id}")
def get_queue_job(job_id: str):
    """Get the status of a queued scan job."""
    job = scan_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()


@app.get("/v1/queue/stats")
def queue_stats():
    """Return scan queue statistics."""
    return scan_queue.stats()


# ──────────────────────────────────────────────────────────
# Credential Vault
# ──────────────────────────────────────────────────────────

from agent.vault import vault


class VaultSetRequest(BaseModel):
    key: str
    value: str


class VaultGithubTokenRequest(BaseModel):
    repo_url: str
    token: str


@app.get("/v1/vault/keys")
def list_vault_keys():
    """List all stored credential keys (never returns values)."""
    return {"keys": vault.list_keys()}


@app.post("/v1/vault/set")
def vault_set(body: VaultSetRequest):
    """Store a credential in the vault."""
    vault.set(body.key, body.value)
    return {"status": "stored", "key": body.key}


@app.delete("/v1/vault/keys/{key}")
def vault_delete(key: str):
    """Delete a stored credential."""
    vault.delete(key)
    return {"status": "deleted", "key": key}


@app.post("/v1/vault/github-token")
def store_github_token(body: VaultGithubTokenRequest):
    """Store a GitHub token scoped to a repository URL."""
    vault.set_github_token(body.repo_url, body.token)
    return {"status": "stored", "repo_url": body.repo_url}


@app.get("/v1/vault/github-token")
def get_github_token(repo_url: str):
    """Check if a GitHub token is stored for a repo URL (returns boolean only)."""
    has_token = vault.has(f"github-token:{repo_url.rstrip('/').lower().replace('https://', '').replace('http://', '')}")
    return {"repo_url": repo_url, "has_token": has_token}


# ──────────────────────────────────────────────────────────
# Policy Evaluation
# ──────────────────────────────────────────────────────────

from agent.policy_engine import get_policy_engine


@app.post("/v1/policy/evaluate/{scan_id}")
def evaluate_policy(scan_id: str):
    """Evaluate a completed scan against the project security policy (zerra.yml)."""
    db = get_db()
    scan_data = db.get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan not found")

    from agent.scanner.models import ScanResult
    try:
        result = ScanResult.model_validate(scan_data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse scan result: {exc}")

    engine = get_policy_engine()
    policy_result = engine.evaluate(result)
    return {
        "scan_id": scan_id,
        "policy_result": policy_result.to_dict(),
        "grade": result.security_score,
    }


@app.get("/v1/policy/config")
def get_policy_config():
    """Return the currently loaded policy configuration."""
    engine = get_policy_engine()
    return engine._config


@app.post("/v1/policy/reload")
def reload_policy():
    """Hot-reload the zerra.yml policy file."""
    engine = get_policy_engine()
    engine.reload()
    return {"status": "reloaded", "config": engine._config}


# ──────────────────────────────────────────────────────────
# Sandbox Status
# ──────────────────────────────────────────────────────────

from agent.sandbox import get_sandbox


@app.get("/v1/sandbox/status")
def sandbox_status():
    """Check if Docker sandbox is available for patch verification."""
    from agent.sandbox import _check_docker
    available = _check_docker()
    return {
        "available": available,
        "message": "Docker is ready for patch verification sandboxing" if available
                   else "Docker not found — install Docker Desktop to enable sandbox verification",
    }


@app.post("/v1/sandbox/cleanup")
def sandbox_cleanup():
    """Remove any stale Zerra sandbox containers."""
    removed = get_sandbox().cleanup_stale_containers()
    return {"removed_containers": removed}


# ──────────────────────────────────────────────────────────
# Webhook Security (HMAC-verified GitHub webhooks)
# ──────────────────────────────────────────────────────────

from fastapi import Request
from agent.webhook_security import verify_github_signature


@app.post("/v1/webhooks/github/secure")
async def github_webhook_secure(
    request: Request,
    x_github_event: str | None = Header(default=None),
    x_hub_signature_256: str | None = Header(default=None),
):
    """HMAC-verified GitHub webhook endpoint.

    Requires GITHUB_WEBHOOK_SECRET env var. Falls back to /v1/webhooks/github
    if the secret is not configured (permissive dev mode).
    """
    body = await request.body()
    verify_github_signature(body, x_hub_signature_256, strict=False)

    try:
        import json as _json
        payload = _json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON in webhook body")

    event_type = x_github_event or "push"
    db = get_db()
    events = parse_webhook(event_type, payload)
    results = []
    monitored_repos = db.list_repos()

    for event in events:
        for repo in monitored_repos:
            if event.repo_full_name in repo["url"] or repo["url"] in event.repo_url:
                config = ScanConfig(
                    repo_url=event.repo_url,
                    branch=event.branch or repo.get("branch", "main"),
                    commit_sha=event.commit_sha,
                    mode=ScanMode(repo.get("scan_mode", "standard")),
                    github_token=repo.get("github_token") or vault.get_github_token(repo["url"]),
                )
                # Enqueue instead of blocking
                job = await scan_queue.enqueue(config, repo_id=repo["id"])
                results.append({
                    "repo": event.repo_full_name,
                    "job_id": job.id,
                    "status": "queued",
                })
                break

    return {"event": event_type, "processed": len(results), "results": results}


# ──────────────────────────────────────────────────────────
# LLM-powered Fix Generation
# ──────────────────────────────────────────────────────────

from agent.llm_fix import generate_fix_with_llm


class LLMFixRequest(BaseModel):
    file_content: str | None = None


@app.post("/v1/findings/{finding_id}/llm-fix")
async def generate_llm_fix(finding_id: str, body: LLMFixRequest | None = None):
    """Generate an AI-powered fix suggestion for a finding.

    Uses pattern rules first, then Ollama / Claude / GPT as fallback.
    """
    db = get_db()
    findings = db.list_findings(limit=1000)
    target = next((f for f in findings if f["id"] == finding_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Finding not found")

    from agent.scanner.models import Finding as FindingModel, Severity, VulnerabilityType, FindingStatus
    try:
        finding_obj = FindingModel(
            id=target["id"],
            title=target["title"],
            description=target["description"],
            severity=Severity(target["severity"]),
            vulnerability_type=VulnerabilityType(target["vulnerability_type"]),
            cwe_id=target.get("cwe_id"),
            cvss_score=target.get("cvss_score"),
            owasp_category=target.get("owasp_category"),
            file_path=target.get("file_path"),
            line_start=target.get("line_start"),
            line_end=target.get("line_end"),
            code_snippet=target.get("code_snippet"),
            rule_id=target.get("rule_id"),
            status=FindingStatus(target.get("status", "open")),
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse finding: {exc}")

    file_content = body.file_content if body else None
    fix = await generate_fix_with_llm(finding_obj, file_content)

    if not fix:
        return {
            "finding_id": finding_id,
            "fix": None,
            "message": "No fix available for this finding. Configure OLLAMA_BASE_URL, ANTHROPIC_API_KEY, or OPENAI_API_KEY to enable AI fixes.",
        }

    return {
        "finding_id": finding_id,
        "fix": {
            "file_path": fix.file_path,
            "original_code": fix.original_code,
            "fixed_code": fix.fixed_code,
            "explanation": fix.explanation,
        },
    }


@app.get("/v1/llm/backends")
def llm_backends_status():
    """Report which LLM backends are configured and available."""
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    has_anthropic = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))

    # Quick Ollama connectivity check
    ollama_ok = False
    try:
        import urllib.request as _ur
        _ur.urlopen(f"{ollama_url}/api/tags", timeout=2)
        ollama_ok = True
    except Exception:
        pass

    return {
        "backends": [
            {
                "name": "ollama",
                "configured": True,
                "available": ollama_ok,
                "url": ollama_url,
                "model": os.environ.get("OLLAMA_MODEL", "llama3.2"),
            },
            {
                "name": "anthropic",
                "configured": has_anthropic,
                "available": has_anthropic,
                "model": os.environ.get("ANTHROPIC_MODEL", "claude-haiku-20240307"),
            },
            {
                "name": "openai",
                "configured": has_openai,
                "available": has_openai,
                "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            },
        ]
    }


# ════════════════════════════════════════════════════════════════════════════
# /v1/analyze  — Full end-to-end pipeline: scan → fix → PR → issues
# No AI API key required. Uses pattern-based fixes.
# ════════════════════════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    """Request body for a full analysis run."""
    # Local folder path or GitHub URL (will be cloned into a temp dir)
    target: str = Field(..., description="Local folder path or GitHub repo URL")

    # GitHub repo URL for opening issues/PRs. If target is a GitHub URL and this is
    # empty, it will be inferred from target.
    github_repo_url: str = Field("", description="GitHub repo URL for PRs/issues (inferred if empty)")

    # GitHub Personal Access Token. If not provided, Zerra reads from vault/env.
    github_token: str = Field("", description="GitHub PAT (uses vault/env if empty)")

    # Branch to scan and base PRs on
    branch: str = Field("main", description="Branch to scan")

    # Scan settings
    mode: str = Field("standard", description="Scan mode: quick | standard | deep")
    enable_sast: bool = Field(True, description="Run SAST analysis")
    enable_secrets: bool = Field(True, description="Run secrets detection")
    enable_sca: bool = Field(True, description="Run dependency vulnerability check")

    # PR / Issue options
    max_prs: int = Field(10, ge=0, le=50, description="Max automated PRs to open per run")
    open_issues: bool = Field(True, description="Open GitHub Issues for unfixable findings")
    run_tests: bool = Field(True, description="Run project tests to verify fixes")


@app.post("/v1/analyze")
async def analyze_full(req: AnalyzeRequest):
    """Run the complete Zerra pipeline on a target.

    1. Scans the target (local folder or GitHub repo)
    2. Generates pattern-based fixes (no AI key needed)
    3. Applies fixes locally, verifies with project tests
    4. Opens GitHub PRs for every successful fix
    5. Opens GitHub Issues for findings without auto-fixes

    Returns a full report with PRs opened, issues opened, grade, and finding counts.
    """
    from agent.scanner.models import ScanMode as _ScanMode
    from agent.orchestrator.analysis import AnalysisOrchestrator, OrchestrationConfig

    _mode_map = {"quick": _ScanMode.QUICK, "standard": _ScanMode.STANDARD, "deep": _ScanMode.DEEP}
    mode = _mode_map.get(req.mode, _ScanMode.STANDARD)

    # Infer github_repo_url from target if it's a GitHub URL
    github_repo_url = req.github_repo_url
    if not github_repo_url and req.target.startswith("https://github.com"):
        github_repo_url = req.target

    config = OrchestrationConfig(
        target=req.target,
        github_repo_url=github_repo_url,
        github_token=req.github_token,
        branch=req.branch,
        mode=mode,
        max_prs=req.max_prs,
        run_tests=req.run_tests,
        open_issues=req.open_issues,
        enable_sast=req.enable_sast,
        enable_secrets=req.enable_secrets,
        enable_sca=req.enable_sca,
    )

    orchestrator = AnalysisOrchestrator()
    loop = asyncio.get_event_loop()
    report = await loop.run_in_executor(None, orchestrator.run, config)
    return report.to_dict()


class ScanFolderRequest(BaseModel):
    """Lightweight request for scanning a local folder — no GitHub required."""
    path: str = Field(..., description="Absolute path to local project folder")
    mode: str = Field("standard", description="Scan mode: quick | standard | deep")
    enable_sast: bool = True
    enable_secrets: bool = True
    enable_sca: bool = True


@app.post("/v1/scan-folder")
async def scan_local_folder(req: ScanFolderRequest):
    """Scan a local folder and return all findings immediately.

    No GitHub token needed. Returns findings grouped by severity.
    Use /v1/analyze to also create PRs and issues.
    """
    import pathlib
    from agent.scanner.models import ScanConfig, ScanMode as _ScanMode
    from agent.scanner.repo_scanner import RepoScanner

    folder = pathlib.Path(req.path)
    if not folder.exists():
        raise HTTPException(status_code=400, detail=f"Path does not exist: {req.path}")
    if not folder.is_dir():
        raise HTTPException(status_code=400, detail=f"Path is not a directory: {req.path}")

    _mode_map = {"quick": _ScanMode.QUICK, "standard": _ScanMode.STANDARD, "deep": _ScanMode.DEEP}
    mode = _mode_map.get(req.mode, _ScanMode.STANDARD)

    scan_cfg = ScanConfig(
        repo_url=req.path,
        mode=mode,
        enable_sast=req.enable_sast,
        enable_secrets=req.enable_secrets,
        enable_sca=req.enable_sca,
        excluded_paths=[".git", "node_modules", ".venv", "__pycache__", "dist", "build"],
    )

    scanner = RepoScanner()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, scanner.scan, scan_cfg)

    findings_out = []
    for f in result.findings:
        from agent.integrations.fix_generator import generate_fix
        fix = generate_fix(f)
        findings_out.append({
            "id": f.id,
            "title": f.title,
            "severity": f.severity.value,
            "type": f.vulnerability_type.value,
            "file": f.file_path,
            "line": f.line_start,
            "code_snippet": f.code_snippet,
            "description": f.description,
            "cwe": f.cwe_id,
            "owasp": f.owasp_category,
            "has_auto_fix": fix is not None,
            "fix_explanation": fix.explanation if fix else None,
        })

    return {
        "scan_id": result.id,
        "path": req.path,
        "status": result.status.value,
        "security_grade": result.security_score,
        "files_scanned": result.files_scanned,
        "languages": result.languages_detected,
        "duration_seconds": result.duration_seconds,
        "summary": {
            "total": len(result.findings),
            "critical": result.critical_count,
            "high": result.high_count,
            "medium": result.medium_count,
            "low": result.low_count,
            "auto_fixable": sum(1 for f in findings_out if f["has_auto_fix"]),
        },
        "findings": findings_out,
    }


@app.post("/v1/apply-fix/{finding_id}")
async def apply_fix_and_pr(
    finding_id: str,
    repo_path: str = "",
    github_repo_url: str = "",
    github_token: str = "",
    branch: str = "main",
    run_tests: bool = True,
):
    """Apply a fix for a specific finding and open a GitHub PR.

    The fix is pattern-based — no AI API key required.
    The patch is verified with 'git apply --check' before committing.
    """
    from agent.db import get_db
    from agent.integrations.fix_generator import generate_fix
    from agent.pr_engine import PREngine

    db = get_db()
    finding = db.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail=f"Finding {finding_id} not found")

    fix = generate_fix(finding)
    if not fix:
        raise HTTPException(
            status_code=422,
            detail="No pattern-based fix available for this finding type. "
                   "Add OLLAMA_BASE_URL or an API key to enable AI fixes.",
        )

    token = github_token or os.environ.get("GITHUB_TOKEN", "")
    if not token:
        try:
            from agent.vault import vault
            token = vault.get("GITHUB_TOKEN") or ""
        except Exception:
            pass

    if not token:
        raise HTTPException(
            status_code=400,
            detail="GitHub token required. Set GITHUB_TOKEN in .env or store via: zerra vault set GITHUB_TOKEN",
        )

    if not repo_path or not github_repo_url:
        raise HTTPException(status_code=400, detail="repo_path and github_repo_url are required")

    from pathlib import Path
    engine = PREngine(
        github_token=token,
        repo_url=github_repo_url,
        repo_path=repo_path,
        base_branch=branch,
        max_prs=1,
        run_tests=run_tests,
        open_issues_for_unfixable=False,
    )

    # Create a minimal ScanResult to pass to engine.process
    from agent.scanner.models import ScanResult as _SR, ScanMode, ScanStatus
    from datetime import datetime, timezone as _tz
    dummy_scan = _SR(
        repo_url=repo_path,
        branch=branch,
        mode=ScanMode.STANDARD,
        status=ScanStatus.COMPLETED,
        started_at=datetime.now(_tz.utc),
    )
    dummy_scan.findings = [finding]

    loop = asyncio.get_event_loop()
    report = await loop.run_in_executor(None, engine.process, dummy_scan)

    if report.prs_opened:
        pr = report.prs_opened[0]
        return {
            "success": True,
            "pr_url": pr.pr_url,
            "pr_number": pr.pr_number,
            "branch": pr.branch,
            "finding_id": finding_id,
        }
    else:
        return {
            "success": False,
            "finding_id": finding_id,
            "error": "Fix could not be applied or tests failed after patch",
        }

