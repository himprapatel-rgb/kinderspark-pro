#!/usr/bin/env bash
# ==============================================================================
# KinderSpark Pro — Full Railway CLI Setup Script
# ==============================================================================
# Provisions the entire Railway project from scratch:
#   - Railway project creation / linking
#   - PostgreSQL plugin
#   - Backend service (kinderspark-backend, root: /backend)
#   - Frontend service (kinderspark-frontend, root: /frontend)
#   - All environment variables and cross-service wiring
#   - Optional: GitHub Actions secrets via gh CLI
#
# Usage:
#   export RAILWAY_TOKEN=<your-token>          # required
#   export ANTHROPIC_API_KEY=sk-ant-api03-...  # required for AI tutor
#   export JWT_SECRET=<strong-secret>          # auto-generated if omitted
#   ./scripts/setup-railway.sh
# ==============================================================================
set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
section() {
  echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  $*${NC}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════${NC}"
}

# ── Resolve repo root ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Configuration ──────────────────────────────────────────────────────────────
PROJECT_NAME="${RAILWAY_PROJECT_NAME:-kinderspark-pro}"
BACKEND_SERVICE="kinderspark-backend"
FRONTEND_SERVICE="kinderspark-frontend"
GH_REPO="himprapatel-rgb/kinderspark-pro"

# ── Generate JWT secret if not provided ───────────────────────────────────────
if [ -z "${JWT_SECRET:-}" ]; then
  if command -v openssl >/dev/null 2>&1; then
    JWT_SECRET="$(openssl rand -hex 32)"
  else
    JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  fi
  warn "JWT_SECRET was not set — generated: $JWT_SECRET"
  warn "Save this! Add it to .env and keep it consistent across re-deploys."
fi

# ==============================================================================
section "1 / 8 — Prerequisites"
# ==============================================================================

command -v node >/dev/null 2>&1 || error "Node.js is required. Install from https://nodejs.org"
command -v npm  >/dev/null 2>&1 || error "npm is required."
command -v git  >/dev/null 2>&1 || error "git is required."
success "node $(node --version), npm $(npm --version)"

if ! command -v railway >/dev/null 2>&1; then
  info "Installing Railway CLI globally..."
  npm install -g @railway/cli
  success "Railway CLI installed: $(railway --version)"
else
  success "Railway CLI: $(railway --version)"
fi

# ==============================================================================
section "2 / 8 — Railway Authentication"
# ==============================================================================

if [ -z "${RAILWAY_TOKEN:-}" ]; then
  warn "RAILWAY_TOKEN not set. Launching browser login..."
  railway login
  success "Logged in via browser."
else
  info "Using RAILWAY_TOKEN from environment."
  railway whoami >/dev/null 2>&1 || \
    error "RAILWAY_TOKEN is invalid. Get one at: https://railway.app/account/tokens"
  success "Token valid. Authenticated as: $(railway whoami 2>/dev/null || echo 'unknown')"
fi

# ==============================================================================
section "3 / 8 — Project Setup"
# ==============================================================================

cd "$REPO_ROOT"

if railway status >/dev/null 2>&1; then
  success "Already linked to an existing Railway project."
  railway status
else
  info "Creating new Railway project: $PROJECT_NAME"
  railway init --name "$PROJECT_NAME"
  success "Project '$PROJECT_NAME' created."
fi

# ==============================================================================
section "4 / 8 — PostgreSQL Database"
# ==============================================================================

info "Provisioning PostgreSQL plugin..."
railway add --plugin postgresql 2>&1 | grep -q "already" && \
  warn "PostgreSQL already exists — skipping." || \
  success "PostgreSQL plugin added."

info "Waiting 10 s for DATABASE_URL to propagate..."
sleep 10

DATABASE_URL=""
# Try python3 first, then node
if command -v python3 >/dev/null 2>&1; then
  DATABASE_URL="$(railway variables --service PostgreSQL --json 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('DATABASE_URL',''))" \
    2>/dev/null || true)"
fi
if [ -z "$DATABASE_URL" ]; then
  DATABASE_URL="$(railway variables --service PostgreSQL --json 2>/dev/null \
    | node -e "let d=''; \
       process.stdin.on('data',c=>d+=c); \
       process.stdin.on('end',()=>{ \
         try{const o=JSON.parse(d);console.log(o.DATABASE_URL||'')} \
         catch{console.log('')} \
       })" 2>/dev/null || true)"
fi

if [ -z "$DATABASE_URL" ]; then
  warn "Could not auto-read DATABASE_URL. After setup, find it in:"
  warn "  Railway dashboard → PostgreSQL plugin → Variables → DATABASE_URL"
  warn "Then run: railway variables set DATABASE_URL=<value> --service $BACKEND_SERVICE"
else
  success "DATABASE_URL obtained (value hidden for security)."
fi

# ==============================================================================
section "5 / 8 — Backend Service"
# ==============================================================================

info "Creating backend service '$BACKEND_SERVICE'..."
railway add --service "$BACKEND_SERVICE" 2>/dev/null || \
  info "Service '$BACKEND_SERVICE' already exists — continuing."

info "Setting backend environment variables..."
railway variables set \
  NODE_ENV=production \
  PORT=4000 \
  JWT_SECRET="$JWT_SECRET" \
  --service "$BACKEND_SERVICE"

if [ -n "$DATABASE_URL" ]; then
  railway variables set DATABASE_URL="$DATABASE_URL" --service "$BACKEND_SERVICE"
  success "DATABASE_URL injected into backend."
fi

if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  railway variables set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" --service "$BACKEND_SERVICE"
  success "ANTHROPIC_API_KEY set in backend."
else
  warn "ANTHROPIC_API_KEY not set — AI tutor features will be unavailable."
  warn "Add later: railway variables set ANTHROPIC_API_KEY=sk-ant-... --service $BACKEND_SERVICE"
fi

# Placeholder; updated in step 7
railway variables set \
  FRONTEND_URL="https://${FRONTEND_SERVICE}.up.railway.app" \
  --service "$BACKEND_SERVICE" 2>/dev/null || true

info "Deploying backend from $REPO_ROOT/backend ..."
cd "$REPO_ROOT/backend"
railway up --service "$BACKEND_SERVICE" --detach
success "Backend deployment queued."

# ==============================================================================
section "6 / 8 — Frontend Service"
# ==============================================================================

cd "$REPO_ROOT"

info "Creating frontend service '$FRONTEND_SERVICE'..."
railway add --service "$FRONTEND_SERVICE" 2>/dev/null || \
  info "Service '$FRONTEND_SERVICE' already exists — continuing."

BACKEND_DOMAIN="$(railway domain --service "$BACKEND_SERVICE" 2>/dev/null | head -1 || true)"
if [ -n "$BACKEND_DOMAIN" ]; then
  NEXT_PUBLIC_API_URL="https://${BACKEND_DOMAIN}/api"
  success "Backend domain: $BACKEND_DOMAIN"
else
  warn "Backend domain not yet assigned — using placeholder."
  NEXT_PUBLIC_API_URL="https://${BACKEND_SERVICE}.up.railway.app/api"
fi

info "Setting frontend environment variables..."
railway variables set \
  NODE_ENV=production \
  PORT=3000 \
  NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --service "$FRONTEND_SERVICE"

info "Deploying frontend from $REPO_ROOT/frontend ..."
cd "$REPO_ROOT/frontend"
railway up --service "$FRONTEND_SERVICE" --detach
success "Frontend deployment queued."

# ==============================================================================
section "7 / 8 — Cross-Service URL Wiring"
# ==============================================================================

cd "$REPO_ROOT"
sleep 5

FRONTEND_DOMAIN="$(railway domain --service "$FRONTEND_SERVICE" 2>/dev/null | head -1 || true)"
if [ -n "$FRONTEND_DOMAIN" ]; then
  railway variables set \
    FRONTEND_URL="https://${FRONTEND_DOMAIN}" \
    --service "$BACKEND_SERVICE"
  success "Backend FRONTEND_URL -> https://${FRONTEND_DOMAIN}"
else
  warn "Frontend domain not yet available. Update FRONTEND_URL manually once live."
fi

BACKEND_DOMAIN_FINAL="$(railway domain --service "$BACKEND_SERVICE" 2>/dev/null | head -1 || true)"
if [ -n "$BACKEND_DOMAIN_FINAL" ]; then
  railway variables set \
    NEXT_PUBLIC_API_URL="https://${BACKEND_DOMAIN_FINAL}/api" \
    --service "$FRONTEND_SERVICE"
  success "Frontend NEXT_PUBLIC_API_URL -> https://${BACKEND_DOMAIN_FINAL}/api"
fi

# ==============================================================================
section "8 / 8 — GitHub Actions Secrets (Optional)"
# ==============================================================================

if command -v gh >/dev/null 2>&1; then
  info "gh CLI detected — pushing secrets to GitHub..."

  [ -n "${RAILWAY_TOKEN:-}" ] && \
    gh secret set RAILWAY_TOKEN --body "$RAILWAY_TOKEN" --repo "$GH_REPO" && \
    success "GitHub secret set: RAILWAY_TOKEN"

  [ -n "${ANTHROPIC_API_KEY:-}" ] && \
    gh secret set ANTHROPIC_API_KEY --body "$ANTHROPIC_API_KEY" --repo "$GH_REPO" && \
    success "GitHub secret set: ANTHROPIC_API_KEY"

  if [ -n "${BACKEND_DOMAIN_FINAL:-}" ]; then
    gh secret set BACKEND_URL         --body "https://${BACKEND_DOMAIN_FINAL}"     --repo "$GH_REPO"
    gh secret set NEXT_PUBLIC_API_URL --body "https://${BACKEND_DOMAIN_FINAL}/api" --repo "$GH_REPO"
    success "GitHub secrets set: BACKEND_URL, NEXT_PUBLIC_API_URL"
  fi

  if [ -n "${FRONTEND_DOMAIN:-}" ]; then
    gh secret set FRONTEND_URL --body "https://${FRONTEND_DOMAIN}" --repo "$GH_REPO"
    success "GitHub secret set: FRONTEND_URL"
  fi
else
  warn "gh CLI not found. Set these secrets manually at:"
  warn "  https://github.com/$GH_REPO/settings/secrets/actions"
  cat <<SECRETS

  RAILWAY_TOKEN       = <run: railway whoami --token>
  ANTHROPIC_API_KEY   = sk-ant-api03-...
  BACKEND_URL         = https://${BACKEND_DOMAIN_FINAL:-kinderspark-backend.up.railway.app}
  FRONTEND_URL        = https://${FRONTEND_DOMAIN:-kinderspark-frontend.up.railway.app}
  NEXT_PUBLIC_API_URL = https://${BACKEND_DOMAIN_FINAL:-kinderspark-backend.up.railway.app}/api

SECRETS
fi

# ==============================================================================
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║       KinderSpark Pro — Setup Complete!              ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
railway status 2>/dev/null || true
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo "  1. Wait ~3–5 min for builds to finish in Railway dashboard."
echo "  2. Seed the database:"
echo "       bash scripts/seed.sh"
echo "  3. Check status:"
echo "       make -f scripts/Makefile status"
echo "  4. Open your app:"
echo "       https://${FRONTEND_DOMAIN:-kinderspark-frontend.up.railway.app}"
echo ""
echo -e "${BOLD}Default login PINs:${NC}"
echo "  Teacher  : 1234"
echo "  Admin    : 9999"
echo "  Students : 1111 / 2222 / 3333 / 4444 / 5555"
echo ""
