from typing import Iterable, Optional

from .models import PatternMatch, SequenceWindow
from .patterns import CredentialProbingDetector, EnumerationExfilDetector, ScopeViolationChainDetector
from .patterns.base import PatternDetector


class StateMachineScorer:
    def __init__(self, detectors: Optional[Iterable[PatternDetector]] = None) -> None:
        self.detectors = list(detectors or (EnumerationExfilDetector(), CredentialProbingDetector(), ScopeViolationChainDetector()))

    def score(self, window: SequenceWindow, features: dict) -> Optional[PatternMatch]:
        matches = (detector.evaluate(window, features) for detector in self.detectors)
        return max((match for match in matches if match is not None), key=lambda match: match.confidence, default=None)
