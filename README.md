# Zerra / SENTRA

Zerra is the repository for the SENTRA security-platform prototype: a zero-trust
authorization layer intended to protect APIs, services, AI agents, and MCP
servers. SENTRA evaluates the identity, target object, and request sequence—not
only the current request—to decide whether to allow, step-up, or block access.

> Current state: the Docker Compose stack runs the Go gateway, PostgreSQL,
> Python inference service, protected upstream, and an authenticated Next.js
> console. Management and intelligence APIs use HTTP-only JWT session cookies.

## Repository layout

```text
agent/                         Python security intelligence layer
  graph/                       Temporal multi-relation Intent Graph Engine
  sequential/                  Sequence Intent scorer / state-machine detectors
  trust/                       Stateful 0–100 trust score and verdict engine

backend/                       Go/Gin service and dynamic reverse proxy
  cmd/                         Application entry point and HTTP route mounting
  internal/adapters/proxy/     Host parsing and reverse-proxy HTTP adapter
  internal/features/subdomain/ Database-backed subdomain registration/lookup
  migrations/                  PostgreSQL schema for proxy registrations

frontend/                      Next.js dashboard (currently starter UI)
```

## SENTRA security design

```text
Incoming request
  -> identity / trust-foundation checks
  -> Intent Graph score (identity ↔ object ↔ endpoint ↔ tenant)
  -> Sequence score (enumeration, probing, scope-violation chains)
  -> continuous Trust Score
  -> policy decision: allow | step_up | block
  -> Risk Card and dashboard event
```

The current Python inference modules use transparent, deterministic scoring for
the MVP. They are designed as a foundation for later GraphSAGE/GAT and learned
sequence models without changing the application-facing decision contract.

## Python security modules

### Intent Graph Engine — `agent/graph`

Maintains a NetworkX multi-relation graph for identity-to-object,
identity-to-endpoint, and object-to-tenant relationships. It scores:

- novel object access;
- rapid fan-out across previously unseen objects;
- cross-tenant blast radius;
- temporal edge decay and pruning.

It returns a `graph_risk_score` from 0 to 1 plus deterministic evidence.

### Sequence Intent Scorer — `agent/sequential`

Maintains bounded, per-identity request windows and detects:

- enumerate → read → export chains;
- credential probing via repeated 401/403 calls;
- agent/MCP scope-contract violations.

It returns `sequence_risk_score`, the matching pattern, the triggering call index,
feature evidence, and timing metrics.

### Trust Score Engine — `agent/trust`

Combines graph risk, sequence risk, authentication weakness, and sensitive-field
exposure into a continuous 0–100 score. It has EWMA smoothing, warm-up protection,
hysteresis, and maps scores to `allow`, `step_up`, or `block` verdicts.

## Run Python tests

Requirements: Python 3.11+ and the packages used by the agent modules, including
`pydantic`, `networkx`, and `pytest`.

```powershell
python -B -m pytest -p no:cacheprovider agent -q
```

## Run the local SENTRA demo

### Configure runtime environment

The root `.env` is the single local configuration file. It already contains
safe local defaults; copy `.env.example` when setting up another machine.

For Ollama hosted on another machine, replace `OLLAMA_BASE_URL` with the HTTPS
URL provided by that machine's VS Code tunnel. The analyst integration is
optional: enforcement remains deterministic and the Threat Hunter returns a
safe fallback investigation when Ollama is unavailable.

`JWT_SECRET` must be a unique, random value of at least 32 characters in every
non-local environment.

Start the in-memory inference and protected-demo API in one terminal:

```powershell
uvicorn agent.api:app --host 127.0.0.1 --port 8000
```

Run the deterministic security demonstration in another terminal:

```powershell
python -m agent.main
```

Useful local inference endpoints:

```text
POST /v1/evaluate
GET  /v1/metrics
GET  /v1/risk-cards
GET  /v1/identities
POST /v1/identities/{id}/revoke
POST /v1/identities/{id}/restore
GET  /demo/invoices/{id}
GET  /demo/users/{id}
GET  /demo/admin/export
```

The protected demo endpoints use the seeded bearer tokens, for example
`Authorization: Bearer demo-human-token`. The available demo identities and
tokens are intentionally in-memory only and must not be used outside this demo.

## Dynamic reverse proxy

The backend can register an upstream API for a subdomain. A request to the
subdomain is handled by the Go service; it looks up the upstream in PostgreSQL and
proxies the request server-side. The browser/client remains on the gateway URL.

### Registration table

Migration `backend/migrations/001_create_subdomain.up.sql` creates:

```text
proxy(id, subdomain, api_base_url, created_at, updated_at)
```

For a row like this:

```text
subdomain:    qroasis
api_base_url: https://my-deployment.vercel.app
```

this request is proxied:

```text
http://qroasis.127.0.0.1:8080/anything
```

The proxy does the following:

1. Extracts `qroasis` from the incoming host.
2. Runs a case-insensitive lookup in `proxy.subdomain`.
3. Uses the matched `api_base_url` as the upstream destination.
4. Sends the upstream `Host` header as `my-deployment.vercel.app`, which allows
   Vercel to locate the correct deployment.
5. Does not forward the local gateway host as `X-Forwarded-Host` (which can
   trigger Vercel canonical-host redirects); it retains it in the private
   `X-Sentra-Original-Host` header for diagnostics.
6. Rewrites absolute upstream redirect locations back to the original gateway
   host, so Vercel redirects do not expose or navigate to the deployment URL.

Set `BASE_DOMAIN` for non-local environments:

```text
BASE_DOMAIN=example.com
```

Then `customer.example.com` resolves the `customer` row. The local default is
`127.0.0.1`, so `qroasis.127.0.0.1:8080` resolves `qroasis`.

### Register an upstream

Start PostgreSQL, apply the migrations, set `DB_CONN_STR`, then start the backend.
The current registration endpoint is:

```http
POST /api/v1/proxy
Content-Type: application/json

{
  "subdomain": "qroasis",
  "api_base_url": "https://my-deployment.vercel.app"
}
```

Use an actual Vercel deployment/custom-domain URL for `api_base_url`, not a Vercel
dashboard URL or Vercel REST API endpoint.

### Test local host routing

Use `curl --resolve` to force a local hostname to the gateway:

```bash
curl --resolve qroasis.127.0.0.1:8080:127.0.0.1 \
  http://qroasis.127.0.0.1:8080/
```

Or send the host header directly:

```bash
curl -H "Host: qroasis.127.0.0.1:8080" http://127.0.0.1:8080/
```

## Run the Go backend

Requirements: Go, PostgreSQL, and a valid `DB_CONN_STR` environment variable.

```powershell
cd backend
go run ./cmd
```

The service listens on port `8080` by default.

The reverse proxy works independently of SENTRA inference. To enforce SENTRA
decisions, set `SENTRA_INFERENCE_ENABLED=true` and start the Python service with
`SENTRA_INFERENCE_URL=http://127.0.0.1:8000`. Every registered subdomain request
is then evaluated before forwarding; `step_up` and `block` decisions are returned
by the gateway instead of proxied.

## Run the frontend

Requirements: Node.js and npm.

```powershell
cd frontend
npm install
npm run dev
```

Optionally set `NEXT_PUBLIC_SENTRA_URL=http://127.0.0.1:8000` before starting the
frontend. The dashboard polls the local inference service for identity trust,
metrics, and Risk Cards, and exposes the identity kill switch.

The production-like local flow uses the browser console instead:

1. Start the Compose stack below.
2. Open `http://localhost:3000/login` and register an account.
3. The gateway sets an HTTP-only JWT cookie; the console reads authenticated
   SENTRA metrics, identities, Risk Cards, and Ollama availability through the
   gateway without exposing a session token to JavaScript.

Authentication endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

## One-command container pipeline and real flow test

The Compose stack models the complete local traffic path:

```text
Client request with Host qroasis.gateway.test
  -> Go gateway :8080
  -> Python SENTRA inference :8000
  -> allow: private protected upstream :8001
  -> block/step-up: Risk Card + metrics, with no upstream request
  -> dashboard :3000 reads metrics, identities, and Risk Cards
```

Docker Desktop's **CLI integration must be enabled** and `docker` must be visible
from the terminal. Run:

```powershell
docker compose up --build -d
python tests/e2e_pipeline.py
docker compose down -v
```

Include the frontend console with `docker compose --profile frontend up --build`.

The E2E script performs real HTTP requests—not syntax checks—and verifies:

1. a permitted human request reaches the private upstream through Go;
2. a cross-tenant request is blocked before forwarding;
3. an out-of-scope agent call is blocked before forwarding;
4. rapid invoice enumeration is eventually blocked;
5. metrics and at least one Risk Card are emitted by the inference service.

For manual gateway testing, use a host header or host mapping:

```powershell
curl -H "Host: qroasis.gateway.test" -H "Authorization: Bearer demo-human-token" http://127.0.0.1:8080/invoices/inv-a-001
```

The upstream service has no published host port. It is available only on the
internal Compose network, forcing all external traffic through the Go gateway.

The frontend includes an authenticated security overview with live metrics,
identity trust, recent Risk Cards, and Ollama analyst status. The protected
gateway endpoints remain available for extending the console with investigation,
policy, and identity-management controls.

## Recommended next implementation milestone

Before connecting a browser dashboard or production gateway, finish the Python
security core around the existing engines:

1. Shared Pydantic contracts: `Identity`, `CallEvent`, `RiskCard`, `Policy`, and
   `DecisionResponse`.
2. Pure-Python orchestrator that evaluates graph → sequence → trust and returns
   one decision per event.
3. Identity registry/Agent Firewall, mock multi-tenant protected data, Risk Card
   builder, structured policy engine, attack simulator, and live metrics store.
4. Wire that orchestrator into an HTTP gateway and dashboard only after its
   end-to-end simulation tests are stable.

## MVP scope boundaries

The intended MVP does not require a trained GNN/Transformer, real OIDC provider,
Kubernetes deployment, outbound-trust broker, or general policy-language parser.
The priority is a reliable demo where a valid agent token performs an apparently
legal enumeration sequence, SENTRA detects the behavior, blocks the follow-up
request, and displays evidence explaining why.
