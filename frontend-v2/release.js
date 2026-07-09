#!/usr/bin/env node
/**
 * Release script — incrementa il build counter e fa build.
 * Uso: npm run release
 * 
 * Auto-bump: se counter supera 99, incrementa la minor (v3.16.99 → v3.17.1)
 * e aggiorna SW_VERSION in vite.config.js
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COUNTER_FILE = path.resolve(__dirname, '.build-counter.json');
const CONFIG_FILE = path.resolve(__dirname, 'vite.config.js');

// Leggi versione corrente da vite.config.js
const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
const versionMatch = configContent.match(/const SW_VERSION = '(v\d+\.\d+)'/);
if (!versionMatch) { console.error('❌ SW_VERSION non trovato in vite.config.js'); process.exit(1); }
let version = versionMatch[1];

// Leggi counter corrente
let counter = 0;
try {
  const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
  if (data.version === version) counter = data.counter;
} catch {}

// Incrementa
counter++;

// Auto-bump minor se supera 99
if (counter > 99) {
  const m = version.match(/^v(\d+)\.(\d+)$/);
  const newVersion = `v${m[1]}.${parseInt(m[2]) + 1}`;
  fs.writeFileSync(CONFIG_FILE, configContent.replace(`const SW_VERSION = '${version}'`, `const SW_VERSION = '${newVersion}'`));
  version = newVersion;
  counter = 1;
  console.log(`🚀 Auto-bump: ${versionMatch[1]} → ${version}`);
}

// Salva counter
fs.writeFileSync(COUNTER_FILE, JSON.stringify({ version, counter, updatedAt: new Date().toISOString() }, null, 2));
console.log(`📦 Build: ${version}.${counter}`);

// Esegui build
execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
