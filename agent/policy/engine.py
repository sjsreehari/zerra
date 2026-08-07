"""Structured, local policies. Inputs are already parsed; no NLP is involved."""

from datetime import datetime, timezone
from fnmatch import fnmatchcase

from agent.contracts import CallEvent, Identity, IdentityType, Policy, PolicyStatus
from agent.graph import GraphScoreResult

from .models import PolicyAction, PolicyEvaluation, PolicySimulationResult


def default_policies() -> list[Policy]:
    active = PolicyStatus.ACTIVE
    return [
        Policy(id="identity-revocation", name="Identity revocation", description="Block revoked identities", rule_type="identity_revoked", parameters={}, version=1, status=active),
        Policy(id="agent-scope-contract", name="Agent scope contract", description="Block out-of-scope agent calls", rule_type="agent_scope_contract", parameters={}, version=1, status=active),
        Policy(id="trust-score-threshold", name="Trust score threshold", description="Escalate low trust", rule_type="trust_score_threshold", parameters={"step_up_below": 70, "block_below": 40}, version=1, status=active),
        Policy(id="novel-object-rate", name="Novel object rate", description="Escalate broad object access", rule_type="novel_object_rate", parameters={"max_distinct_novel_objects": 5, "window_seconds": 60, "action": "step_up"}, version=1, status=active),
        Policy(id="cross-tenant-access", name="Cross tenant access", description="Block cross-tenant object access", rule_type="cross_tenant_access", parameters={"action": "block"}, version=1, status=active),
    ]


class PolicyEngine:
    def __init__(self, policies: list[Policy] | None = None) -> None:
        self._policies = list(default_policies() if policies is None else policies)

    def add_policy(self, policy: Policy) -> None:
        self._policies.append(policy)

    def list_policies(self, status: PolicyStatus | None = None) -> list[Policy]:
        return [policy for policy in self._policies if status is None or policy.status is status]

    def evaluate(self, *, event: CallEvent, identity: Identity, trust_score: float,
                 graph_result: GraphScoreResult | None) -> list[PolicyEvaluation]:
        return [self._evaluate_one(policy, event, identity, trust_score, graph_result)
                for policy in self._policies if policy.status is PolicyStatus.ACTIVE]

    def final_action(self, evaluations: list[PolicyEvaluation]) -> PolicyAction:
        matched = [item.action for item in evaluations if item.matched]
        return PolicyAction.BLOCK if PolicyAction.BLOCK in matched else PolicyAction.STEP_UP if PolicyAction.STEP_UP in matched else PolicyAction.ALLOW

    def simulate(self, events: list[CallEvent], policy: Policy, identities: dict[str, Identity]) -> PolicySimulationResult:
        """Evaluate one policy against isolated local history; live stores remain untouched."""
        matches: list[PolicyEvaluation] = []
        counts = {PolicyAction.ALLOW: 0, PolicyAction.STEP_UP: 0, PolicyAction.BLOCK: 0}
        history: dict[str, list[CallEvent]] = {}
        for event in events:
            identity = identities.get(event.identity_id)
            if identity is None:
                counts[PolicyAction.ALLOW] += 1
                continue
            graph = None
            if policy.rule_type == "novel_object_rate":
                window_seconds = int(policy.parameters.get("window_seconds", 60))
                prior = [old for old in history.get(event.identity_id, []) if (event.timestamp - old.timestamp).total_seconds() <= window_seconds]
                objects = {old.object_id for old in prior if old.object_id} | ({event.object_id} if event.object_id else set())
                graph = GraphScoreResult(0.0, f"{len(objects)} distinct novel objects", [{"fan_out": len(objects)}])
                history.setdefault(event.identity_id, []).append(event)
            evaluation = self._evaluate_one(policy, event, identity, 100.0, graph)
            if evaluation.matched:
                matches.append(evaluation)
                counts[evaluation.action] += 1
            else:
                counts[PolicyAction.ALLOW] += 1
        return PolicySimulationResult(policy_id=policy.id, total_events=len(events), matched_events=len(matches),
                                      would_allow=counts[PolicyAction.ALLOW], would_step_up=counts[PolicyAction.STEP_UP],
                                      would_block=counts[PolicyAction.BLOCK], matches=matches,
                                      summary=f"{len(matches)} of {len(events)} events matched {policy.name}")

    def _evaluate_one(self, policy: Policy, event: CallEvent, identity: Identity, trust_score: float,
                      graph_result: GraphScoreResult | None) -> PolicyEvaluation:
        action, matched, reason, evidence = PolicyAction.ALLOW, False, "rule did not match", {}
        if policy.rule_type == "identity_revoked":
            matched, action, reason = identity.is_revoked, PolicyAction.BLOCK, "identity is revoked"
        elif policy.rule_type == "agent_scope_contract":
            agent = identity.type in {IdentityType.AGENT, IdentityType.MCP_SERVER}
            allowed = bool(identity.scope_contract) and any(fnmatchcase(event.endpoint, pattern) for pattern in identity.scope_contract)
            matched, action, reason = agent and not allowed, PolicyAction.BLOCK, "agent endpoint is outside scope contract"
        elif policy.rule_type == "trust_score_threshold":
            block, step = float(policy.parameters.get("block_below", 40)), float(policy.parameters.get("step_up_below", 70))
            matched, action = trust_score < step, PolicyAction.BLOCK if trust_score < block else PolicyAction.STEP_UP
            reason, evidence = f"trust score {trust_score:.2f} below threshold", {"trust_score": trust_score}
        elif policy.rule_type == "novel_object_rate" and graph_result is not None:
            fanout = next((factor.get("fan_out") for factor in graph_result.factors if "fan_out" in factor), 0)
            maximum = int(policy.parameters.get("max_distinct_novel_objects", 5))
            matched, action, reason, evidence = fanout > maximum, PolicyAction(policy.parameters.get("action", "step_up")), f"{fanout} novel objects exceeds {maximum}", {"fan_out": fanout}
        elif policy.rule_type == "cross_tenant_access":
            matched = bool(event.tenant_id and identity.tenant_id and event.tenant_id != identity.tenant_id)
            action, reason, evidence = PolicyAction(policy.parameters.get("action", "block")), "cross-tenant target access", {"target_tenant": event.tenant_id, "home_tenant": identity.tenant_id}
        return PolicyEvaluation(policy_id=policy.id, policy_name=policy.name, matched=matched, action=action,
                                reason=reason if matched else "rule did not match", evidence=evidence if matched else {},
                                evaluated_at=datetime.now(timezone.utc))
