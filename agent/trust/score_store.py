from datetime import datetime, timezone

from .dynamics import step
from .explain import build_evidence_string
from .inputs import TrustScoreInputs
from .models import ScoreState, TrustScoreResult
from .thresholds import next_zone, zone_to_verdict
from .weights import compute_weighted_badness


class TrustScoreStore:
    """In-memory owner of one live trust state per identity."""

    def __init__(self) -> None:
        self._states: dict[str, ScoreState] = {}

    def get_or_create(self, identity_id: str) -> ScoreState:
        if identity_id not in self._states:
            self._states[identity_id] = ScoreState(identity_id=identity_id, last_updated=datetime.now(timezone.utc))
        return self._states[identity_id]

    def process(self, inputs: TrustScoreInputs) -> TrustScoreResult:
        state = self.get_or_create(inputs.identity_id)
        badness, factors = compute_weighted_badness(inputs)
        step(state, badness)
        # This is a recovery-line streak, not merely time spent in a zone: a
        # score must remain past its climb-back line for consecutive calls.
        recovering = (
            (state.zone.value == "yellow" and state.trust_score > 78.0)
            or (state.zone.value == "red" and state.trust_score > 50.0)
        )
        recovery_streak = state.consecutive_zone_calls + 1 if recovering else 0
        zone, changed = next_zone(state.zone, state.trust_score, recovery_streak)
        state.consecutive_zone_calls = 0 if changed else recovery_streak
        state.zone = zone
        state.last_updated = datetime.now(timezone.utc)
        verdict = zone_to_verdict(zone)
        return TrustScoreResult(
            identity_id=inputs.identity_id,
            call_id=inputs.call_id,
            trust_score=round(state.trust_score, 1),
            zone=zone,
            verdict=verdict,
            zone_changed=changed,
            factors=factors,
            evidence=build_evidence_string(factors, changed, verdict.value),
            timestamp=state.last_updated,
        )
