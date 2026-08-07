from typing import Optional

from ..config import (EXPORT_ENDPOINT_MARKERS, EXPORT_RESPONSE_FIELD_COUNT,
                      READ_HEAVY_RATIO, SCANNING_MIN_DISTINCT_OBJECTS,
                      SHRINKING_GAP_RATIO, SENSITIVE_FIELDS)
from ..models import PatternMatch, SequenceWindow


class EnumerationExfilDetector:
    """v1 state machine: BASELINE -> SCANNING -> HARVESTING -> EXFIL_SUSPECTED."""
    name = "enumeration_exfil"

    def evaluate(self, window: SequenceWindow, features: dict) -> Optional[PatternMatch]:
        scanning = (features["distinct_object_count"] >= SCANNING_MIN_DISTINCT_OBJECTS
                    and bool(features["object_id_delta_pattern"]))
        harvesting = (scanning and features["read_write_ratio"] >= READ_HEAVY_RATIO
                      and features["inter_call_seconds_trend"] <= SHRINKING_GAP_RATIO)
        if not harvesting:
            return None
        for index, event in enumerate(window.events):
            export_shaped = (any(marker in event.endpoint.lower() for marker in EXPORT_ENDPOINT_MARKERS)
                             or len(event.response_fields) >= EXPORT_RESPONSE_FIELD_COUNT)
            if export_shaped or any(field.lower() in SENSITIVE_FIELDS for field in event.response_fields):
                return PatternMatch(self.name, index, 0.94)
        return PatternMatch(self.name, min(len(window.events) - 1, SCANNING_MIN_DISTINCT_OBJECTS - 1), 0.74)
