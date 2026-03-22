#!/bin/sh
set -e

echo "==> Clearing any stuck migration records..."
npx prisma db execute --stdin <<'SQL' 2>/dev/null || true
DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL;
SQL

echo "==> Running migrations..."
npx prisma migrate deploy

echo "==> Starting server..."
exec node dist/app.js
