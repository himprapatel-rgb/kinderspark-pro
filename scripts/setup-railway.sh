#!/usr/bin/env bash
# =============================================================
# KinderSpark Pro — Full Railway Setup Script
# Run this ONCE on your local machine: bash scripts/setup-railway.sh
# =============================================================
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
die()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
step() { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}\n"; }

step "Checking prerequisites"
command -v node >/dev/null 2>&1 || die "Node.js not installed"
ok "Node.js $(node -v)"
if ! command -v railway >/dev/null 2>&1; then
  info "Installing Railway CLI..."; npm install -g @railway/cli; ok "Railway CLI installed"
else ok "Railway CLI found"; fi

step "Railway Login"
railway login; ok "Logged in"

step "Creating Project"
cd "$(dirname "$0")/.."
railway init --name kinderspark-pro 2>/dev/null || true
ok "Project: kinderspark-pro"

step "Adding PostgreSQL"
railway add --plugin postgresql
ok "PostgreSQL provisioned"
sleep 5
DATABASE_URL=$(railway variables get DATABASE_URL 2>/dev/null || echo "")

step "Configuration"
read -p "Anthropic API key (sk-ant-...): " ANTHROPIC_KEY
[ -z "$ANTHROPIC_KEY" ] && die "Anthropic key required"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ok "JWT secret generated"

step "Deploying Backend"
railway service create kinderspark-backend 2>/dev/null || true
railway variables set NODE_ENV=production PORT=4000 ANTHROPIC_API_KEY="$ANTHROPIC_KEY" JWT_SECRET="$JWT_SECRET" --service kinderspark-backend
[ -n "$DATABASE_URL" ] && railway variables set DATABASE_URL="$DATABASE_URL" --service kinderspark-backend
(cd backend && railway up --service kinderspark-backend --detach)
ok "Backend deploying..."
sleep 15
BACKEND_URL=$(railway domain --service kinderspark-backend 2>/dev/null || echo "kinderspark-backend.up.railway.app")
ok "Backend: https://$BACKEND_URL"

step "Deploying Frontend"
railway service create kinderspark-frontend 2>/dev/null || true
railway variables set NODE_ENV=production NEXT_PUBLIC_API_URL="https://$BACKEND_URL/api" --service kinderspark-frontend
(cd frontend && railway up --service kinderspark-frontend --detach)
ok "Frontend deploying..."
sleep 15
FRONTEND_URL=$(railway domain --service kinderspark-frontend 2>/dev/null || echo "kinderspark-frontend.up.railway.app")
ok "Frontend: https://$FRONTEND_URL"

step "Cross-linking"
railway variables set FRONTEND_URL="https://$FRONTEND_URL" --service kinderspark-backend
ok "Services linked"

step "Waiting for builds (~3 min)"
echo "Watching..."; sleep 180

step "Seeding Database"
railway run --service kinderspark-backend npx prisma db seed
ok "Database seeded"

step "Setting GitHub Secrets"
if command -v gh >/dev/null 2>&1; then
  gh secret set RAILWAY_TOKEN --body "$(railway whoami --token 2>/dev/null)" --repo himprapatel-rgb/kinderspark-pro
  gh secret set BACKEND_URL  --body "https://$BACKEND_URL"  --repo himprapatel-rgb/kinderspark-pro
  gh secret set FRONTEND_URL --body "https://$FRONTEND_URL" --repo himprapatel-rgb/kinderspark-pro
  ok "GitHub secrets set — auto-deploy active"
else
  warn "Set these GitHub secrets manually at github.com/himprapatel-rgb/kinderspark-pro/settings/secrets/actions"
  echo "  RAILWAY_TOKEN = run: railway whoami --token"
  echo "  BACKEND_URL   = https://$BACKEND_URL"
  echo "  FRONTEND_URL  = https://$FRONTEND_URL"
fi

step "Health Check"
sleep 30
curl -sf "https://$BACKEND_URL/health" && echo "" || warn "Backend still warming up — check in 2 min"

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 KinderSpark Pro is LIVE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  🌐 Frontend : https://$FRONTEND_URL"
echo -e "  ⚙️  Backend  : https://$BACKEND_URL"
echo -e "  👩‍🏫 Teacher  : 1234  |  ⚙️ Admin: 9999"
echo -e "  👧 Students : 1111 / 2222 / 3333 / 4444 / 5555"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
