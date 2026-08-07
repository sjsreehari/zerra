from .config import EWMA_ALPHA_DEGRADE, EWMA_ALPHA_RECOVER, WARM_UP_CALLS, WARM_UP_SCORE_FLOOR
from .models import ScoreState


def update_ewma(prev_goodness: float, new_goodness: float) -> float:
    alpha = EWMA_ALPHA_DEGRADE if new_goodness < prev_goodness else EWMA_ALPHA_RECOVER
    return max(0.0, min(1.0, (1.0 - alpha) * prev_goodness + alpha * new_goodness))


def apply_warm_up_floor(score: float, call_count: int) -> float:
    return max(score, WARM_UP_SCORE_FLOOR) if call_count < WARM_UP_CALLS else score


def step(state: ScoreState, badness: float) -> ScoreState:
    smoothed = update_ewma(state.ewma_state, 1.0 - badness)
    state.previous_score = state.trust_score
    state.ewma_state = smoothed
    # call_count is evidence already observed; the current call remains protected
    # through the eighth observation (counts 0 through WARM_UP_CALLS - 1).
    state.trust_score = apply_warm_up_floor(smoothed * 100.0, state.call_count)
    state.call_count += 1
    return state
