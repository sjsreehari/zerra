# SENTRA Trust Score

This package produces an explainable, live 0–100 trust score for each identity. It blends graph risk, sequence risk, authentication weakness, and sensitive-data exposure, then applies an asymmetric EWMA: bad evidence lowers trust quickly while recovery requires sustained good behavior.

Zone transitions use separate degradation and recovery boundaries plus a two-call recovery confirmation, preventing verdict flapping near a threshold. New identities are protected by a temporary score floor during the eight-call warm-up period.

All tuning constants live in `config.py`; `TrustScoreStore.process()` is the orchestration entry point. Its result includes factor contributions and deterministic evidence text for a future Risk Card.

The approach follows score-based trust algorithms in NIST SP 800-207 and the temporal aggregation pattern of Bayesian/Beta reputation systems. A full alpha/beta posterior, peer baselines, resource-specific thresholds, and persistent storage are deliberately deferred.
