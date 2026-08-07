"""Protected multi-tenant fake data, available only after an ALLOW decision."""

from dataclasses import dataclass

from agent.contracts import DecisionResponse, Verdict


class AccessDeniedError(PermissionError):
    pass


@dataclass(frozen=True)
class Tenant:
    id: str
    name: str


@dataclass(frozen=True)
class Invoice:
    id: str
    tenant_id: str
    customer_name: str
    amount: float
    status: str
    ssn: str
    salary: float
    internal_notes: str


@dataclass(frozen=True)
class ObjectMetadata:
    object_id: str
    object_type: str
    tenant_id: str
    sensitive_fields: list[str]


class MockDataStore:
    def __init__(self) -> None:
        self.tenants = [Tenant("tenant-a", "Acme Finance"), Tenant("tenant-b", "Beacon Retail"), Tenant("tenant-c", "Cedar Health")]
        self._invoices = {invoice.id: invoice for invoice in self._seed_invoices()}

    def get_invoice_metadata(self, invoice_id: str) -> ObjectMetadata | None:
        invoice = self._invoices.get(invoice_id)
        return ObjectMetadata(invoice.id, "invoice", invoice.tenant_id, ["ssn", "salary", "internal_notes"]) if invoice else None

    def get_invoice(self, invoice_id: str, decision: DecisionResponse) -> Invoice:
        self._require_allow(decision)
        invoice = self._invoices.get(invoice_id)
        if invoice is None:
            raise KeyError(f"Unknown invoice: {invoice_id}")
        return invoice

    def list_invoices_for_tenant(self, tenant_id: str, decision: DecisionResponse) -> list[Invoice]:
        self._require_allow(decision)
        return [invoice for invoice in self._invoices.values() if invoice.tenant_id == tenant_id]

    @staticmethod
    def _require_allow(decision: DecisionResponse) -> None:
        if decision.verdict is not Verdict.ALLOW or not decision.allowed:
            raise AccessDeniedError("Protected records require an allow decision")

    @staticmethod
    def _seed_invoices() -> list[Invoice]:
        invoices: list[Invoice] = []
        for suffix, tenant in (("a", "tenant-a"), ("b", "tenant-b"), ("c", "tenant-c")):
            for number in range(1, 11):
                invoices.append(Invoice(f"inv-{suffix}-{number:03d}", tenant, f"Customer {suffix.upper()}{number}",
                                        1000.0 + number * 137.25, "paid" if number % 2 else "pending",
                                        f"123-45-{number:04d}", 50000.0 + number * 1200,
                                        f"Internal note for {tenant} invoice {number}"))
        return invoices
