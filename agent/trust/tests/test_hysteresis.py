from ..models import TrustZone
from ..thresholds import next_zone


def test_borderline_scores_do_not_flap_after_entering_yellow():
    zone, changed = next_zone(TrustZone.GREEN, 69, 0)
    assert (zone, changed) == (TrustZone.YELLOW, True)
    for score in (71, 69, 71, 69, 71, 69):
        zone, changed = next_zone(zone, score, 10)
        assert (zone, changed) == (TrustZone.YELLOW, False)
