"""Local FastAPI inference and protected-demo service for SENTRA."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent.contracts import CallEvent, DecisionResponse, IdentityType
from agent.main import create_demo_engine
from agent.mock_data import AccessDeniedError, MockDataStore

app = FastAPI(title="SENTRA Inference API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
engine, metrics = create_demo_engine()
data = MockDataStore()
risk_cards = []


def evaluate(event: CallEvent) -> DecisionResponse:
    decision = engine.evaluate(event)
    metrics.record(decision=decision, latency_ms=0.0)
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
