"""Per-identity baseline state.  It is intentionally kept outside graph topology."""

from collections import defaultdict
from dataclasses import dataclass, field
from math import sqrt


@dataclass
class IdentityBaseline:
    call_count: int = 0
    ema_calls_per_min: float = 0.0
    velocity_mean: float = 0.0
    velocity_m2: float = 0.0
    velocity_samples: int = 0
    known_object_ids: dict[str, set[str]] = field(default_factory=lambda: defaultdict(set))
    known_endpoints: set[str] = field(default_factory=set)

    @property
    def velocity_stddev(self) -> float:
        return sqrt(self.velocity_m2 / (self.velocity_samples - 1)) if self.velocity_samples > 1 else 0.0

    def observe_velocity(self, velocity: float) -> None:
        self.velocity_samples += 1
        delta = velocity - self.velocity_mean
        self.velocity_mean += delta / self.velocity_samples
        self.velocity_m2 += delta * (velocity - self.velocity_mean)
