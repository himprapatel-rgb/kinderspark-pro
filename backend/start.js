const { execSync } = require('child_process');

console.log('==> start.js running');
console.log('==> NODE_ENV:', process.env.NODE_ENV);
console.log('==> PORT:', process.env.PORT);

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

// ── Migrations ────────────────────────────────────────────────────────────────
console.log('==> Running prisma migrate deploy...');
if (!run('npx prisma migrate deploy')) {
  console.log('==> Migration failed — attempting auto-repair...');

  // The failed migrations use IF NOT EXISTS / idempotent SQL.
  // Roll them back and re-mark so Prisma tries them again.
  run('npx prisma migrate resolve --rolled-back 20260327_ecosystem_phase2_safe_messaging');
  run('npx prisma migrate resolve --rolled-back 20260327_full_ecosystem_profiles');

  // Retry migration (this will actually execute the SQL now)
  if (!run('npx prisma migrate deploy')) {
    console.log('==> Retry migration also failed — using db push as last resort');
    // db push syncs schema → DB without migration history
    run('npx prisma db push --skip-generate');
  }
}
console.log('==> Migration step done');

// ── Seed ──────────────────────────────────────────────────────────────────────
console.log('==> Running prisma db seed...');
if (!run('npx prisma db seed')) {
  console.error('==> Seed failed (non-fatal, continuing...)');
}

// ── Start ─────────────────────────────────────────────────────────────────────
console.log('==> Starting app...');
try {
  require('./dist/app.js');
} catch (e) {
  console.error('==> Failed to start app:', e.message);
  console.error(e.stack);
  process.exit(1);
}
