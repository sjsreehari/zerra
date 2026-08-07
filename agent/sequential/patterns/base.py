from typing import Optional, Protocol

from ..models import PatternMatch, SequenceWindow


class PatternDetector(Protocol):
    name: str

    def evaluate(self, window: SequenceWindow, features: dict) -> Optional[PatternMatch]: ...
