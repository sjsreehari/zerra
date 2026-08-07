"""Deterministic, inspectable signal combination."""

from .config import GraphConfig
from .models import SignalResult


def combine(signals: list[SignalResult], config: GraphConfig) -> float:
    """Combine normalized signals using the configured transparent weighted sum."""
    score = sum(signal.score * config.weights.get(signal.name, 0.0) for signal in signals)
    return round(max(0.0, min(1.0, score)), 6)
