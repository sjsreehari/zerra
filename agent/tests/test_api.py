from fastapi.testclient import TestClient

from agent.api import app


def test_inference_service_lists_identities_and_protects_invoice() -> None:
    client = TestClient(app)
    assert client.get("/health").json() == {"status": "active"}
    assert len(client.get("/v1/identities").json()) == 4
    response = client.get("/demo/invoices/inv-a-001", headers={"Authorization": "Bearer demo-human-token"})
    assert response.status_code == 200
    assert response.json()["decision"]["verdict"] == "allow"


def test_revoked_identity_is_denied_by_protected_api() -> None:
    client = TestClient(app)
    client.post("/v1/identities/finance-agent/revoke")
    response = client.get("/demo/invoices/inv-a-001", headers={"Authorization": "Bearer demo-finance-agent-token"})
    assert response.status_code == 401
    client.post("/v1/identities/finance-agent/restore")
