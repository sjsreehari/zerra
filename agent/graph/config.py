"""Configuration for the intent graph. Keep every scoring knob here."""

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GraphConfig(BaseModel):
    """Safe defaults for real-time, explainable enumeration detection."""

    model_config = ConfigDict(frozen=True)

    warm_up_calls: int = Field(default=5, ge=0, description="Calls required before identity-specific baselines are trusted.")
    fanout_window_seconds: int = Field(default=60, gt=0, description="Rolling time window used for fan-out velocity.")
    fanout_window_calls: int = Field(default=10, gt=0, description="Maximum recent calls examined for fan-out.")
    fanout_stddev_multiplier: float = Field(default=2.5, ge=0, description="Baseline standard-deviation allowance before fan-out fires.")
    fanout_absolute_fallback: int = Field(default=6, gt=0, description="Novel objects that constitute high fan-out during warm-up.")
    blast_radius_alarm_threshold: int = Field(default=2, gt=0, description="Cross-tenant objects needed for maximum blast-radius risk.")
    edge_half_life_seconds: int = Field(default=300, gt=0, description="Elapsed time for an inactive edge's weight to halve.")
    prune_epsilon: float = Field(default=0.01, gt=0, lt=1, description="Decayed edges below this weight are removed.")
    decay_interval_seconds: int = Field(default=10, gt=0, description="Minimum interval between full graph decay sweeps.")
    risk_alert_threshold: float = Field(default=0.5, ge=0, le=1, description="Suggested score threshold for an upstream block or step-up decision.")
    weights: dict[str, float] = Field(
        default_factory=lambda: {"fanout": 0.50, "novelty": 0.15, "blast_radius": 0.35},
        description="Transparent weighted-sum contribution for each signal.",
    )

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, weights: dict[str, float]) -> dict[str, float]:
        required = {"fanout", "novelty", "blast_radius"}
        if set(weights) != required:
            raise ValueError(f"weights must contain exactly: {', '.join(sorted(required))}")
        if any(value < 0 for value in weights.values()):
            raise ValueError("weights cannot be negative")
        if sum(weights.values()) <= 0:
            raise ValueError("at least one signal weight must be positive")
        return weights
