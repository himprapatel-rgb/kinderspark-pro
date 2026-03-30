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

// ── Schema sync ───────────────────────────────────────────────────────────────
// 1) Prefer proper migrations in production (Railway, etc.)
console.log('==> prisma migrate deploy...');
if (!run('npx prisma migrate deploy')) {
  console.warn('==> migrate deploy failed or nothing to apply — continuing');
}
// 2) db push fills any drift / legacy DBs that never had clean migration history
console.log('==> prisma db push (skip-generate)...');
if (!run('npx prisma db push --skip-generate')) {
  console.error('==> db push failed — last-resort migrate resolve + deploy...');
  run('npx prisma migrate resolve --applied 20260327_ecosystem_phase2_safe_messaging');
  run('npx prisma migrate resolve --applied 20260327_full_ecosystem_profiles');
  run('npx prisma migrate deploy');
}
console.log('==> Schema sync done');

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
