/**
 * Copies Monaco Editor files from node_modules to vendor/monaco
 * Run this once after `npm install`
 */
const fs   = require('fs');
const path = require('path');

const src  = path.join(__dirname, '../node_modules/monaco-editor/min/vs');
const dest = path.join(__dirname, '../vendor/monaco/vs');

function copyDir(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath  = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(src)) {
  console.error('Monaco not found. Run: npm install');
  process.exit(1);
}

console.log('Copying Monaco Editor...');
copyDir(src, dest);
console.log('Done! Monaco copied to vendor/monaco/vs');
