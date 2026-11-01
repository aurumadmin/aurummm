/**
 * cPanel Phusion Passenger Startup Entry Point
 * Mandatory Runtime Target: Node.js v22.18.0
 * 
 * Compatible with cPanel 'Setup Node.js App'
 */

const path = require('path');
const fs = require('fs');

// Default environment setting for shared hosting
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Load .env variables if available
try {
  const dotenvPath = path.join(__dirname, '.env');
  if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath });
  }
} catch (e) {
  // Silent fallback if dotenv is not present
}

const compiledServerFile = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(compiledServerFile)) {
  console.log('[cPanel Passenger Node 22.18.0] Launching compiled server from dist/server.cjs...');
  require(compiledServerFile);
} else {
  console.log('[cPanel Passenger Node 22.18.0] Warning: dist/server.cjs not found. Please run "npm run build" before deploying to cPanel.');
  try {
    require('./server.ts');
  } catch (err) {
    console.error('Failed to start application on cPanel:', err.message);
    process.exit(1);
  }
}
