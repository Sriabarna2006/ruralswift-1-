// server/src/server.js
const app = require('./app');
const env = require('./config/env');
const createTables = require('./config/schema');

// Start server
createTables().then(() => {
  app.listen(env.port, () => {
    console.log(`\n🚀  RuralSwift API running at http://localhost:${env.port}`);
    console.log(`📋  Routes:`);
    console.log(`    POST  /api/auth/register`);
    console.log(`    POST  /api/auth/login`);
    console.log(`    GET   /api/profile`);
    console.log(`    PUT   /api/profile`);
    console.log(`    GET   /api/health\n`);
  });
}).catch(err => {
  console.error('Failed to start server due to schema error:', err);
  process.exit(1);
});
