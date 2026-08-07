"""All tuning knobs for the trust score engine."""

WEIGHTS = {
    "graph_risk": 0.35,
    "sequence_risk": 0.35,
    "auth_weakness": 0.15,
    "sensitivity_touched": 0.15,
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9, "Trust-score weights must sum to 1.0"

# Bad evidence is incorporated quickly; good evidence must be sustained.
EWMA_ALPHA_DEGRADE = 0.55
EWMA_ALPHA_RECOVER = 0.12

WARM_UP_CALLS = 8
WARM_UP_SCORE_FLOOR = 40.0

ZONE_THRESHOLDS = {
    "green_to_yellow": 70.0,
    "yellow_to_green": 78.0,
    "yellow_to_red": 40.0,
    "red_to_yellow": 50.0,
}
CONSECUTIVE_CALLS_TO_CONFIRM_ZONE_EXIT = 2

SENSITIVE_FIELD_WEIGHT = {
    "ssn": 1.0,
    "salary": 0.8,
    "internal_notes": 0.5,
    "default": 0.1,
}
