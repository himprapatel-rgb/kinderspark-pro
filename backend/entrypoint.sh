#!/bin/sh

echo "==> Starting entrypoint.sh"
echo "==> Working directory: $(pwd)"
echo "==> Node version: $(node --version)"
echo "==> Files in dist/: $(ls dist/ 2>&1 || echo 'NO DIST DIR')"

echo "==> Running migrations..."
npx prisma migrate deploy || echo "Migration failed but continuing..."

echo "==> Starting server on port ${PORT:-4000}..."
exec node dist/app.js
