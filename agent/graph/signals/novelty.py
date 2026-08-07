"""Single-edge first-seen detection."""

from ..models import SignalResult


def calculate_novelty(*, is_novel: bool, warm_up_complete: bool) -> SignalResult:
    """Novelty is a supporting signal; it is suppressed while an identity warms up."""
    score = 1.0 if is_novel and warm_up_complete else 0.0
    return SignalResult(name="novelty", score=score, raw_value=float(is_novel), threshold=1.0, fired=bool(score), metadata={"warm_up_complete": warm_up_complete})
