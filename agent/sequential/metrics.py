from collections import defaultdict


class SequenceMetrics:
    def __init__(self) -> None:
        self.latencies_ms: list[float] = []
        self.pattern_counts: dict[str, int] = defaultdict(int)

    def record(self, latency_ms: float, pattern_name: str | None) -> None:
        self.latencies_ms.append(latency_ms)
        if pattern_name:
            self.pattern_counts[pattern_name] += 1

    @property
    def p95_latency_ms(self) -> float:
        if not self.latencies_ms:
            return 0.0
        ordered = sorted(self.latencies_ms)
        return ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))]
