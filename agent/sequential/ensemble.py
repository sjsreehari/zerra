from typing import Optional

from .models import PatternMatch


def combine(state_match: Optional[PatternMatch], ml_score: Optional[float] = None) -> float:
    """Use max, not average: missed attacks matter more than noisy alerts in this demo."""
    values = [0.0]
    if state_match:
        values.append(state_match.confidence)
    if ml_score is not None:
        values.append(ml_score)
    return max(values)
