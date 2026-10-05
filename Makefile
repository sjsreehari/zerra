# Zerra — Developer Makefile
# Usage: make <target>
.PHONY: help start stop restart build logs test test-py test-go test-ts lint clean update

COMPOSE := docker compose -f compose.yaml

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\n\033[1mZerra developer targets:\033[0m\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# ── Stack management ─────────────────────────────────────────────────────────

start: ## Start all services (build if needed)
	$(COMPOSE) up -d --build
	@echo "\n✓ Zerra is running at http://localhost:3000\n"

stop: ## Stop all services
	$(COMPOSE) stop

restart: ## Restart all services
	$(COMPOSE) restart

down: ## Stop and remove containers (data preserved in volumes)
	$(COMPOSE) down

down-v: ## Stop and remove containers AND all data volumes (DESTRUCTIVE)
	$(COMPOSE) down -v

build: ## Build all Docker images without starting
	$(COMPOSE) build

logs: ## Stream logs from all services
	$(COMPOSE) logs -f

logs-inference: ## Stream inference service logs
	$(COMPOSE) logs -f inference

logs-gateway: ## Stream gateway service logs
	$(COMPOSE) logs -f gateway

# ── Development ───────────────────────────────────────────────────────────────

dev-inference: ## Run inference API locally (without Docker)
	cd . && python -m uvicorn agent.api:app --reload --port 8000

dev-dashboard: ## Run Next.js dashboard locally
	cd frontend && npm run dev

dev-cli: ## Run CLI in dev mode
	cd cli && tsx src/index.ts

# ── Testing ──────────────────────────────────────────────────────────────────

test: test-py test-ts ## Run all tests

test-py: ## Run Python agent tests
	python -m pytest agent/tests/ -v --tb=short --asyncio-mode=auto

test-py-fast: ## Run Python agent tests (fast mode, no output capture)
	python -m pytest agent/tests/ -v -x -s --asyncio-mode=auto

test-ts: ## Run TypeScript unit tests (Vitest)
	npm run test:unit

# ── Lint / format ─────────────────────────────────────────────────────────────

lint: ## Lint all code
	cd frontend && npm run lint

format-py: ## Format Python code with black
	python -m black agent/

typecheck: ## TypeScript typecheck
	npx tsc --noEmit

# ── Database ─────────────────────────────────────────────────────────────────

db-migrate: ## Run Prisma migrations
	npm run prisma:migrate

db-generate: ## Regenerate Prisma client
	npm run prisma:generate

# ── Release ──────────────────────────────────────────────────────────────────

tag-release: ## Tag a new release (VERSION=0.2.0 make tag-release)
ifndef VERSION
	$(error VERSION is required: make tag-release VERSION=0.2.0)
endif
	git tag -a "v$(VERSION)" -m "Release v$(VERSION)"
	git push origin "v$(VERSION)"
	@echo "\nTagged v$(VERSION) — GitHub Actions will build and publish automatically.\n"

# ── Utilities ────────────────────────────────────────────────────────────────

clean: ## Remove all build artifacts and caches
	rm -rf frontend/.next frontend/node_modules/.cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true

update: ## Pull latest and rebuild
	git pull --ff-only
	$(COMPOSE) pull
	$(COMPOSE) up -d --build --remove-orphans

doctor: ## Check all prerequisites
	@command -v docker >/dev/null 2>&1 && echo "✓ docker" || echo "✗ docker — https://docs.docker.com/get-docker/"
	@docker info >/dev/null 2>&1 && echo "✓ docker daemon running" || echo "✗ docker daemon not running — start Docker Desktop"
	@command -v git >/dev/null 2>&1 && echo "✓ git" || echo "✗ git — https://git-scm.com/downloads"
	@command -v python >/dev/null 2>&1 && echo "✓ python ($(shell python --version 2>&1))" || echo "✗ python"
	@command -v node >/dev/null 2>&1 && echo "✓ node ($(shell node --version 2>&1))" || echo "✗ node — https://nodejs.org"
