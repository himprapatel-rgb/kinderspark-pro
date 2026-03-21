#!/usr/bin/env bash
# ==============================================================================
# KinderSpark Pro — Deploy Both Services to Railway
# ==============================================================================
# Deploys (or re-deploys) backend and frontend to Railway.
# Assumes setup-railway.sh has already been run once.
#
# Usage:
#   export RAILWAY_TOKEN=<your-token>
#   ./scripts/deploy.sh           # deploy both
#   ./scripts/deploy.sh backend   # deploy backend only
#   ./scripts/deploy.sh frontend  # deploy frontend only
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
section() {
  echo -e "\n${BOLD}${CYAN}─────────────────────────────────────${NC}"
  echo -e "${BOLD}${CYAN}  $*${NC}"
  echo -e "${BOLD}${CYAN}─────────────────────────────────────${NC}"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_SERVICE="kinderspark-backend"
FRONTEND_SERVICE="kinderspark-frontend"
TARGET="${1:-both}"

# ── Guards ─────────────────────────────────────────────────────────────────────
command -v railway >/dev/null 2>&1 || \
  error "Railway CLI not found. Run: npm install -g @railway/cli"

if [ -z "${RAILWAY_TOKEN:-}" ]; then
  railway whoami >/dev/null 2>&1 || \
    error "Not authenticated. Run: railway login  OR  export RAILWAY_TOKEN=<token>"
fi

# ── Deploy backend ─────────────────────────────────────────────────────────────
deploy_backend() {
  section "Deploying Backend"
  info "Service  : $BACKEND_SERVICE"
  info "Root dir : $REPO_ROOT/backend"
  info "Build    : nixpacks (npx prisma generate && npm run build)"
  info "Start    : npx prisma migrate deploy && node dist/app.js"

  cd "$REPO_ROOT/backend"
  railway up --service "$BACKEND_SERVICE" --detach
  success "Backend deployment queued. Monitor at: https://railway.app/dashboard"

  # Wait a moment and attempt to get the domain
  sleep 3
  BACKEND_URL="$(railway domain --service "$BACKEND_SERVICE" 2>/dev/null | head -1 || true)"
  if [ -n "$BACKEND_URL" ]; then
    success "Backend URL: https://${BACKEND_URL}"
    success "Health check: https://${BACKEND_URL}/health"
    success "API base:     https://${BACKEND_URL}/api"
  else
    info "Backend URL will be available after build completes (~2-3 min)."
  fi
}

# ── Deploy frontend ────────────────────────────────────────────────────────────
deploy_frontend() {
  section "Deploying Frontend"
  info "Service  : $FRONTEND_SERVICE"
  info "Root dir : $REPO_ROOT/frontend"
  info "Build    : nixpacks (npm run build)"
  info "Start    : npm start (Next.js production server)"

  cd "$REPO_ROOT/frontend"
  railway up --service "$FRONTEND_SERVICE" --detach
  success "Frontend deployment queued. Monitor at: https://railway.app/dashboard"

  sleep 3
  FRONTEND_URL="$(railway domain --service "$FRONTEND_SERVICE" 2>/dev/null | head -1 || true)"
  if [ -n "$FRONTEND_URL" ]; then
    success "Frontend URL: https://${FRONTEND_URL}"
  else
    info "Frontend URL will be available after build completes (~3-4 min)."
  fi
}

# ── Wire URLs after both services are deployed ─────────────────────────────────
wire_urls() {
  section "Wiring Cross-Service URLs"
  cd "$REPO_ROOT"

  BACKEND_DOMAIN="$(railway domain --service "$BACKEND_SERVICE" 2>/dev/null | head -1 || true)"
  FRONTEND_DOMAIN="$(railway domain --service "$FRONTEND_SERVICE" 2>/dev/null | head -1 || true)"

  if [ -n "$BACKEND_DOMAIN" ] && [ -n "$FRONTEND_DOMAIN" ]; then
    railway variables set \
      FRONTEND_URL="https://${FRONTEND_DOMAIN}" \
      --service "$BACKEND_SERVICE" 2>/dev/null || true
    railway variables set \
      NEXT_PUBLIC_API_URL="https://${BACKEND_DOMAIN}/api" \
      --service "$FRONTEND_SERVICE" 2>/dev/null || true
    success "Cross-service URLs wired."
    echo ""
    echo -e "${BOLD}Live URLs:${NC}"
    echo "  Frontend : https://${FRONTEND_DOMAIN}"
    echo "  Backend  : https://${BACKEND_DOMAIN}"
    echo "  API      : https://${BACKEND_DOMAIN}/api"
    echo "  Health   : https://${BACKEND_DOMAIN}/health"
  else
    warn "Domains not yet assigned. Re-run this script in ~5 min to wire URLs, or"
    warn "update them manually in the Railway dashboard."
  fi
}

# ── Status check ───────────────────────────────────────────────────────────────
show_status() {
  section "Deployment Status"
  cd "$REPO_ROOT"
  railway status 2>/dev/null || true
}

# ── Main ───────────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "  ██╗  ██╗██╗███╗   ██╗██████╗ ███████╗██████╗ "
echo "  ██║ ██╔╝██║████╗  ██║██╔══██╗██╔════╝██╔══██╗"
echo "  █████╔╝ ██║██╔██╗ ██║██║  ██║█████╗  ██████╔╝"
echo "  ██╔═██╗ ██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗"
echo "  ██║  ██╗██║██║ ╚████║██████╔╝███████╗██║  ██║"
echo "  ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝"
echo "  SPARK PRO — Railway Deploy"
echo -e "${NC}"
info "Target: $TARGET"
echo ""

case "$TARGET" in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  both|"")
    deploy_backend
    deploy_frontend
    wire_urls
    ;;
  *)
    error "Unknown target '$TARGET'. Use: backend | frontend | both"
    ;;
esac

show_status

echo ""
echo -e "${BOLD}Useful commands:${NC}"
echo "  View backend logs  : railway logs --service $BACKEND_SERVICE"
echo "  View frontend logs : railway logs --service $FRONTEND_SERVICE"
echo "  Seed database      : bash scripts/seed.sh"
echo "  Open dashboard     : https://railway.app/dashboard"
echo ""
