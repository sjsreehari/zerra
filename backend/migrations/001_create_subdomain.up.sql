CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS proxy (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain       TEXT NOT NULL,
    api_base_url    TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
