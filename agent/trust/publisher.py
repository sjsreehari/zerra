import inspect

from .models import TrustScoreResult


async def publish(result: TrustScoreResult, broadcast: object) -> None:
    """Send a result through an existing sync or async dashboard broadcaster."""
    payload = result.model_dump(mode="json") if hasattr(result, "model_dump") else result.dict()
    sent = broadcast(payload)  # type: ignore[operator]
    if inspect.isawaitable(sent):
        await sent
