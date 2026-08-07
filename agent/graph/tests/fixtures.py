from datetime import UTC, datetime, timedelta


def normal_session(identity_id: str = "user-1", n_calls: int = 20) -> list[dict]:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    return [{"call_id": f"normal-{index}", "identity_id": identity_id, "object_id": f"inv-{index % 3}", "object_type": "invoice", "endpoint": "/invoices", "tenant_id": "tenant-a", "home_tenant_id": "tenant-a", "timestamp": start + timedelta(seconds=index * 8)} for index in range(n_calls)]


def enumeration_attack(identity_id: str = "attacker", n_calls: int = 10) -> list[dict]:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    return [{"call_id": f"attack-{index}", "identity_id": identity_id, "object_id": f"inv-{index}", "object_type": "invoice", "endpoint": "/invoices/{id}", "tenant_id": "tenant-a" if index < 3 else "tenant-b", "home_tenant_id": "tenant-a", "timestamp": start + timedelta(seconds=index * 2)} for index in range(n_calls)]
