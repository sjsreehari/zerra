"""Evidence rendering. Templates only: statements always derive from signal metadata."""

from .models import SignalResult


def build_evidence(identity_id: str, signals: list[SignalResult]) -> str:
    by_name = {signal.name: signal for signal in signals}
    fanout = by_name["fanout"]
    novelty = by_name["novelty"]
    blast = by_name["blast_radius"]
    fanout_data = fanout.metadata
    phrases: list[str] = []
    if fanout_data["distinct_novel_objects"]:
        phrases.append(
            f"Identity `{identity_id}` touched {fanout_data['distinct_novel_objects']} distinct previously unseen objects "
            f"in {fanout_data['window_seconds']:.0f} seconds ({fanout.raw_value * 60:.1f}/min)."
        )
    if fanout.fired:
        call_number = fanout_data.get("first_fired_call")
        suffix = f" on call {call_number}" if call_number else ""
        phrases.append(f"Fan-out threshold fired{suffix}.")
    elif novelty.score:
        phrases.append("The current object edge is new for this identity.")
    else:
        phrases.append("Activity remains within the current behavioral baseline.")
    cross_tenants = blast.metadata["cross_tenant_ids"]
    if cross_tenants:
        phrases.append(f"Cross-tenant reach includes: {', '.join(cross_tenants)}.")
    else:
        phrases.append("No cross-tenant reach detected.")
    return " ".join(phrases)
