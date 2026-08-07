from ..inputs import TrustScoreInputs
from ..models import Verdict
from ..score_store import TrustScoreStore


def test_attack_sequence_reaches_block_and_explains_graph_risk():
    store = TrustScoreStore()
    result = None
    # The first eight calls deliberately cannot block a new identity. Once the
    # warm-up protection expires, the sustained attack must immediately be red.
    for call_id in range(9):
        result = store.process(TrustScoreInputs(
            identity_id="attacker", call_id=str(call_id), auth_strength=0.0,
            graph_risk_score=1.0, sequence_risk_score=1.0,
            sensitive_fields_touched=["ssn", "salary"],
        ))
    assert result is not None
    assert result.verdict == Verdict.BLOCK
    assert "graph risk" in result.evidence
