from enum import Enum
from time import perf_counter

from pydantic import BaseModel

from agent.contracts import CallEvent, DecisionResponse, Verdict
from agent.metrics import SentraMetrics
from agent.orchestrator import SentraEngine


class ScenarioType(str, Enum):
    NORMAL = "normal"
    FAST_ENUMERATION = "fast_enumeration"
    SLOW_MUTATED_ENUMERATION = "slow_mutated_enumeration"
    CROSS_TENANT = "cross_tenant"
    SCOPE_VIOLATION = "scope_violation"
    CREDENTIAL_PROBING = "credential_probing"


class ScenarioEvent(BaseModel):
    scenario: ScenarioType
    expected_malicious: bool
    event: CallEvent


class ScenarioRunResult(BaseModel):
    scenario: ScenarioType
    total_calls: int
    allowed: int
    stepped_up: int
    blocked: int
    first_flagged_call: int | None
    decisions: list[DecisionResponse]


class AttackSimulator:
    def run(self, engine: SentraEngine, events: list[ScenarioEvent], metrics: SentraMetrics | None = None) -> ScenarioRunResult:
        if not events:
            raise ValueError("A scenario needs at least one event")
        decisions: list[DecisionResponse] = []
        first_flagged: int | None = None
        for index, scenario_event in enumerate(events, start=1):
            started = perf_counter()
            decision = engine.evaluate(scenario_event.event)
            latency = (perf_counter() - started) * 1000
            decisions.append(decision)
            if decision.verdict is not Verdict.ALLOW and first_flagged is None:
                first_flagged = index
            if metrics:
                metrics.record(decision=decision, latency_ms=latency, expected_malicious=scenario_event.expected_malicious,
                               scenario=scenario_event.scenario.value, call_index=index)
        return ScenarioRunResult(scenario=events[0].scenario, total_calls=len(events),
                                 allowed=sum(item.verdict is Verdict.ALLOW for item in decisions),
                                 stepped_up=sum(item.verdict is Verdict.STEP_UP for item in decisions),
                                 blocked=sum(item.verdict is Verdict.BLOCK for item in decisions),
                                 first_flagged_call=first_flagged, decisions=decisions)
