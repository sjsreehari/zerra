# SENTRA Intent Graph Engine

An in-memory, explainable multi-relation graph for detecting API reconnaissance and BOLA-style enumeration. It deliberately scores **relationships over time**, not isolated requests.

## Integration

```python
from agent.graph import IntentGraphStore

store = IntentGraphStore()
result = store.score(call_event)  # score before mutation: novelty compares to history
store.record_call(call_event)
```

`call_event` can be a dict, dataclass, or Pydantic model. Required fields are `identity_id` (or `identity.id`) and `object_id` (or `resource_id`). It also accepts `call_id`, `object_type`, `endpoint`, `tenant_id`, `home_tenant_id`, and `timestamp` aliases described in `models.py`.

## Design

The graph retains distinct `identity → object` (`touches`), `identity → endpoint` (`calls`), and `object → tenant` (`belongs_to`) relations. Each edge is time-stamped and exponentially decayed; inactive edges are pruned lazily. This preserves relation-specific evidence and bounds long-running-memory use.

The score is a transparent weighted sum of normalized fan-out, novelty, and blast-radius signals. Every threshold, decay parameter, and weight lives in `GraphConfig`. Evidence is template-generated from signal values only.

## Research rationale and roadmap

This is a lightweight real-time stand-in for temporal, multi-relation graph anomaly models: GraphSAGE (Hamilton, Ying, Leskovec) informs the inductive Phase 2 direction; CARE-GNN (Dou et al., CIKM 2020) motivates preserving relation types; CS-GAD motivates explicitly temporal graph handling. Phase 2 can replace `scoring.py` with trained GraphSAGE/GAT embeddings while retaining the `IntentGraphStore.score()` contract. Multi-hop tracing and persistence are intentionally deferred.
