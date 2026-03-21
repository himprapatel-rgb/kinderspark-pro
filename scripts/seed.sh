#!/usr/bin/env bash
# ==============================================================================
# KinderSpark Pro — Database Seed Script
# ==============================================================================
# Seeds the Railway PostgreSQL database with demo data:
#   - 1 school   : Sunshine Kindergarten
#   - 1 teacher  : Ms. Sarah Johnson (PIN: 1234)
#   - 1 admin    : Admin (PIN: 9999)
#   - 1 class    : Sunflower Class (KG 1)
#   - 5 students : Emma/Liam/Sofia/Noah/Zara (PINs: 1111-5555)
#   - 3 homework assignments
#   - 2 messages
#   - 1 syllabus (ABC Letters) with 26 items
#
# Usage:
#   # Option A — Run seed via Railway (recommended for production):
#   export RAILWAY_TOKEN=<your-token>
#   ./scripts/seed.sh
#
#   # Option B — Run seed against a local DATABASE_URL:
#   export DATABASE_URL=postgresql://user:pass@host:5432/dbname
#   ./scripts/seed.sh --local
#
#   # Option C — Connect via Railway tunnel and run locally:
#   ./scripts/seed.sh --tunnel
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
BACKEND_DIR="$REPO_ROOT/backend"
BACKEND_SERVICE="kinderspark-backend"
MODE="${1:---railway}"

# ==============================================================================
section "Seed Mode: $MODE"
# ==============================================================================

case "$MODE" in
# ── Option A: Run via Railway CLI (remote execution) ──────────────────────────
--railway|"")
  command -v railway >/dev/null 2>&1 || \
    error "Railway CLI not found. Run: npm install -g @railway/cli"

  if [ -z "${RAILWAY_TOKEN:-}" ]; then
    railway whoami >/dev/null 2>&1 || \
      error "Not authenticated. Run: railway login  OR  export RAILWAY_TOKEN=<token>"
  fi

  section "Running seed via Railway (remote)"
  info "This executes prisma/seed.ts inside the Railway backend container."
  info "Service: $BACKEND_SERVICE"

  cd "$REPO_ROOT"
  railway run \
    --service "$BACKEND_SERVICE" \
    -- sh -c "cd /app && npx ts-node prisma/seed.ts"

  success "Database seeded successfully via Railway!"
  echo ""
  echo -e "${BOLD}Demo credentials:${NC}"
  echo "  Teacher PIN  : 1234  (Ms. Sarah Johnson)"
  echo "  Admin PIN    : 9999  (Admin)"
  echo "  Student PINs : 1111 (Emma) | 2222 (Liam) | 3333 (Sofia)"
  echo "                 4444 (Noah) | 5555 (Zara)"
  ;;

# ── Option B: Run locally with DATABASE_URL ───────────────────────────────────
--local)
  [ -z "${DATABASE_URL:-}" ] && \
    error "DATABASE_URL must be set for --local mode.\nExport it and retry:\n  export DATABASE_URL=postgresql://..."

  section "Running seed locally (using DATABASE_URL env var)"
  command -v node >/dev/null 2>&1 || error "Node.js is required."

  cd "$BACKEND_DIR"

  if [ ! -d node_modules ]; then
    info "Installing backend dependencies..."
    npm ci
  fi

  info "Generating Prisma client..."
  npx prisma generate

  info "Running migrations against DATABASE_URL..."
  npx prisma migrate deploy

  info "Seeding..."
  DATABASE_URL="$DATABASE_URL" npx ts-node prisma/seed.ts

  success "Local seed complete!"
  ;;

# ── Option C: Railway tunnel then seed locally ────────────────────────────────
--tunnel)
  command -v railway >/dev/null 2>&1 || \
    error "Railway CLI not found. Run: npm install -g @railway/cli"

  section "Opening Railway DB tunnel, then seeding locally"
  info "Railway will create a local port-forward to PostgreSQL."
  info "Press Ctrl+C when done to close the tunnel."

  cd "$REPO_ROOT"

  # Start tunnel in background and capture connection string
  info "Starting tunnel (this takes ~5 seconds)..."
  railway connect PostgreSQL &
  TUNNEL_PID=$!
  sleep 6

  # Railway tunnel typically binds to localhost:5432
  LOCAL_DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/railway}"
  info "Attempting seed via tunnel URL..."

  cd "$BACKEND_DIR"
  [ ! -d node_modules ] && npm ci
  npx prisma generate
  DATABASE_URL="$LOCAL_DB_URL" npx prisma migrate deploy
  DATABASE_URL="$LOCAL_DB_URL" npx ts-node prisma/seed.ts

  kill $TUNNEL_PID 2>/dev/null || true
  success "Tunnel seed complete!"
  ;;

# ── Help ───────────────────────────────────────────────────────────────────────
--help|-h)
  echo "Usage: $0 [--railway|--local|--tunnel]"
  echo ""
  echo "  --railway   (default) Run seed inside Railway backend container"
  echo "  --local     Run seed locally; requires DATABASE_URL env var"
  echo "  --tunnel    Open Railway DB tunnel, then seed locally"
  echo ""
  echo "Examples:"
  echo "  RAILWAY_TOKEN=xxx ./scripts/seed.sh"
  echo "  DATABASE_URL=postgresql://... ./scripts/seed.sh --local"
  echo "  RAILWAY_TOKEN=xxx ./scripts/seed.sh --tunnel"
  exit 0
  ;;

*)
  error "Unknown mode '$MODE'. Use --railway, --local, or --tunnel. Run --help for details."
  ;;
esac

echo ""
info "To verify the seed worked, run:"
echo "  railway run --service $BACKEND_SERVICE -- node -e \\"
echo "    \"const{PrismaClient}=require('@prisma/client');"
echo "     const p=new PrismaClient();"
echo "     p.student.count().then(n=>console.log('Students:',n)).finally(()=>p.\$disconnect())\""
echo ""
