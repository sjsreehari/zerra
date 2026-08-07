from typing import Optional

from ..models import PatternMatch, SequenceWindow


class ScopeViolationChainDetector:
    name = "scope_violation_chain"

    def evaluate(self, window: SequenceWindow, features: dict) -> Optional[PatternMatch]:
        if not features["scope_violation_flag"]:
            return None
        for index, event in enumerate(window.events):
            if event.scope_contract is not None and event.endpoint not in event.scope_contract:
                return PatternMatch(self.name, index, 0.95)
        return PatternMatch(self.name, 0, 0.95)
