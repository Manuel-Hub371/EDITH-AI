#!/usr/bin/env node
/**
 * EDITH PWA — dev.js
 * Builds Flutter web then starts the server.
 */

const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

console.log('\n  EDITH PWA — Building...\n');

try {
  execSync(
    'flutter build web --release --pwa-strategy offline-first',
    { cwd: root, stdio: 'inherit' }
  );
} catch (e) {
  // Exit code 1 from flutter build can be non-fatal (file_picker warnings).
  // Check if the output actually exists before failing.
  const fs   = require('fs');
  const built = fs.existsSync(path.join(root, 'build', 'web', 'index.html'));
  if (!built) {
    console.error('\n  Build failed.\n');
    process.exit(1);
  }
}

console.log('\n  Build complete. Starting server...\n');

// Hand off to start.js
require('./start.js');
