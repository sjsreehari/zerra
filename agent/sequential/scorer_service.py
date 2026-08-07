"""Public entry point. Called once per logged incoming CallEvent."""

from time import perf_counter

from .config import USE_ML_SCORER
from .ensemble import combine
from .feature_extractor import extract_features
from .metrics import SequenceMetrics
from .ml_scorer import score_features
from .models import CallEvent, SequenceRiskScore, utc_now
from .state_machine_scorer import StateMachineScorer
from .window_manager import WindowManager

_windows = WindowManager()
_scorer = StateMachineScorer()
metrics = SequenceMetrics()


def score(event: CallEvent) -> SequenceRiskScore:
    """Score one event in under 5ms in normal demo use; never makes I/O calls."""
    started = perf_counter()
    window = _windows.add(event)
    features = extract_features(window)
    match = _scorer.score(window, features)
    risk = combine(match, score_features(features) if USE_ML_SCORER else None)
    latency_ms = (perf_counter() - started) * 1000
    metrics.record(latency_ms, match.pattern_name if match else None)
    snapshot = {**features, "matched_at_call_index": match.matched_at_call_index if match else None}
    return SequenceRiskScore(event.identity_id, risk, match, snapshot, utc_now(), latency_ms)


def reset_for_tests() -> None:
    _windows.clear()
