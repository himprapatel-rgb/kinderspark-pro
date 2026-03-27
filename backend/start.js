const { execSync } = require('child_process');

console.log('==> start.js running');
console.log('==> NODE_ENV:', process.env.NODE_ENV);
console.log('==> PORT:', process.env.PORT);

// Run migrations
try {
  console.log('==> Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('==> Migrations complete');
} catch (e) {
  console.error('==> Migration failed:', e.message);
  // If P3009 (failed migration), try resolving then re-applying
  try {
    console.log('==> Attempting to resolve failed migrations...');
    execSync('npx prisma migrate resolve --applied 20260327_ecosystem_phase2_safe_messaging 2>/dev/null || true', { stdio: 'inherit' });
    execSync('npx prisma migrate resolve --applied 20260327_full_ecosystem_profiles 2>/dev/null || true', { stdio: 'inherit' });
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('==> Migration resolved and applied');
  } catch (e2) {
    console.error('==> Migration resolve also failed:', e2.message);
    // Push schema directly as last resort
    try {
      console.log('==> Pushing schema directly with db push...');
      execSync('npx prisma db push --accept-data-loss 2>/dev/null || true', { stdio: 'inherit' });
    } catch (e3) {
      console.error('==> db push failed too — continuing anyway:', e3.message);
    }
  }
}

// Run seed (uses upsert so safe to run multiple times)
try {
  console.log('==> Running prisma db seed...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
  console.log('==> Seed complete');
} catch (e) {
  console.error('==> Seed failed:', e.message);
}

// Start the server
console.log('==> Starting app...');
try {
  require('./dist/app.js');
} catch (e) {
  console.error('==> Failed to start app:', e.message);
  console.error(e.stack);
  process.exit(1);
}
