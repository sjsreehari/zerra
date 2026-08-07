"""Continuous edge decay for the dynamic intent graph."""

from datetime import datetime
from math import exp, log


def decayed_weight(weight: float, last_seen: datetime, now: datetime, half_life_seconds: int) -> float:
    """Return ``weight * exp(-lambda * elapsed)`` without mutating graph state."""
    elapsed = max(0.0, (now - last_seen).total_seconds())
    return weight * exp(-(log(2) / half_life_seconds) * elapsed)
