CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE security_scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    mode TEXT NOT NULL CHECK (mode IN ('passive', 'safe_active')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    total_checks INTEGER NOT NULL DEFAULT 0,
    passed_checks INTEGER NOT NULL DEFAULT 0,
    failed_checks INTEGER NOT NULL DEFAULT 0,
    warning_checks INTEGER NOT NULL DEFAULT 0,
    not_testable_checks INTEGER NOT NULL DEFAULT 0,
    error_message TEXT NULL
);

CREATE TABLE security_scan_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES security_scan_jobs(id) ON DELETE CASCADE,
    owasp_id TEXT NOT NULL,
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'warning', 'not_testable', 'error')),
    endpoint TEXT NULL,
    method TEXT NULL,
    evidence JSONB NOT NULL,
    remediation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX security_scan_jobs_status_idx ON security_scan_jobs(status);
CREATE INDEX security_scan_findings_job_id_idx ON security_scan_findings(job_id);
