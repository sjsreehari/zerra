"""Local FastAPI inference and protected-demo service for SENTRA."""

from datetime import datetime, timezone
from uuid import uuid4

import time
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from agent.contracts import CallEvent, DecisionResponse, IdentityType
from agent.agents import ThreatHunter
from agent.attack_sim import AttackSimulator, fast_invoice_enumeration, normal_repeating_user_traffic
from agent.main import create_demo_engine
from agent.mock_data import AccessDeniedError, MockDataStore
from agent.policy_recommendations import PolicyRecommendationService
from agent.reports import render_markdown

app = FastAPI(title="SENTRA Inference API", version="0.1.0")
app.add_middleware(CORSMiddleware, 
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
engine, metrics = create_demo_engine()
data = MockDataStore()
risk_cards = []
investigations = {}
recommendations = {}
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
