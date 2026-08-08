CREATE TABLE IF NOT EXISTS "log" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain TEXT NOT NULL,
    source_ip INET,
    request_method TEXT NOT NULL,
    request_path TEXT NOT NULL,
    request_size_bytes BIGINT NOT NULL DEFAULT 0,
    event_json JSONB NOT NULL,
    agent_output JSONB,
    verdict TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    upstream_status INTEGER,
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    evaluated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_log_subdomain_received ON "log" (subdomain, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_status ON "log" (status);
