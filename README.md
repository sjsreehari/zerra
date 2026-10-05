<div align="center">

<img src="docs/images/Minimal%20Zerra%20Eclipse%20Logo%20(1).png" alt="Zerra Banner" width="100%" style="border-radius: 12px; margin-bottom: 24px;" />

# Zerra: Local-First Blue-Team Security Scanner & Auto-PR Bot

**A local-first application security scanner running on your own workstation. It scans your repos for vulnerabilities and secrets, validates fixes in isolated sandboxes, and opens GitHub Pull Requests directly from your machine.**

[![CI](https://img.shields.io/github/actions/workflow/status/sjsreehari/zerra/ci.yml?style=flat-square&color=6366f1&label=CI&logo=githubactions&logoColor=white)](https://github.com/sjsreehari/zerra/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-GPL--3.0-6366f1?style=flat-square&logo=gnu&logoColor=white)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-6366f1?style=flat-square&logo=docker&logoColor=white)](compose.yaml)
[![Python](https://img.shields.io/badge/python-3.11%2B-6366f1?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Node](https://img.shields.io/badge/node-18%2B-6366f1?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Issues](https://img.shields.io/github/issues/sjsreehari/zerra?style=flat-square&color=6366f1&logo=github&logoColor=white)](https://github.com/sjsreehari/zerra/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-6366f1.svg?style=flat-square&logo=github&logoColor=white)](CONTRIBUTING.md)

*Local-first · Offline-capable · Non-destructive Git worktrees · Zero telemetry*

</div>

---

## What is Zerra?

**Zerra** is an open-source, local-first blue-team security platform. It provides a lightweight web dashboard and command-line interface that allows software engineers to audit their source code for security vulnerabilities, test automated fixes in disposable sandboxes, and push verified security pull requests to GitHub.

Unlike cloud SaaS security platforms that ingest your proprietary source code onto third-party servers:
- **Your code stays on your machine.** Scans and Git operations execute entirely locally.
- **Non-destructive Git automation.** Fixes are applied and tested inside temporary **`git worktree`** directories. Your live working tree is never modified or reset.
- **Hardware-backed secrets.** Tokens and keys are stored in your operating system's native keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service) with an authenticated AES-256-GCM (`scrypt` KDF) fallback.

---

## Core Capabilities

### 1. Multi-Engine Security Scanning
- **Static Analysis (SAST):** AST pattern scanning and Semgrep integration detecting SQL injection, command execution, path traversal, unsafe deserialization, and dangerous redirects.
- **High-Entropy Secret Detection:** Detects leaked AWS credentials, GitHub tokens, private keys, database connection strings, and generic secrets using Shannon entropy and regex signatures.
- **Dependency Audit (SCA):** Scans `requirements.txt`, `package.json`, and dependency locks for known CVEs via the Open Source Vulnerabilities (OSV) database.

### 2. Isolated Fix Synthesis & Testing
- **Non-Destructive Git Worktrees:** Fixes are prepared in isolated `git worktree` checkouts. Zerra never runs destructive `git reset --hard` or `git clean` in your workspace.
- **Flexible Fix Backends:** Generates patches using local **Ollama** models (100% private/offline), deterministic pattern replacements, or optional cloud LLMs (Anthropic Claude, OpenAI).
- **Ephemeral Docker Sandboxes:** Verifies that fixes compile and pass project tests inside disposable Docker containers with writable overlays.
- **Zero Force-Push Policy:** Branches are created with explicit commit history and pushed cleanly; Zerra never force-pushes or commits directly to `main`.

### 3. Developer Experience
- **Interactive Dashboard:** Modern Next.js interface on `http://localhost:3000` to review findings, browse SARIF reports, and trigger one-click fix PRs.
- **Zerra CLI:** Terminal companion for developers (`zerra scan`, `zerra doctor`, `zerra vault`).

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Local Machine (Your Device)                     │
│                                                                        │
│   ┌────────────────────────┐          ┌───────────────────────────┐    │
│   │   Next.js Dashboard    │          │    OS Credential Vault    │    │
│   │ (http://localhost:3000)│          │ (OS Keychain/AES-256-GCM) │    │
│   └───────────┬────────────┘          └─────────────┬─────────────┘    │
│               │ API Calls                           │ Credentials      │
│               ▼                                     ▼                  │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │               Zerra Core Agent (FastAPI on :8000)             │    │
│   │                                                               │    │
│   │  • SAST / SCA / Secret Scanner                                │    │
│   │  • Fix Synthesizer (Ollama local / Claude / GPT / Templates)  │    │
│   │  • Safe Git Worktree Engine                                   │    │
│   │  • Ephemeral Docker Sandbox Runner                            │    │
│   └───────────────────────────┬───────────────────────────────────┘    │
│                               │                                        │
│                               ▼                                        │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │              Isolated Git Worktree (Temporary)                │    │
│   │  • Branch: zerra/fix-<id> (Developer working tree untouched)  │    │
│   │  • Run project verification tests                             │    │
│   │  • Commit verified security patch                             │    │
│   └───────────────────────────┬───────────────────────────────────┘    │
└───────────────────────────────┼────────────────────────────────────────┘
                                │ Push Branch & Open PR (via GitHub API)
                                ▼
                   ┌──────────────────────────┐
                   │    GitHub Repository     │
                   │ (Pull Request for Review)│
                   └──────────────────────────┘
```

---

## Quickstart

### Method 1: Docker Compose (Recommended)

Start the agent and dashboard in two commands:

```bash
# 1. Clone repository
git clone https://github.com/sjsreehari/zerra.git
cd zerra

# 2. Start the stack
docker compose up -d

# 3. Open dashboard
# Browse to: http://localhost:3000
```

To configure optional GitHub token or AI fix backends, copy `.env.example` to `.env` and fill in your desired settings.

---

### Method 2: Native Local Development

Run the services natively on your workstation without Docker:

```bash
# Terminal 1: Python Agent (scanner & PR engine)
cd agent
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1 | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000

# Terminal 2: Next.js Dashboard
cd frontend
npm install
npm run dev

# Open http://localhost:3000 in your browser
```

---

### Method 3: Using the Zerra CLI

Scan any directory directly from your terminal:

```bash
# From the repo root
npm install
npm run build -w cli

# Run health check
node cli/dist/index.js doctor

# Scan a repository
node cli/dist/index.js scan /path/to/project
```

---

## Security Model: Credential Protection

1. **Least-Privilege GitHub Access:**
   - **Recommended:** Fine-grained Personal Access Tokens (PATs) scoped strictly to target repositories with minimal permissions (`Contents: Read & Write`, `Pull Requests: Read & Write`, `Issues: Read & Write`).
2. **Local Credential Storage:**
   - **Primary:** Operating System Keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service).
   - **Fallback:** AES-256-GCM encryption with keys derived via `scrypt` (salt + IV + 128-bit authentication tag), saved to a file restricted to user-only permissions (`0o600`).
   - **Zero telemetry:** Credentials are never transmitted to external analytics endpoints.
3. **Data Privacy Notice:**
   - If using cloud LLM backends (Anthropic Claude, OpenAI), the vulnerable code snippet is sent to the respective API provider. To run 100% offline and keep all code local, set `OLLAMA_BASE_URL` to your local Ollama instance.

---

## Contributing

We welcome contributions! Whether you are adding new AST security rules, improving test sandboxes, or polishing the dashboard:

1. Read our [CONTRIBUTING.md](CONTRIBUTING.md) guide.
2. Adhere to our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
3. Check out issues tagged [`good first issue`](https://github.com/sjsreehari/zerra/labels/good%20first%20issue) or [`help wanted`](https://github.com/sjsreehari/zerra/labels/help%20wanted).

---

## Security & Responsible Disclosure

If you discover a security vulnerability in Zerra, please do not file a public issue. Follow our responsible disclosure process detailed in [SECURITY.md](SECURITY.md) or email **isrosreehari@gmail.com**.

---

## License

Zerra is distributed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE) for details.
