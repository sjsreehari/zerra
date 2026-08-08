-- Sentra security events table for persisting enriched call evaluations
CREATE TABLE IF NOT EXISTS sentra_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT NOT NULL,
    identity_id TEXT NOT NULL,
    identity_type TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    object_id TEXT,
    object_type TEXT,
    tenant_id TEXT,
    home_tenant_id TEXT,
    verdict TEXT NOT NULL CHECK (verdict IN ('allow', 'step_up', 'block')),
    trust_score NUMERIC(6,2) NOT NULL DEFAULT 100.0,
    graph_risk_score NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    sequence_risk_score NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    reason TEXT,
    risk_card_id TEXT,
    latency_ms NUMERIC(8,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentra_events_identity ON sentra_events (identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentra_events_verdict ON sentra_events (verdict);
CREATE INDEX IF NOT EXISTS idx_sentra_events_created ON sentra_events (created_at DESC);

-- Sentra risk cards table for persisting threat detections
CREATE TABLE IF NOT EXISTS sentra_risk_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id TEXT NOT NULL UNIQUE,
    identity_id TEXT NOT NULL,
    verdict TEXT NOT NULL,
    confidence NUMERIC(5,4) NOT NULL,
    graph_risk_score NUMERIC(5,4) NOT NULL,
    sequence_risk_score NUMERIC(5,4) NOT NULL,
    trust_score NUMERIC(6,2) NOT NULL,
    owasp_tag TEXT NOT NULL,
    mitre_tag TEXT NOT NULL,
    evidence TEXT NOT NULL,
    factors JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentra_risk_cards_identity ON sentra_risk_cards (identity_id);
CREATE INDEX IF NOT EXISTS idx_sentra_risk_cards_created ON sentra_risk_cards (created_at DESC);

-- Sentra policies table for persisting security rules
CREATE TABLE IF NOT EXISTS sentra_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'simulated', 'active')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentra_policies_status ON sentra_policies (status);
