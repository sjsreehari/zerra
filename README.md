# Zerra / SENTRA

Zerra is the repository for the SENTRA security-platform prototype: a zero-trust
authorization layer intended to protect APIs, services, AI agents, and MCP
servers. SENTRA evaluates the identity, target object, and request sequence—not
only the current request—to decide whether to allow, step-up, or block access.

> Current state: the Python security engines are implemented and tested as
> standalone modules. The Go backend contains the beginning of a dynamic reverse
> proxy. The Next.js dashboard is still the starter application. The full
> request-to-inference-to-dashboard product flow has not yet been wired together.

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

For the Go gateway to enforce SENTRA decisions, start the Python service first and
set `SENTRA_INFERENCE_URL=http://127.0.0.1:8000` (this is also the default). Every
request to a registered proxy subdomain is evaluated before it can be forwarded;
`step_up` and `block` decisions are returned by the gateway instead of proxied.

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

The current frontend is the default Next.js screen. The next product milestone is
to replace it with the SENTRA dashboard: live request feed, per-identity trust
score, Risk Card feed, attack metrics, and agent kill-switch.

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
