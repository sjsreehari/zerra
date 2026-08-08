# Zerra / SENTRA Security Platform

**Zerra** is the core repository for **SENTRA**: a Zero-Trust Authorization & Security Intelligence Proxy designed to protect APIs, microservices, AI agents, and Model Context Protocol (MCP) servers. 

Unlike traditional static RBAC/ABAC or simple IP rate-limiters, SENTRA evaluates **identity, target object graph context, and temporal request sequences**—not just single isolated requests—to continuously adjust trust scores and enforce real-time access decisions (`ALLOW`, `STEP_UP`, or `BLOCK`).

---

## 🏗️ Architecture & Technical Flow

SENTRA operates as an inline security enforcement proxy positioned between external clients (humans, microservices, AI agents) and upstream protected services, paired with an out-of-band management console and security intelligence engine.

### High-Level System Architecture

```text
                  ┌─────────────────────────────────────────────────────────┐
                  │          Clients / AI Agents / MCP Servers / UI         │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                       1. Incoming HTTP Request (Host: customer.domain.com)
                                               │
                                               ▼
     ┌──────────────────────────────────────────────────────────────────────────┐
     │                      Go Gateway & Dynamic Reverse Proxy                  │
     │                      (backend/ - Port 8080 - Gin Web Framework)          │
     │  • Database Subdomain Host Lookup (subdomain ➔ api_base_url)             │
     │  • Authenticated JWT Session Cookie Engine (/api/v1/auth/*)              │
     │  • Subdomain Proxy Registration (/api/v1/proxy)                          │
     └────────────────────────────┬────────────────────────────┬────────────────┘
                                  │                            │
             2. Synchronous Risk Evaluation               5. Forwarded Traffic
             POST /v1/evaluate                            (Only if ALLOWED)
                                  │                            │
                                  ▼                            ▼
┌──────────────────────────────────────────────────┐ ┌───────────────────────────┐
│     SENTRA Intelligence Layer (Python Agent)     │ │ Private Upstream Service  │
│      (agent/ - Port 8000 - FastAPI + Pydantic)   │ │ (agent.upstream_api:app)  │
│                                                  │ │ • Port 8001 (Internal)   │
│  ┌────────────────────────────────────────────┐  │ │ • Multi-Tenant Sensitive  │
│  │ 1. Graph Risk Engine (NetworkX)            │  │ │   Endpoints (Invoices,    │
│  │    Multi-relation edges:                   │  │ │   User Records, Admin)    │
│  │    Identity ↔ Object ↔ Endpoint ↔ Tenant   │  │ └───────────────────────────┘
│  └─────────────────────┬──────────────────────┘  │
│                        │                         │
│  ┌─────────────────────▼──────────────────────┐  │
│  │ 2. Sequence Intent Scorer                  │  │
│  │    Per-identity sliding window state       │  │
│  │    Detects enumeration, 401/403 probing,   │  │
│  │    and Agent/MCP scope contract breaches   │  │
│  └─────────────────────┬──────────────────────┘  │
│                        │                         │
│  ┌─────────────────────▼──────────────────────┐  │
│  │ 3. Continuous Trust Score Engine           │  │
│  │    EWMA score (0-100), warm-up protection, │  │
│  │    hysteresis, verdict mapping             │  │
│  └─────────────────────┬──────────────────────┘  │
│                        │                         │
│  ┌─────────────────────▼──────────────────────┐  │
│  │ 4. Policy Engine & Risk Card Builder       │  │
│  │    Verdict: ALLOW | STEP_UP | BLOCK        │  │
│  └─────────────────────┬──────────────────────┘  │
│                        │                         │
│  ┌─────────────────────▼──────────────────────┐  │
│  │ 5. AI Threat Hunter (Ollama LLM)           │  │
│  │    Root cause analysis & threat reports    │  │
│  └────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────┘
                         │
         3. Decision Response (Verdict + Risk Card)
                         │
                         ▼
        4. Gateway Action:
           • ALLOW   => Forward request to Upstream Target
           • STEP_UP => Return HTTP 401/403 Challenge
           • BLOCK   => Block request immediately; return Risk Card evidence
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Next.js Security Console                              │
│               (frontend/ - Port 3000 - Next.js App Router + Tailwind)        │
│  • Live Threat Metrics & Identity Trust Score Monitor                        │
│  • Interactive Attack Simulator (Enumeration, Scope Breaches, Cross-Tenant)  │
│  • Risk Card Inspection & Ollama AI Threat Hunter Incident Reports           │
│  • Dynamic Policy Recommender & One-Click Policy Approval                    │
│  • Identity Kill-Switch (Revoke / Restore Identity Access)                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 End-to-End Request Evaluation Lifecycle

1. **Host Extraction & Subdomain Target Lookup**:
   - The Go Gateway intercepts an HTTP request (e.g. `http://qroasis.127.0.0.1:8080/invoices/inv-001`).
   - It extracts the `qroasis` subdomain and queries the PostgreSQL database (`proxy` table) to find the target `api_base_url` (e.g. `http://upstream:8001`).

2. **Synchronous Security Inference Call**:
   - If `SENTRA_INFERENCE_ENABLED=true`, the gateway sends a synchronous `POST /v1/evaluate` payload to the Python SENTRA inference engine (`:8000`).
   - The payload contains the normalized `CallEvent`: timestamp, bearer token/identity ID, identity type (`human`, `agent`, `mcp_server`), target object ID, endpoint path, HTTP method, and tenant ID.

3. **Triple-Engine Threat Evaluation Pipeline**:
   - **Graph Risk Engine (`agent/graph`)**: Maintains a NetworkX multi-relational graph tracking `Identity ↔ Object`, `Identity ↔ Endpoint`, and `Object ↔ Tenant` relations. Calculates graph risk scores based on novel object access, rapid fan-out across unseen objects, cross-tenant blast radius, and edge decay.
   - **Sequence Intent Scorer (`agent/sequential`)**: Maintains bounded, sliding-window request histories per identity. Stateful detectors flag attack chains (e.g., `enumerate` $\rightarrow$ `read` $\rightarrow$ `export`), brute-force credential/permission probing (repeated 401/403 calls), and AI Agent / MCP server scope violations.
   - **Trust Score Engine (`agent/trust`)**: Aggregates graph risk score, sequence risk score, auth strength, and sensitive field exposures into a continuous 0–100 score with Exponentially Weighted Moving Average (EWMA) smoothing, warm-up protection, and hysteresis.

4. **Verdict Enforcement & Risk Card Generation**:
   - The Policy Engine maps the continuous Trust Score and explicit policy rules to a final verdict:
     - `ALLOW` (Trust Score $\ge 70$, no hard rule violations)
     - `STEP_UP` ($40 \le$ Trust Score $< 70$, requires step-up authentication or elevated scope)
     - `BLOCK` (Trust Score $< 40$, cross-tenant access, or explicit policy violation)
   - For `BLOCK` or `STEP_UP` verdicts, SENTRA constructs a structured **Risk Card** containing evidence, graph metrics, sequence triggering indexes, and policy tags.

5. **Upstream Proxy Execution or Block**:
   - **Allowed**: The Go Gateway proxies the request to the upstream target URL, correctly setting host headers, passing request bodies, and rewriting absolute upstream redirect locations back to the gateway domain.
   - **Blocked / Stepped Up**: The Go Gateway halts execution immediately and returns `HTTP 403 Forbidden` (or 401) with the verdict and risk evidence. **The upstream target service is never contacted.**

6. **Analyst AI Threat Hunter & Dashboard Visibility**:
   - The Security Console (`:3000`) streams live metrics, active identity trust scores, and Risk Cards.
   - Operators can trigger an automated **AI Threat Hunter** investigation powered by Ollama (e.g., `llama3.2`) to generate plain-text and markdown incident reports, or approve auto-generated security policy recommendations.

---

## 📁 Repository Layout

```text
zerra/
├── agent/                         # Python Security Intelligence Layer & Inference API
│   ├── agents/                    # Threat Hunter LLM agent & investigation logic
│   ├── api.py                     # FastAPI REST server exposing /v1/evaluate & metrics
│   ├── attack_sim/                # Synthetic attack traffic generators & scenarios
│   ├── contracts/                 # Pydantic schemas (Identity, CallEvent, RiskCard, Policy)
│   ├── graph/                     # NetworkX Temporal Multi-Relation Graph Engine
│   ├── identity/                  # Identity registry and revocation state management
│   ├── llm/                       # Ollama LLM integration client & prompt engine
│   ├── main.py                    # Standalone CLI & demo engine bootstrap
│   ├── metrics/                   # Live risk, latency, and verdict telemetry collector
│   ├── mock_data/                 # Multi-tenant sample datastore for demo endpoints
│   ├── orchestrator/              # Master evaluation orchestrator (Graph ➔ Sequence ➔ Trust)
│   ├── policy/                    # Deterministic policy engine and rule evaluator
│   ├── policy_recommendations/    # Dynamic policy proposal engine based on Risk Cards
│   ├── reports/                   # Markdown incident report generator
│   ├── risk_cards/                # Risk Card builder and persistent storage
│   ├── sequential/                # Bounded sliding-window sequence intent detector
│   ├── tests/                     # Pytest suite for graph, sequence, and trust engines
│   ├── trust/                     # Continuous EWMA 0–100 Trust Score calculator
│   └── upstream_api.py            # Isolated mock upstream HTTP service (Port 8001)
│
├── backend/                       # Go Dynamic Reverse Proxy & Authentication Gateway
│   ├── cmd/                       # Gateway entry point and server bootstrapper
│   ├── internal/
│   │   ├── adapters/              # Gateway adapters (PostgreSQL, Proxy, Inference API)
│   │   ├── features/              # Feature modules (Auth/JWT, Subdomain, Security Scan)
│   │   └── interfaces/            # HTTP routes, middlewares, and handler bindings
│   ├── migrations/                # SQL schema migrations (subdomain proxy table)
│   └── Dockerfile                 # Multi-stage Go production container build
│
├── frontend/                      # Next.js Web Security Console
│   ├── app/                       # Next.js 15 App Router pages & API clients
│   │   ├── dashboard/             # Main threat overview, identities, attack-sim, risk-cards
│   │   ├── landing/               # Product landing page
│   │   ├── login/ & register/     # Authenticated console access routes
│   │   └── globals.css            # Custom CSS & UI styling token system
│   └── Dockerfile                 # Frontend container build script
│
├── docker/                        # Production & local infrastructure configurations
│   └── nginx/                     # Nginx edge reverse proxy configuration
│
├── tests/                         # End-to-end integration & system validation
│   └── e2e_pipeline.py            # Comprehensive real-HTTP Compose integration test script
│
├── compose.yaml                   # Complete multi-container Docker Compose orchestration
├── .env.example                   # Master environment configuration template
└── README.md                      # End-to-end project documentation
```

---

## 🛠️ Tech Stack & Requirements

- **Go 1.22+**: High-performance dynamic reverse proxy gateway (`Gin` web framework, `lib/pq`).
- **Python 3.11+**: Inference service, threat engines (`FastAPI`, `Pydantic v2`, `NetworkX`, `Uvicorn`, `Pytest`).
- **Next.js 15 (React 19)**: Security console dashboard (`TypeScript`, `Tailwind CSS`, `Lucide Icons`).
- **PostgreSQL 16**: Database storage for subdomain routing maps and user auth records.
- **Docker & Docker Compose**: Unified multi-container deployment pipeline.
- **Ollama (Optional)**: Local LLM runtime (e.g. `llama3.2`) for AI Threat Hunter investigations.

---

## 🚀 Quickstart Guide

### 1. Configure Runtime Environment

Copy `.env.example` to create your local `.env` file:

```powershell
cp .env.example .env
```

Default local `.env` settings:

```env
OLLAMA_BASE_URL=https://CHANGE_ME-ollama-tunnel.example
OLLAMA_MODEL=llama3.2
JWT_SECRET=CHANGE_ME_USE_A_LONG_RANDOM_SECRET
JWT_TTL_HOURS=24
POSTGRES_DB=sentra
POSTGRES_USER=sentra
POSTGRES_PASSWORD=sentra-local-only
DB_CONN_STR=postgres://sentra:sentra-local-only@postgres:5432/sentra?sslmode=disable
ENVIRONMENT=development
BASE_DOMAIN=127.0.0.1
SENTRA_INFERENCE_URL=http://inference:8000
SENTRA_INFERENCE_ENABLED=true
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

### Option A: Complete Docker Compose Stack (Recommended)

Launch the entire SENTRA stack with PostgreSQL, Python inference, private upstream, Go gateway, Nginx, and Next.js frontend console:

```powershell
docker compose --profile frontend up --build -d
```

Check running services:

| Service | Host Port | Description |
| :--- | :--- | :--- |
| **Go Gateway** | `http://localhost:8080` | Dynamic Reverse Proxy & Auth API |
| **Inference API** | `http://localhost:8000` | Python SENTRA Security Intelligence API |
| **Security Console** | `http://localhost:3000` | Next.js Dashboard UI |
| **Edge Nginx** | `http://localhost:80` | Optional Edge Web Proxy |
| **Upstream API** | Internal (`8001`) | Isolated Private Mock Service |
| **PostgreSQL** | Internal (`5432`) | Proxy & Auth Database |

To tear down the environment:

```powershell
docker compose down -v
```

---

### Option B: Standalone Manual Execution

If you wish to run the components independently for development:

#### Step 1: Start the Python Intelligence Service

```powershell
# In terminal 1
uvicorn agent.api:app --host 127.0.0.1 --port 8000 --reload
```

#### Step 2: Start PostgreSQL & Run the Go Backend Gateway

Ensure PostgreSQL is running and migrations are applied, then:

```powershell
# In terminal 2
$env:DB_CONN_STR="postgres://sentra:sentra-local-only@127.0.0.1:5432/sentra?sslmode=disable"
$env:SENTRA_INFERENCE_ENABLED="true"
$env:SENTRA_INFERENCE_URL="http://127.0.0.1:8000"
cd backend
go run ./cmd
```

#### Step 3: Start the Next.js Dashboard

```powershell
# In terminal 3
cd frontend
npm install
npm run dev
```

---

## 🧪 End-to-End Testing & Verification

### 1. Run Automated Real-HTTP Integration Pipeline

The E2E test script performs real HTTP requests against the live Go Gateway, Python Inference Engine, and Upstream API to verify security enforcement:

```powershell
python tests/e2e_pipeline.py
```

**Verified Scenarios in E2E Pipeline**:
1. User registration & HTTP-only JWT auth cookie issuance.
2. Registering a custom subdomain proxy route (`qroasis` $\rightarrow$ `http://upstream:8001`).
3. Permitted human user request passing through Go $\rightarrow$ Python $\rightarrow$ Private Upstream.
4. Cross-tenant access attempt returning `HTTP 403 Forbidden` (`verdict: block`).
5. Out-of-scope Agent call blocked before reaching upstream.
6. High-frequency invoice enumeration attack detected and blocked in real-time.
7. Telemetry recording & Risk Card emission verified.

### 2. Run Python Security Unit & Integration Tests

```powershell
python -B -m pytest -p no:cacheprovider agent -q
```

---

## 🌐 Dynamic Reverse Proxy & Subdomain Registration

The Go Gateway dynamically routes incoming subdomain requests to their configured upstream backends.

### Register an Upstream Backend

Send a `POST` request to the Go Gateway:

```http
POST /api/v1/proxy HTTP/1.1
Host: 127.0.0.1:8080
Content-Type: application/json

{
  "subdomain": "qroasis",
  "api_base_url": "http://upstream:8001"
}
```

### Test Subdomain Routing via Host Headers

Using `curl`:

```bash
# Request via Host header
curl -H "Host: qroasis.127.0.0.1:8080" \
     -H "Authorization: Bearer demo-human-token" \
     http://127.0.0.1:8080/invoices/inv-a-001
```

Or using `curl --resolve`:

```bash
curl --resolve qroasis.127.0.0.1:8080:127.0.0.1 \
     -H "Authorization: Bearer demo-human-token" \
     http://qroasis.127.0.0.1:8080/invoices/inv-a-001
```

---

## 📡 API Endpoint Reference Matrix

### Go Gateway (`http://localhost:8080`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new admin/operator user account | No |
| `POST` | `/api/v1/auth/login` | Login user & issue HTTP-only JWT cookie | No |
| `POST` | `/api/v1/auth/logout` | Revoke session cookie | Yes |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Cookie |
| `POST` | `/api/v1/proxy` | Register dynamic subdomain upstream proxy route | Cookie |
| `GET` | `/*` | Host-header based reverse proxy route | Bearer Token / Session |

### Python Inference API (`http://localhost:8000`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Inference service health check |
| `POST` | `/v1/evaluate` | Synchronous event risk scoring endpoint |
| `GET` | `/v1/metrics` | Snapshot of operational metrics & latency |
| `GET` | `/v1/risk-cards` | Retrieve recent security Risk Cards |
| `POST` | `/v1/risk-cards/{id}/investigate` | Trigger Ollama AI Threat Hunter investigation |
| `POST` | `/v1/risk-cards/{id}/policy-recommendation` | Generate adaptive policy proposal |
| `POST` | `/v1/policy-recommendations/{id}/approve` | Approve and activate policy proposal |
| `GET` | `/v1/identities` | List monitored identities and trust scores |
| `POST` | `/v1/identities/{id}/revoke` | Instantly kill/revoke an identity's access |
| `POST` | `/v1/identities/{id}/restore` | Restore access for a revoked identity |

---

## 🛡️ Target Scope & Security Guarantees

SENTRA is specifically engineered for modern API, microservice, and AI/MCP workloads:
- **Zero-Trust for AI Agents & MCP**: Evaluates scope contracts to ensure autonomous agents do not exceed authorized API boundaries or perform out-of-sequence actions.
- **Continuous Trust Scoring**: Replaces static binary permissions with continuous 0–100 risk scoring.
- **Upstream Shielding**: Upstream backend microservices remain on isolated private networks; unauthorized or malicious traffic is blocked at the gateway, shielding upstream infrastructure from load and zero-day exploitation.

---

## 📄 License

This repository is proprietary software developed for the SENTRA zero-trust authorization prototype.
