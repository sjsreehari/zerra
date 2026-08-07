"""Pydantic imports with a small runtime fallback for dependency-free demos."""

from datetime import datetime
from enum import Enum
from typing import Any

try:  # Prefer the project's real Pydantic installation when available.
    from pydantic import BaseModel, Field
except ImportError:  # pragma: no cover - exercised only in lightweight demo environments
    _MISSING = object()

    class _FieldInfo:
        def __init__(self, default: Any = _MISSING, default_factory: Any = None, **constraints: Any) -> None:
            self.default = default
            self.default_factory = default_factory
            self.constraints = constraints

    def Field(default: Any = _MISSING, *, default_factory: Any = None, **constraints: Any) -> _FieldInfo:
        return _FieldInfo(default, default_factory, **constraints)

    class BaseModel:
        """Subset used by this package when Pydantic is not installed."""

        def __init__(self, **values: Any) -> None:
            annotations: dict[str, Any] = {}
            for klass in reversed(type(self).__mro__):
                annotations.update(getattr(klass, "__annotations__", {}))
            unknown = set(values) - set(annotations)
            if unknown:
                raise TypeError(f"Unexpected fields: {', '.join(sorted(unknown))}")
            for name in annotations:
                definition = getattr(type(self), name, _MISSING)
                value = values.get(name, _MISSING)
                if value is _MISSING:
                    if isinstance(definition, _FieldInfo):
                        value = definition.default_factory() if definition.default_factory else definition.default
                    else:
                        value = definition
                if value is _MISSING:
                    raise TypeError(f"Missing required field: {name}")
                if isinstance(definition, _FieldInfo) and isinstance(value, (int, float)):
                    if "ge" in definition.constraints and value < definition.constraints["ge"]:
                        raise ValueError(f"{name} must be >= {definition.constraints['ge']}")
                    if "le" in definition.constraints and value > definition.constraints["le"]:
                        raise ValueError(f"{name} must be <= {definition.constraints['le']}")
                setattr(self, name, value)

        def model_dump(self, *, mode: str = "python") -> dict[str, Any]:
            def convert(value: Any) -> Any:
                if isinstance(value, BaseModel):
                    return value.model_dump(mode=mode)
                if isinstance(value, list):
                    return [convert(item) for item in value]
                if mode == "json" and isinstance(value, (datetime, Enum)):
                    return value.isoformat() if isinstance(value, datetime) else value.value
                return value
            return {name: convert(value) for name, value in self.__dict__.items()}

        def dict(self) -> dict[str, Any]:
            return self.model_dump()
