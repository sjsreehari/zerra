from typing import Optional

from ..config import CREDENTIAL_FAILURES
from ..models import PatternMatch, SequenceWindow


class CredentialProbingDetector:
    name = "credential_probing"

    def evaluate(self, window: SequenceWindow, features: dict) -> Optional[PatternMatch]:
        failures = [i for i, event in enumerate(window.events) if event.status_code in {401, 403}]
        if len(failures) >= CREDENTIAL_FAILURES:
            return PatternMatch(self.name, failures[CREDENTIAL_FAILURES - 1], 0.82)
        return None
