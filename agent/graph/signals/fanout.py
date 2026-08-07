"""Novel-object fan-out velocity detection."""

from ..config import GraphConfig
from ..models import SignalResult


def calculate_fanout(*, novel_objects: int, duration_seconds: float, baseline_mean: float, baseline_stddev: float, warm_up_complete: bool, config: GraphConfig, first_fired_call: int | None = None) -> SignalResult:
    duration = max(duration_seconds, 1.0)
    velocity = novel_objects / duration
    if warm_up_complete:
        threshold = max((baseline_mean + config.fanout_stddev_multiplier * baseline_stddev) / 60.0, 1.0 / config.fanout_window_seconds)
        score = max(0.0, min(1.0, (velocity - threshold) / max(threshold, 1e-9)))
        fired = velocity > threshold
    else:
        threshold = float(config.fanout_absolute_fallback)
        score = min(1.0, novel_objects / threshold)
        fired = novel_objects >= threshold
    return SignalResult(name="fanout", score=score, raw_value=velocity, threshold=threshold, fired=fired, metadata={"distinct_novel_objects": novel_objects, "window_seconds": duration, "first_fired_call": first_fired_call})
