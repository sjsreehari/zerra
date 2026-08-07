"""Pure feature extraction: a SequenceWindow in, numeric evidence out."""

from statistics import mean
from typing import Any

from .config import SENSITIVE_FIELDS
from .models import SequenceWindow


def _numeric_object_ids(window: SequenceWindow) -> list[int]:
    values: list[int] = []
    for event in window.events:
        if event.object_id is None:
            continue
        try:
            values.append(int(str(event.object_id)))
        except ValueError:
            return []
    return values


def extract_features(window: SequenceWindow) -> dict[str, Any]:
    events = window.events
    object_ids = [event.object_id for event in events if event.object_id is not None]
    gaps = [max(0.0, (later.timestamp - earlier.timestamp).total_seconds())
            for earlier, later in zip(events, events[1:])]
    numbers = _numeric_object_ids(window)
    sequential = len(numbers) >= 2 and all(0 < later - earlier <= 2 for earlier, later in zip(numbers, numbers[1:]))
    read_count = sum(event.method.upper() in {"GET", "HEAD"} for event in events)
    sensitivity = any(
        field.lower() in SENSITIVE_FIELDS
        for event in events for field in event.response_fields
    )
    endpoints = {event.endpoint for event in events}
    contract = next((event.scope_contract for event in events if event.scope_contract is not None), None)
    agent_identity = any(event.identity_type.lower() in {"agent", "mcp", "mcp_server"} for event in events)
    scope_violation = bool(agent_identity and contract is not None and any(event.endpoint not in contract for event in events))
    return {
        "window_size": len(events),
        "distinct_object_count": len(set(object_ids)),
        "object_id_delta_pattern": float(sequential),
        "avg_inter_call_seconds": mean(gaps) if gaps else 0.0,
        "inter_call_seconds_trend": (gaps[-1] / gaps[0]) if len(gaps) >= 2 and gaps[0] > 0 else 1.0,
        "read_write_ratio": read_count / len(events) if events else 0.0,
        "endpoint_diversity": len(endpoints),
        "error_rate": sum(400 <= event.status_code < 500 for event in events) / len(events) if events else 0.0,
        "sensitivity_touched": float(sensitivity),
        "scope_violation_flag": float(scope_violation),
        "max_response_field_count": max((len(event.response_fields) for event in events), default=0),
    }
