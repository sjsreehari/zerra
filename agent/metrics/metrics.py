"""In-memory demo scoreboard. Detection rate is detected malicious calls / labeled malicious calls."""

from math import ceil

from pydantic import BaseModel, Field

from agent.contracts import DecisionResponse, Verdict


class MetricsSnapshot(BaseModel):
    requests_scored: int
    attacks_detected: int
    false_positives: int
    p95_latency_ms: float
    blocked_count: int
    step_up_count: int
    allowed_count: int
    first_flagged_call_by_scenario: dict[str, int] = Field(default_factory=dict)
    detection_rate: float | None
    average_latency_ms: float


class SentraMetrics:
    def __init__(self) -> None:
        self.reset()

    def record(self, *, decision: DecisionResponse, latency_ms: float, expected_malicious: bool | None = None,
               scenario: str | None = None, call_index: int | None = None) -> None:
        self._latencies.append(latency_ms)
        if decision.verdict is Verdict.BLOCK:
            self._blocked += 1
        elif decision.verdict is Verdict.STEP_UP:
            self._step_up += 1
        else:
            self._allowed += 1
        flagged = decision.verdict is not Verdict.ALLOW
        if expected_malicious is True:
            self._malicious += 1
            self._detected += int(flagged)
        elif expected_malicious is False:
            self._false_positives += int(flagged)
        if flagged and scenario is not None and call_index is not None:
            self._first_flags.setdefault(scenario, call_index)

    def snapshot(self) -> MetricsSnapshot:
        ordered = sorted(self._latencies)
        p95 = ordered[ceil(len(ordered) * .95) - 1] if ordered else 0.0
        return MetricsSnapshot(requests_scored=len(self._latencies), attacks_detected=self._detected,
                               false_positives=self._false_positives, p95_latency_ms=p95,
                               blocked_count=self._blocked, step_up_count=self._step_up, allowed_count=self._allowed,
                               first_flagged_call_by_scenario=dict(self._first_flags),
                               detection_rate=(self._detected / self._malicious if self._malicious else None),
                               average_latency_ms=(sum(self._latencies) / len(self._latencies) if self._latencies else 0.0))

    def reset(self) -> None:
        self._latencies: list[float] = []
        self._blocked = self._step_up = self._allowed = self._detected = self._malicious = self._false_positives = 0
        self._first_flags: dict[str, int] = {}
