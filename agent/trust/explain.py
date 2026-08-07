from .models import FactorBreakdown


def build_evidence_string(factors: list[FactorBreakdown], zone_changed: bool, verdict: str) -> str:
    top = sorted(factors, key=lambda factor: factor.contribution, reverse=True)[:2]
    reasons = [f"{factor.name.replace('_', ' ')} ({factor.raw_value:.2f})" for factor in top if factor.contribution > 0.02]
    if not reasons:
        return "No significant risk factors — routine activity."
    prefix = {"block": "Blocked", "step_up": "Step-up required", "allow": "Allowed"}[verdict]
    return f"{prefix} — driven primarily by {' and '.join(reasons)}."
