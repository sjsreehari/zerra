<div align="center">

# 🛡️ Zerra

**Autonomous Continuous Security & Auto-PR Platform**

*Continuous SAST, SCA, and Secret scanning with automated Pull Request remediation and real-time incident delivery across WhatsApp, Discord, Microsoft Teams, and Email.*

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/badge/CI-Passing-emerald?style=flat-square&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![SARIF](https://img.shields.io/badge/OASIS_SARIF-2.1.0-orange?style=flat-square)](https://sarifweb.azurewebsites.net/)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

[Features](#-key-features) • [Quickstart](#-quickstart) • [CLI Scanner](#-cli-scanner) • [GitHub Action](#-github-action) • [Notification Channels](#-notification-channels) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## ⚡ Overview

**Zerra** is an open-source autonomous security engineering platform built to eliminate the gap between vulnerability detection and remediation. 

Rather than generating passive PDF reports, Zerra actively closes security debt:

1. **Continuous Code Auditing**: Automatically triggered via GitHub Webhooks on every push and pull request.
2. **Triple-Engine Detection**:
   - **Static Analysis (SAST)**: AST and pattern rules for SQLi, Command Injection, XSS, Path Traversal, and Insecure Deserialization.
   - **Dependency Scanning (SCA)**: Real-time CVE auditing across `npm`, `pip`, `go mod`, `maven`, and `cargo` ecosystems via OSV.dev.
   - **Secret Leak Detection**: High-precision regex and Shannon entropy analysis detecting 25+ secret and API credential formats.
3. **Automated Remediation (Auto-PR)**: Synthesizes verified replacement patches, cuts an isolated branch (`zerra/fix-<id>`), and opens a GitHub Pull Request with zero manual effort.
4. **Real-time Alert Dispatch**: Instantly notifies engineering and SOC teams on **WhatsApp**, **Discord**, **Microsoft Teams**, and **Email**.
5. **Standardized Compliance**: Full export support for OASIS SARIF 2.1.0 and CVSS v3.1 scoring.

---

## 🚀 Key Features

| Capability | Description |
| :--- | :--- |
| **🤖 Autonomous Fix PRs** | Automatically generates code patches and opens GitHub PRs complete with diff, risk explanation, and remediation guidance. |
| **🔍 Triple-Engine Scanner** | Full-spectrum analysis combining SAST, SCA, and Secret scanning in under 15 seconds. |
| **📱 Multi-Channel Push** | Native incident delivery to WhatsApp (Cloud API), Discord, MS Teams Adaptive Cards, and SMTP Email. |
| **🌐 Webhook-Native** | Zero-latency event triggers on GitHub `push` and `pull_request` hooks. |
| **🛡️ Zero-Trust Inline Defense** | High-performance reverse proxy mitigation with real-time identity trust scoring and sub-millisecond virtual patches. |
| **📊 OASIS SARIF 2.1.0** | Industry-standard export compatible with GitHub Code Scanning, GitLab Security, and CI/CD pipelines. |
| **💾 Persistent Storage** | Lightweight SQLite / PostgreSQL persistence with thread-safe WAL mode and pre-seeded demo telemetry. |
| **🎨 Modern Command Center** | Next.js 15 dark-mode dashboard with real-time posture grades (`A+` to `F`). |

---

## 🔄 How It Works

```text
[ Git Push / PR ] ──▶ [ Webhook Receiver ] ──▶ [ Triple-Engine Audit ]
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
         [ Automated Fix Generator ]                                     [ Multi-Channel Dispatcher ]
                      │                                                                   │
                      ▼                                                                   ▼
         [ Open Remediation PR ]                                        [ WhatsApp • Discord • Teams • Email ]
         (Branch: zerra/fix-xxx)                                        (Real-time CVSS Critical Alert)
```

---

## 🏁 Quickstart

### Option 1: Docker Compose (Production Stack)

Launch the complete Zerra platform (Python Intelligence Engine, Go Gateway, Next.js UI, and PostgreSQL) with a single command:

```bash
# Clone the repository
git clone https://github.com/sjsreehari/zerra.git
cd zerra

# Configure environment
cp .env.example .env

# Launch all services
docker-compose up -d --build
```

The unified management console will be available at **http://localhost:3000**.

---

### Option 2: Local Development

#### 1. Start the Scanner Engine (Port 8000)

```bash
cd agent
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Launch FastAPI server with SQLite persistence
uvicorn agent.api:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Start the Frontend Dashboard (Port 3000)

```bash
cd frontend
npm install
npm run dev
```

#### 3. Start the Zero-Trust Gateway (Port 8080) *(Optional)*

```bash
cd backend
go run main.go
```

---

## 💻 CLI Scanner

Scan any local repository or remote Git URL directly from your terminal:

```bash
# Scan current working directory
python -m agent.scanner.repo_scanner --path .

# Scan remote GitHub repository with Deep mode
python -m agent.scanner.repo_scanner --repo https://github.com/sjsreehari/zerra --mode deep

# Export findings to SARIF format
python -m agent.scanner.repo_scanner --path . --format sarif --output zerra-results.sarif
```

---

## 📦 GitHub Action Integration

Add continuous security auditing and automated PRs directly to your repository workflow:

```yaml
name: Zerra Security Audit

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Run Zerra Scanner
        run: |
          pip install -r agent/requirements.txt
          python -m agent.scanner.repo_scanner --path . --format sarif --output results.sarif

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

---

## 🔔 Notification Channels

Configure alerting credentials in `.env`:

### 💬 WhatsApp (Meta Cloud API)
```env
WHATSAPP_PHONE_NUMBER_ID="109876543210987"
WHATSAPP_ACCESS_TOKEN="EAAxxxxxxx..."
WHATSAPP_RECIPIENT="+14155552671"
```

### 🎮 Discord
```env
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/xxxx/yyyy"
```

### 👥 Microsoft Teams
```env
TEAMS_WEBHOOK_URL="https://outlook.office.com/webhook/xxxx/IncomingWebhook/yyyy"
```

### ✉️ Email (SMTP)
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="postmaster@yourdomain.com"
SMTP_PASSWORD="secret_password"
NOTIFICATION_EMAIL_TO="security-team@yourdomain.com"
```

Verify all configured channels instantly:
```bash
curl -X POST http://localhost:8000/v1/notifications/test
```

---

## 🤖 GitHub Auto-PR Configuration

To enable automated remediation PRs:

1. Create a GitHub Personal Access Token (PAT) with `repo` scope.
2. Export the token:
   ```bash
   export GITHUB_TOKEN="ghp_yourPersonalAccessTokenHere"
   ```
3. Register your repository in Zerra:
   ```bash
   curl -X POST http://localhost:8000/v1/repos \
     -H "Content-Type: application/json" \
     -d '{"url": "https://github.com/your-org/your-repo", "branch": "main", "auto_scan": true}'
   ```
4. Configure your repository webhook:
   ```
   Payload URL: http://your-zerra-host:8000/v1/webhooks/github
   Content type: application/json
   Events: Push & Pull requests
   ```

When a vulnerability is detected, Zerra commits the fix to branch `zerra/fix-<id>` and opens a comprehensive Pull Request with code diffs and explanation.

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/repos` | Register repository for webhook monitoring |
| `GET` | `/v1/repos` | List monitored repositories with security grades |
| `DELETE`| `/v1/repos/{id}` | Remove repository from monitoring |
| `POST` | `/v1/repos/{id}/scan` | Trigger immediate scan on repository |
| `POST` | `/v1/scan` | Direct ad-hoc scan without prior registration |
| `GET` | `/v1/scans` | List scan execution history |
| `GET` | `/v1/scans/{id}` | Retrieve scan details and full findings |
| `GET` | `/v1/scans/{id}/sarif` | Export OASIS SARIF 2.1.0 compliant report |
| `GET` | `/v1/findings` | Unified findings explorer with severity filter |
| `POST` | `/v1/findings/{id}/create-pr` | **Trigger automated GitHub Pull Request fix** |
| `POST` | `/v1/webhooks/github` | GitHub webhook receiver (push & PR events) |
| `POST` | `/v1/notifications/test` | Test active notification channels |
| `GET` | `/v1/dashboard/stats` | Executive metrics, posture score, and timeline |

---

## 🛡️ Supported Languages & Detection Matrix

| Category | Detectors | Target Ecosystems |
| :--- | :--- | :--- |
| **SAST** | AST & High-Precision Heuristics | Python, TypeScript, JavaScript, Go, Java, Dockerfile |
| **SCA** | OSV.dev CVE Vulnerability Database | npm (`package.json`), pip (`requirements.txt`), Go (`go.mod`), Maven (`pom.xml`), Cargo (`Cargo.toml`) |
| **Secrets** | Regex & Shannon Entropy Analysis | AWS Access Keys, Stripe Secret Keys, GitHub PATs, Slack Webhooks, OpenAI Keys, Private Keys, JWTs, Generic API Tokens |

---

## 🤝 Contributing

We welcome contributions from the cybersecurity and open-source community!

- Review [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup, code standards, and PR workflows.
- Please review our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

Zerra is licensed under the **[Apache License 2.0](LICENSE)**.
