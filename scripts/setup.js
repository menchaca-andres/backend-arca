// Deja listo el entorno local: crea los .env que falten y levanta la base.
const { execSync } = require('node:child_process');
const path = require('node:path');
const { crearEnv } = require('./env');

const root = path.join(__dirname, '..');

crearEnv();
execSync('docker compose up -d --wait db', { cwd: root, stdio: 'inherit' });
console.log('Listo: base local en localhost:5433 con los 6 schemas.');
