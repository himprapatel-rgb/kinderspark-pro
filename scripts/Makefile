# ==============================================================================
# KinderSpark Pro — Makefile
# ==============================================================================
# All Railway operations in one place.
#
# Prerequisites:
#   npm install -g @railway/cli
#   export RAILWAY_TOKEN=<your-token>
#   export ANTHROPIC_API_KEY=sk-ant-api03-...   (for AI tutor)
#
# Usage:
#   make setup           # First-time: provision Railway project + services + DB
#   make deploy          # Deploy both backend and frontend
#   make deploy-backend  # Deploy backend only
#   make deploy-frontend # Deploy frontend only
#   make seed            # Seed the database with demo data
#   make status          # Show Railway project + service status
#   make logs-backend    # Stream backend logs
#   make logs-frontend   # Stream frontend logs
#   make migrate         # Run Prisma migrations (production)
#   make wire-urls       # Re-sync cross-service URLs
#   make env-backend     # Print backend environment variables
#   make env-frontend    # Print frontend environment variables
#   make health          # HTTP health check on backend /health endpoint
#   make gh-secrets      # Push secrets to GitHub Actions
#   make gh-trigger      # Manually trigger GitHub Actions deploy workflow
#   make open            # Open Railway dashboard in browser
#   make install         # Install Railway CLI globally
#   make help            # Show this help text
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPTS_DIR    := $(shell cd "$(dir $(abspath $(lastword $(MAKEFILE_LIST))))" && pwd)
REPO_ROOT      := $(shell cd "$(SCRIPTS_DIR)/.." && pwd)
BACKEND_DIR    := $(REPO_ROOT)/backend
FRONTEND_DIR   := $(REPO_ROOT)/frontend

# ── Service names ──────────────────────────────────────────────────────────────
BACKEND_SVC    := kinderspark-backend
FRONTEND_SVC   := kinderspark-frontend
GH_REPO        := himprapatel-rgb/kinderspark-pro

# ── Colours ────────────────────────────────────────────────────────────────────
BOLD   := \033[1m
CYAN   := \033[0;36m
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
RESET  := \033[0m

# ==============================================================================
# Guards
# ==============================================================================
.PHONY: _require-railway _require-token

_require-railway:
	@command -v railway >/dev/null 2>&1 || { \
	  echo -e "$(RED)[ERROR]$(RESET) Railway CLI not found. Run: make install"; exit 1; }

_require-token: _require-railway
	@railway whoami >/dev/null 2>&1 || { \
	  echo -e "$(RED)[ERROR]$(RESET) Not authenticated."; \
	  echo "  Run: railway login   OR   export RAILWAY_TOKEN=<token>"; \
	  exit 1; }

# ==============================================================================
# install — Install Railway CLI
# ==============================================================================
.PHONY: install
install: ## Install Railway CLI globally via npm
	@echo -e "$(CYAN)Installing Railway CLI...$(RESET)"
	npm install -g @railway/cli
	@echo -e "$(GREEN)Installed: $$(railway --version)$(RESET)"

# ==============================================================================
# setup — First-time provisioning
# ==============================================================================
.PHONY: setup
setup: ## FIRST TIME: provision Railway project, PostgreSQL, backend, frontend, env vars
	@echo -e "$(BOLD)$(CYAN)Running full Railway project setup...$(RESET)"
	@bash "$(SCRIPTS_DIR)/setup-railway.sh"

# ==============================================================================
# deploy — Deploy services
# ==============================================================================
.PHONY: deploy
deploy: _require-token ## Deploy BOTH backend and frontend to Railway
	@bash "$(SCRIPTS_DIR)/deploy.sh" both

.PHONY: deploy-backend
deploy-backend: _require-token ## Deploy backend service only
	@bash "$(SCRIPTS_DIR)/deploy.sh" backend

.PHONY: deploy-frontend
deploy-frontend: _require-token ## Deploy frontend service only
	@bash "$(SCRIPTS_DIR)/deploy.sh" frontend

# ==============================================================================
# seed & migrate — Database operations
# ==============================================================================
.PHONY: seed
seed: _require-token ## Seed the database with demo data (school/teacher/students/homework)
	@echo -e "$(CYAN)Seeding database via Railway...$(RESET)"
	@bash "$(SCRIPTS_DIR)/seed.sh" --railway

.PHONY: seed-local
seed-local: ## Seed locally (requires DATABASE_URL env var to be set)
	@[ -n "$$DATABASE_URL" ] || { echo -e "$(RED)[ERROR]$(RESET) Set DATABASE_URL first."; exit 1; }
	@bash "$(SCRIPTS_DIR)/seed.sh" --local

.PHONY: migrate
migrate: _require-token ## Run Prisma migrations against production PostgreSQL
	@echo -e "$(CYAN)Running database migrations...$(RESET)"
	@cd "$(REPO_ROOT)" && \
	  railway run --service "$(BACKEND_SVC)" -- sh -c "cd /app && npx prisma migrate deploy"
	@echo -e "$(GREEN)Migrations complete.$(RESET)"

.PHONY: migrate-status
migrate-status: _require-token ## Show current Prisma migration status
	@cd "$(REPO_ROOT)" && \
	  railway run --service "$(BACKEND_SVC)" -- sh -c "cd /app && npx prisma migrate status"

# ==============================================================================
# status & health
# ==============================================================================
.PHONY: status
status: _require-token ## Show Railway project status and service domains
	@echo -e "$(BOLD)$(CYAN)Railway Project Status$(RESET)"
	@echo -e "$(CYAN)──────────────────────────────────────$(RESET)"
	@cd "$(REPO_ROOT)" && railway status
	@echo ""
	@echo -e "$(BOLD)Service Domains:$(RESET)"
	@cd "$(REPO_ROOT)" && \
	  printf "  %-12s: " "Backend" && \
	  (railway domain --service "$(BACKEND_SVC)" 2>/dev/null | head -1 || echo "(not yet assigned)")
	@cd "$(REPO_ROOT)" && \
	  printf "  %-12s: " "Frontend" && \
	  (railway domain --service "$(FRONTEND_SVC)" 2>/dev/null | head -1 || echo "(not yet assigned)")

.PHONY: health
health: _require-token ## HTTP health check against backend /health endpoint
	@DOMAIN=$$(cd "$(REPO_ROOT)" && \
	  railway domain --service "$(BACKEND_SVC)" 2>/dev/null | head -1); \
	  [ -n "$$DOMAIN" ] || { \
	    echo -e "$(RED)[ERROR]$(RESET) Backend domain not available yet."; exit 1; }; \
	  URL="https://$$DOMAIN/health"; \
	  echo -e "$(CYAN)GET $$URL$(RESET)"; \
	  STATUS=$$(curl -s -o /dev/null -w "%{http_code}" "$$URL"); \
	  if [ "$$STATUS" = "200" ]; then \
	    echo -e "$(GREEN)Health check PASSED (HTTP $$STATUS)$(RESET)"; \
	  else \
	    echo -e "$(RED)Health check FAILED (HTTP $$STATUS)$(RESET)"; exit 1; \
	  fi

# ==============================================================================
# logs
# ==============================================================================
.PHONY: logs-backend
logs-backend: _require-token ## Stream backend service logs (Ctrl+C to stop)
	cd "$(REPO_ROOT)" && railway logs --service "$(BACKEND_SVC)"

.PHONY: logs-frontend
logs-frontend: _require-token ## Stream frontend service logs (Ctrl+C to stop)
	cd "$(REPO_ROOT)" && railway logs --service "$(FRONTEND_SVC)"

.PHONY: logs-db
logs-db: _require-token ## Stream PostgreSQL plugin logs (Ctrl+C to stop)
	cd "$(REPO_ROOT)" && railway logs --service PostgreSQL

# ==============================================================================
# env vars
# ==============================================================================
.PHONY: env-backend
env-backend: _require-token ## Print all backend environment variables
	@echo -e "$(BOLD)Backend env ($(BACKEND_SVC)):$(RESET)"
	@cd "$(REPO_ROOT)" && railway variables --service "$(BACKEND_SVC)"

.PHONY: env-frontend
env-frontend: _require-token ## Print all frontend environment variables
	@echo -e "$(BOLD)Frontend env ($(FRONTEND_SVC)):$(RESET)"
	@cd "$(REPO_ROOT)" && railway variables --service "$(FRONTEND_SVC)"

.PHONY: set-anthropic-key
set-anthropic-key: _require-token ## Set ANTHROPIC_API_KEY in backend (export ANTHROPIC_API_KEY=... first)
	@[ -n "$$ANTHROPIC_API_KEY" ] || { \
	  echo -e "$(RED)[ERROR]$(RESET) Export ANTHROPIC_API_KEY first."; exit 1; }
	@cd "$(REPO_ROOT)" && \
	  railway variables set ANTHROPIC_API_KEY="$$ANTHROPIC_API_KEY" \
	    --service "$(BACKEND_SVC)"
	@echo -e "$(GREEN)ANTHROPIC_API_KEY updated in backend.$(RESET)"

.PHONY: wire-urls
wire-urls: _require-token ## Sync FRONTEND_URL and NEXT_PUBLIC_API_URL between services
	@BACKEND=$$(cd "$(REPO_ROOT)" && \
	    railway domain --service "$(BACKEND_SVC)" 2>/dev/null | head -1); \
	  FRONTEND=$$(cd "$(REPO_ROOT)" && \
	    railway domain --service "$(FRONTEND_SVC)" 2>/dev/null | head -1); \
	  if [ -n "$$BACKEND" ] && [ -n "$$FRONTEND" ]; then \
	    cd "$(REPO_ROOT)"; \
	    railway variables set FRONTEND_URL="https://$$FRONTEND" \
	      --service "$(BACKEND_SVC)"; \
	    railway variables set NEXT_PUBLIC_API_URL="https://$$BACKEND/api" \
	      --service "$(FRONTEND_SVC)"; \
	    echo -e "$(GREEN)URLs wired:$(RESET)"; \
	    echo "  Backend API  : https://$$BACKEND/api"; \
	    echo "  Frontend URL : https://$$FRONTEND"; \
	  else \
	    echo -e "$(YELLOW)[WARN]$(RESET) Domains not yet assigned. Try again in a few minutes."; \
	  fi

# ==============================================================================
# remote shell
# ==============================================================================
.PHONY: shell-backend
shell-backend: _require-token ## Open an interactive shell in the backend Railway service
	cd "$(REPO_ROOT)" && railway shell --service "$(BACKEND_SVC)"

.PHONY: shell-frontend
shell-frontend: _require-token ## Open an interactive shell in the frontend Railway service
	cd "$(REPO_ROOT)" && railway shell --service "$(FRONTEND_SVC)"

# ==============================================================================
# local dev
# ==============================================================================
.PHONY: dev-backend
dev-backend: ## Run backend locally in dev mode (ts-node-dev)
	@echo -e "$(CYAN)Starting backend dev server on :4000 ...$(RESET)"
	cd "$(BACKEND_DIR)" && \
	  { [ -d node_modules ] || npm ci; } && \
	  npx prisma generate && \
	  npm run dev

.PHONY: dev-frontend
dev-frontend: ## Run frontend locally in dev mode (next dev on :3000)
	@echo -e "$(CYAN)Starting frontend dev server on :3000 ...$(RESET)"
	cd "$(FRONTEND_DIR)" && \
	  { [ -d node_modules ] || npm ci; } && \
	  npm run dev

.PHONY: build-backend
build-backend: ## TypeScript build check for backend
	cd "$(BACKEND_DIR)" && npm ci && npx prisma generate && npm run build
	@echo -e "$(GREEN)Backend build OK.$(RESET)"

.PHONY: build-frontend
build-frontend: ## Next.js build check for frontend (set NEXT_PUBLIC_API_URL if needed)
	cd "$(FRONTEND_DIR)" && npm ci && npm run build
	@echo -e "$(GREEN)Frontend build OK.$(RESET)"

.PHONY: docker-up
docker-up: ## Start full stack locally with docker-compose
	cd "$(REPO_ROOT)" && docker-compose up --build

.PHONY: docker-down
docker-down: ## Stop local docker-compose stack
	cd "$(REPO_ROOT)" && docker-compose down

# ==============================================================================
# GitHub
# ==============================================================================
.PHONY: gh-secrets
gh-secrets: _require-token ## Push all secrets to GitHub Actions (requires gh CLI)
	@command -v gh >/dev/null 2>&1 || { \
	  echo -e "$(RED)[ERROR]$(RESET) gh CLI required: https://cli.github.com"; exit 1; }
	@BACKEND=$$(cd "$(REPO_ROOT)" && \
	    railway domain --service "$(BACKEND_SVC)" 2>/dev/null | head -1); \
	  FRONTEND=$$(cd "$(REPO_ROOT)" && \
	    railway domain --service "$(FRONTEND_SVC)" 2>/dev/null | head -1); \
	  [ -n "$$RAILWAY_TOKEN" ] && \
	    gh secret set RAILWAY_TOKEN --body "$$RAILWAY_TOKEN" --repo "$(GH_REPO)"; \
	  [ -n "$$ANTHROPIC_API_KEY" ] && \
	    gh secret set ANTHROPIC_API_KEY --body "$$ANTHROPIC_API_KEY" --repo "$(GH_REPO)"; \
	  [ -n "$$BACKEND" ] && \
	    gh secret set BACKEND_URL --body "https://$$BACKEND" --repo "$(GH_REPO)" && \
	    gh secret set NEXT_PUBLIC_API_URL --body "https://$$BACKEND/api" --repo "$(GH_REPO)"; \
	  [ -n "$$FRONTEND" ] && \
	    gh secret set FRONTEND_URL --body "https://$$FRONTEND" --repo "$(GH_REPO)"; \
	  echo -e "$(GREEN)GitHub Actions secrets updated.$(RESET)"

.PHONY: gh-trigger
gh-trigger: ## Trigger GitHub Actions deploy.yml manually (requires gh CLI)
	@command -v gh >/dev/null 2>&1 || { \
	  echo -e "$(RED)[ERROR]$(RESET) gh CLI required."; exit 1; }
	gh workflow run deploy.yml --repo "$(GH_REPO)" --ref main
	@echo -e "$(GREEN)Workflow triggered:$(RESET)"
	@echo "  https://github.com/$(GH_REPO)/actions"

.PHONY: gh-trigger-curl
gh-trigger-curl: ## Trigger GitHub Actions deploy.yml via curl (requires GITHUB_TOKEN)
	@[ -n "$$GITHUB_TOKEN" ] || { \
	  echo -e "$(RED)[ERROR]$(RESET) Export GITHUB_TOKEN first."; exit 1; }
	@bash "$(SCRIPTS_DIR)/trigger-deploy.sh"

# ==============================================================================
# open
# ==============================================================================
.PHONY: open
open: ## Open Railway dashboard in browser
	@URL="https://railway.app/dashboard"; \
	  command -v xdg-open >/dev/null 2>&1 && xdg-open "$$URL" || \
	  command -v open     >/dev/null 2>&1 && open     "$$URL" || \
	  echo "Open: $$URL"

.PHONY: open-app
open-app: _require-token ## Open the live KinderSpark Pro app in browser
	@DOMAIN=$$(cd "$(REPO_ROOT)" && \
	  railway domain --service "$(FRONTEND_SVC)" 2>/dev/null | head -1); \
	  if [ -n "$$DOMAIN" ]; then \
	    URL="https://$$DOMAIN"; \
	    echo "Opening $$URL"; \
	    command -v xdg-open >/dev/null 2>&1 && xdg-open "$$URL" || \
	    command -v open     >/dev/null 2>&1 && open     "$$URL" || \
	    echo "Open: $$URL"; \
	  else \
	    echo -e "$(YELLOW)Frontend domain not yet available.$(RESET)"; \
	  fi

# ==============================================================================
# help
# ==============================================================================
.PHONY: help
help: ## Show all available make targets
	@echo ""
	@echo -e "$(BOLD)$(CYAN)KinderSpark Pro — Makefile Targets$(RESET)"
	@echo -e "$(CYAN)════════════════════════════════════════════$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  grep -v '^_' | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BOLD)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)Quick start:$(RESET)"
	@echo "  export RAILWAY_TOKEN=<token>"
	@echo "  export ANTHROPIC_API_KEY=sk-ant-..."
	@echo "  make -f scripts/Makefile setup"
	@echo "  make -f scripts/Makefile seed"
	@echo "  make -f scripts/Makefile status"
	@echo ""
	@echo -e "$(BOLD)Repo:$(RESET)  https://github.com/$(GH_REPO)"
	@echo -e "$(BOLD)Docs:$(RESET)  $(REPO_ROOT)/RAILWAY.md"
	@echo ""
