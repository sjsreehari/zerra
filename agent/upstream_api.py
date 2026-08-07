"""Private mock API used only behind the Go gateway in the Compose demo."""

from fastapi import FastAPI, HTTPException

from agent.mock_data import MockDataStore

app = FastAPI(title="SENTRA Protected Upstream")
data = MockDataStore()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "protected-upstream-active"}


@app.get("/invoices/{invoice_id}")
def invoice(invoice_id: str):
    metadata = data.get_invoice_metadata(invoice_id)
    if metadata is None:
        raise HTTPException(404, "invoice not found")
    # This service has no public port in Docker Compose. Authorization is enforced
    # by the SENTRA Go gateway before this private upstream is reached.
    return data._invoices[invoice_id]


@app.get("/users/{user_id}")
def user(user_id: str):
    return {"id": user_id, "name": "Demo User", "tenant_id": "tenant-a"}


@app.get("/admin/export")
def export():
    return {"records": [], "status": "export-ready"}
