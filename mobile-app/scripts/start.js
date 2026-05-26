#!/usr/bin/env node
/**
 * EDITH PWA — start.js
 * Cross-platform server launcher.
 * Copies serve.json into build/web then starts `serve`.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const root     = path.join(__dirname, '..');
const buildDir = path.join(root, 'build', 'web');
const port     = process.env.PORT || 8080;

// ── Verify build exists ───────────────────────────────────────
if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.error('\n  ERROR: build/web/index.html not found.');
  console.error('  Run "npm run build" first.\n');
  process.exit(1);
}

// ── Copy serve.json into build/web ────────────────────────────
// serve resolves the config relative to the served directory.
const srcConfig  = path.join(root, 'serve.json');
const destConfig = path.join(buildDir, 'serve.json');
if (fs.existsSync(srcConfig)) {
  fs.copyFileSync(srcConfig, destConfig);
}

// ── Get local IP ──────────────────────────────────────────────
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

// ── Print instructions ────────────────────────────────────────
console.log('\n  EDITH PWA\n');
console.log('  Open on your phone (same Wi-Fi):');
console.log(`  http://${localIP}:${port}\n`);
console.log('  Install as PWA:');
console.log('  Android  Chrome menu > Add to Home Screen');
console.log('  iOS      Safari Share > Add to Home Screen\n');
console.log('  Press Ctrl+C to stop.\n');

// ── Start serve ───────────────────────────────────────────────
const serveBin = path.join(root, 'node_modules', '.bin', 'serve');
const args = [buildDir, '-l', String(port), '-s', '--no-clipboard'];

const proc = spawn(serveBin, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

proc.on('error', (err) => {
  console.error('  Failed to start server:', err.message);
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});
