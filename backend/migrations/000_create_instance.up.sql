CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS instances (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image       TEXT NOT NULL,
    command     JSONB NOT NULL,
    output      TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instances_status ON instances (status);
CREATE INDEX IF NOT EXISTS idx_instances_created_at ON instances (created_at DESC);