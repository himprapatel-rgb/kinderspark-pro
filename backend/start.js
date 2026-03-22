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
