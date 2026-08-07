"""Runnable local SENTRA demonstration and shared runtime factory."""

from agent.attack_sim import AttackSimulator, fast_invoice_enumeration, normal_repeating_user_traffic
from agent.graph import IntentGraphStore
from agent.identity import IdentityRegistry
from agent.metrics import SentraMetrics
from agent.orchestrator import SentraEngine
from agent.policy import PolicyEngine
from agent.trust import TrustScoreStore


def create_demo_engine() -> tuple[SentraEngine, SentraMetrics]:
    """Build one isolated, in-memory SENTRA runtime for the demo or API server."""
    metrics = SentraMetrics()
    engine = SentraEngine(
        registry=IdentityRegistry(),
        graph_store=IntentGraphStore(),
        trust_store=TrustScoreStore(),
        policy_engine=PolicyEngine(),
    )
    return engine, metrics


def run_demo() -> None:
    engine, metrics = create_demo_engine()
    simulator = AttackSimulator()
    normal = simulator.run(engine, normal_repeating_user_traffic(), metrics)
    attack = simulator.run(engine, fast_invoice_enumeration(), metrics)
    snapshot = metrics.snapshot()
    print(f"Normal traffic: {'allowed' if normal.blocked == 0 and normal.stepped_up == 0 else 'flagged'}")
    print(f"Fast enumeration: {'blocked' if attack.blocked else 'step-up'} on call {attack.first_flagged_call}")
    print(f"Detection rate: {snapshot.detection_rate or 0:.0%}")
    print(f"False positives: {snapshot.false_positives}")
    print(f"p95 inference latency: {snapshot.p95_latency_ms:.2f} ms")


if __name__ == "__main__":
    run_demo()
