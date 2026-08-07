from .config import SENSITIVE_FIELD_WEIGHT, WEIGHTS
from .inputs import TrustScoreInputs
from .models import FactorBreakdown


def sensitivity_touched_score(fields: list[str], weight_map: dict[str, float] = SENSITIVE_FIELD_WEIGHT) -> float:
    """Compute field sensitivity with a small multi-field fan-out penalty."""
    if not fields:
        return 0.0
    scores = [weight_map.get(field, weight_map["default"]) for field in fields]
    return min(1.0, sum(scores) / len(scores) + 0.1 * (len(scores) - 1))


def compute_weighted_badness(inputs: TrustScoreInputs) -> tuple[float, list[FactorBreakdown]]:
    raw_values = {
        "graph_risk": inputs.graph_risk_score,
        "sequence_risk": inputs.sequence_risk_score,
        "auth_weakness": 1.0 - inputs.auth_strength,
        "sensitivity_touched": sensitivity_touched_score(inputs.sensitive_fields_touched),
    }
    sources = {"graph_risk": "graph", "sequence_risk": "sequence"}
    factors = [
        FactorBreakdown(
            name=name,
            raw_value=value,
            weight=WEIGHTS[name],
            contribution=value * WEIGHTS[name],
            source_module=sources.get(name, "gateway"),
        )
        for name, value in raw_values.items()
    ]
    return sum(factor.contribution for factor in factors), factors
