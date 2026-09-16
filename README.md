# Zerra

**Every commit, reviewed like your best security engineer just looked at it — because one did.**

Zerra is a self-hostable open-source AppSec platform for GitHub pull requests. It verifies a signed webhook, queues diff-scoped analysis, combines Semgrep, Syft/OSV and secret scanning, and only permits an automated remediation after patch and repository verification.

## Architecture

```text
GitHub PR → signed NestJS webhook → Redis/BullMQ → worker
                                              ↘ Postgres ← dashboard
worker → Semgrep + Syft/OSV + secret scan → verified patch → GitHub PR or Issue
```

## Quickstart

Copy `.env.example` to `.env`, then run:

```sh
npm install
docker compose -f infra/docker-compose.yml up --build
npm run start --workspace=@zerra/cli -- init
```

`zerra init` opens the local setup page, which starts GitHub’s App-manifest flow. Zerra never asks for a personal access token; credentials use the OS keychain, with an encrypted-file fallback.

## Development

```sh
npm run prisma:generate
npm test
npm run build
```

See [BUILD_SUMMARY.md](BUILD_SUMMARY.md) for the current implementation boundary and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.
