import { execSync } from 'child_process';

console.log('Bootstrap starting...');

// Run migrations
try {
  console.log('Running migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('Migrations complete.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}

// Catch any crash before or during app load
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

// Load the app
import('./app.js').catch((err) => {
  console.error('FAILED TO IMPORT APP:', err.message);
  console.error(err.stack);
  process.exit(1);
});