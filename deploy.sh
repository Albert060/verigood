#!/usr/bin/env bash
# VeriGood — deploy script for VPS Madrid
# Usage: ./deploy.sh [--skip-migrate]
# Requirements on VPS: Node 20+, npm, PM2, PostgreSQL, Nginx

set -euo pipefail

# ── Config ────────────────────────────────────────────────────
APP_DIR="/var/www/verigood"
LOG_DIR="/var/log/verigood"
REPO="git@github.com:tu-usuario/verigood.git"   # Update before first deploy
BRANCH="main"
NODE_ENV="production"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
fail() { echo -e "${RED}[error]${NC} $1"; exit 1; }

# ── Pre-checks ────────────────────────────────────────────────
command -v node  >/dev/null 2>&1 || fail "Node.js not installed"
command -v pm2   >/dev/null 2>&1 || fail "PM2 not installed (npm install -g pm2)"
command -v nginx >/dev/null 2>&1 || fail "Nginx not installed"

# ── Setup directories ─────────────────────────────────────────
log "Creating directories..."
mkdir -p "$APP_DIR" "$LOG_DIR"

# ── Pull latest code ──────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  log "Pulling latest from $BRANCH..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
else
  log "Cloning repository..."
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── .env check ───────────────────────────────────────────────
if [ ! -f "$APP_DIR/backend/.env" ]; then
  warn "backend/.env not found — copying from .env.example"
  warn "IMPORTANT: Edit $APP_DIR/backend/.env with real credentials before proceeding"
  cp "$APP_DIR/.env.example" "$APP_DIR/backend/.env"
  fail "Please configure backend/.env and re-run deploy.sh"
fi

# ── Install dependencies ──────────────────────────────────────
log "Installing root dependencies..."
npm install --workspaces --if-present

log "Installing backend dependencies..."
cd "$APP_DIR/backend" && npm ci --omit=dev

log "Installing frontend dependencies..."
cd "$APP_DIR/frontend" && npm ci

# ── Database migrations ───────────────────────────────────────
if [[ "${1:-}" != "--skip-migrate" ]]; then
  log "Running database migrations..."
  cd "$APP_DIR/backend"
  # Load env vars for psql
  set -a; source .env; set +a
  psql "$DATABASE_URL" -f src/migrations/001_initial_schema.sql || warn "001_initial_schema may already be applied"
  psql "$DATABASE_URL" -f src/migrations/002_modules_catalog.sql || warn "002_modules_catalog may already be applied"
  # Seed del catálogo de módulos (sistema, no demo). Idempotente.
  psql "$DATABASE_URL" -f src/seeds/001_modules_catalog.sql || warn "001_modules_catalog seed failed"
  # NOTA: src/seeds/dev_demo_data.sql NO se ejecuta en producción.
  # Sólo para entornos de desarrollo / staging.
fi

# ── Build frontend ────────────────────────────────────────────
log "Building frontend..."
cd "$APP_DIR/frontend"
NODE_ENV=production npm run build

# ── (Re)start backend with PM2 ────────────────────────────────
log "Restarting backend with PM2..."
cd "$APP_DIR"
if pm2 list | grep -q "verigood-backend"; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save

# ── Nginx reload ──────────────────────────────────────────────
log "Testing Nginx config..."
nginx -t

log "Reloading Nginx..."
systemctl reload nginx

# ── Health check ──────────────────────────────────────────────
log "Health check..."
sleep 2
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" http://localhost:3001/health)
if [ "$HTTP_STATUS" = "200" ]; then
  log "Backend healthy ✓"
else
  fail "Backend health check failed (HTTP $HTTP_STATUS)"
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  VeriGood deployed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Frontend: https://verigood.es"
echo "  API:      https://verigood.es/api"
echo "  PM2:      pm2 status"
echo "  Logs:     pm2 logs verigood-backend"
echo ""
