# SENTRA backend

## API security scans

`POST /api/v1/security-scans` accepts only a registered proxy `subdomain` and an optional `passive` mode. `safe_active` requires `SAFE_ACTIVE_SCANS_ENABLED=true`.

The target URL is resolved from the PostgreSQL `proxy` table and checked for unsafe schemes, userinfo, query strings, and non-public DNS destinations outside development. The caller cannot supply a target URL, headers, container image, command, mounts, or Docker settings.

The runner has a fixed `SENTRA_SCANNER_IMAGE` (default `sandbox:latest`), read-only filesystem, non-root user, no mounts, no privileged mode, PID/memory/CPU limits, and a 60-second hard timeout. The scan plan permits GET, HEAD, and OPTIONS only with an 80-request, 5-request/second budget.

Build the fixed scanner image from the backend directory before starting the API:

```sh
docker build -f scanner.Dockerfile -t scanner .
```

Every run emits API1:2023 through API10:2023. API3 passively flags sensitive JSON key names without storing values; API8 passively checks security headers; API9 checks a configured inventory URL when one is supplied. Categories that require explicit test identities, objects, roles, business-flow fixtures, SSRF callbacks, or outbound-integration configuration remain `not_testable` until those server-controlled fixtures are added.

Results are bounded OWASP API Security Top 10 checks, not a statement that an API is compliant or secure. Unavailable or unsupported checks are recorded as `not_testable`.
