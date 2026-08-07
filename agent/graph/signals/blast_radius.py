"""Current-window cross-tenant reachability detection."""

from ..config import GraphConfig
from ..models import SignalResult


def calculate_blast_radius(*, reachable_tenants: set[str], home_tenant_id: str | None, config: GraphConfig) -> SignalResult:
    cross_tenant = reachable_tenants - ({home_tenant_id} if home_tenant_id else set())
    count = len(cross_tenant)
    score = min(1.0, count / config.blast_radius_alarm_threshold)
    return SignalResult(name="blast_radius", score=score, raw_value=float(count), threshold=float(config.blast_radius_alarm_threshold), fired=count >= config.blast_radius_alarm_threshold, metadata={"cross_tenant_ids": sorted(cross_tenant), "home_tenant_id": home_tenant_id})
