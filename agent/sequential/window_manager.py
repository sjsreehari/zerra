"""In-memory, bounded sliding windows keyed by identity."""

from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any

from .config import WINDOW_SIZE, WINDOW_TTL_SECONDS
from .models import CallEvent, SequenceWindow


class WindowManager:
    def __init__(self, max_size: int = WINDOW_SIZE, ttl_seconds: int = WINDOW_TTL_SECONDS) -> None:
        self.max_size = max_size
        self.ttl = timedelta(seconds=ttl_seconds)
        self._windows: dict[str, deque[CallEvent]] = {}

    def add(self, event: CallEvent) -> SequenceWindow:
        window = self._windows.setdefault(event.identity_id, deque(maxlen=self.max_size))
        cutoff = event.timestamp - self.ttl
        while window and window[0].timestamp < cutoff:
            window.popleft()
        window.append(event)
        return SequenceWindow(event.identity_id, list(window), self.max_size)

    def clear(self) -> None:
        self._windows.clear()
