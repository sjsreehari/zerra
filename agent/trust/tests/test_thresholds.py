from ..dynamics import apply_warm_up_floor
from ..models import TrustZone
from ..thresholds import next_zone


def test_warm_up_floor_applies_to_first_eight_calls():
    assert apply_warm_up_floor(0, 0) == 40
    assert apply_warm_up_floor(0, 7) == 40
    assert apply_warm_up_floor(0, 8) == 0


def test_red_needs_confirmation_before_exit():
    assert next_zone(TrustZone.RED, 60, 1) == (TrustZone.RED, False)
    assert next_zone(TrustZone.RED, 60, 2) == (TrustZone.YELLOW, True)
