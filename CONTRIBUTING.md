# Contributing to Zerra

Thank you for your interest in contributing to **Zerra**! We welcome bug reports, feature proposals, rule enhancements, and pull requests from everyone.

---

## 🧭 Code of Conduct

All contributors and maintainers are expected to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to `security@zerra.dev`.

---

## 🛠️ Development Setup

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Go 1.22+** *(optional, for reverse proxy development)*
- **Git**

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/sjsreehari/zerra.git
cd zerra

# Setup Python Scanner Engine
cd agent
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Run Python unit tests
pytest

# Setup Frontend Console
cd ../frontend
npm install
npm run dev
```

---

## 🌿 Branch & Commit Guidelines

- Work on meaningful feature branches branching from `main`:
  `feat/new-sast-rule`, `fix/webhook-hmac`, `docs/readme-update`
- Follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat(scanner): add Go SQL injection AST detector`
  - `fix(notifications): handle WhatsApp Cloud API rate limits`
  - `docs(readme): add docker-compose usage guide`
  - `refactor(db): optimize finding query indices`

---

## 🔍 Adding New Security Rules

Security rules are located in `agent/scanner/rules/` and `agent/scanner/sast.py`.

When contributing a new rule, please provide:
1. Clear rule identifier (e.g. `python-sql-injection-cursor`)
2. Severity mapping (`critical`, `high`, `medium`, `low`, `info`)
3. CWE identifier (e.g. `CWE-89`) and OWASP category
4. Automated fix suggestion template in `agent/integrations/fix_generator.py`
5. Test fixture demonstrating both positive detection and non-matching safe patterns in `agent/tests/`

---

## 🧪 Testing

Before submitting your PR, verify all suites pass:

```bash
# Run backend test suite
cd agent
pytest tests/ -v

# Run frontend typecheck and lint
cd ../frontend
npm run build
```

---

## 🔒 Security Vulnerabilities

If you discover a security vulnerability within Zerra itself, **do not open a public GitHub issue**.
Please email details to `security@zerra.dev` or use GitHub's private vulnerability reporting feature.
We will respond within 24 hours.
