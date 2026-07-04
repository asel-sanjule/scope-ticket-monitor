process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

console.log('Bootstrap starting...');
import('./app.js').catch((err) => {
  console.error('FAILED TO IMPORT APP:', err);
  process.exit(1);
});