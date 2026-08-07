from ..dynamics import update_ewma


def test_bad_evidence_moves_score_faster_than_good_evidence_recovers_it():
    degraded = update_ewma(1.0, 0.0)
    recovered = update_ewma(degraded, 1.0)
    assert 0.44 < degraded < 0.46
    assert recovered < 0.6
