# Zerra build summary

## Built

- TypeScript monorepo foundation: NestJS API and worker entry points, Next.js dashboard, Prisma/Postgres schema and initial migration, BullMQ/Redis queues, Docker Compose, shared schema and OpenAPI contract.
- GitHub webhook ingestion validates `X-Hub-Signature-256` in constant time, persists delivery IDs to deduplicate retries, and only queues PR opened/synchronized/reopened work.
- Scanner package provides Semgrep execution, Syft SBOM generation, OSV `querybatch`, secrets detection with entropy plus UUID/hash/base64 allowlisting, and strict subprocess input validation.
- Fix engine rejects non-unified diffs and performs `git apply --check`; it includes a test/lint command detector.
- Dashboard uses live API routes with real empty states and SARIF output is available per scan.
- `zerra init` starts the Compose stack and opens GitHub App manifest onboarding. Credential storage prefers the OS keychain and has an AES-256-GCM encrypted-file fallback.

## Tests

Unit tests cover signature forgery rejection, secret allowlisting, unsafe Git arguments, OSV batch requests, unified diff validation, CLI setup wiring, and encrypted-file storage. Run `npm install && npm test` after dependencies finish installing.

## Partial / deferred

- GitHub App installation-token exchange, repository cloning, PR/Issue creation, and Anthropic calls require live GitHub/App and Anthropic credentials and are not wired to external services yet.
- The worker durable queue, scan record lifecycle, dead-letter routing, and scanner/fix primitives are present; its remote clone → scan → verified PR/Issue orchestration still needs those authenticated integration adapters.
- Slack/Discord/email delivery adapters and the dashboard trend/MTTF visualization remain to be added.
- Legacy Python/Go prototype directories remain untouched because they had pre-existing uncommitted changes; they are not referenced by the new Compose stack. `report.txt` is likewise preserved as the audit source.

## Local quickstart

1. Copy `.env.example` to `.env` and supply GitHub App/OAuth values as onboarding returns them.
2. `npm install`
3. `docker compose -f infra/docker-compose.yml up --build`
4. In another terminal, run `npm run start --workspace=@zerra/cli -- init` (or `npx zerra init` after publishing) and follow the browser setup screen.

The dashboard is at `http://localhost:3000`, and the signed GitHub webhook endpoint is `http://localhost:3001/webhooks/github`.
