// Deja listo el entorno local: crea los .env que falten y levanta la base.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dirs = ['gateway', ...fs.readdirSync(path.join(root, 'services')).map((name) => path.join('services', name))];

for (const dir of dirs) {
  const target = path.join(root, dir, '.env');
  if (fs.existsSync(target)) continue;
  fs.copyFileSync(path.join(root, dir, '.env.example'), target);
  console.log(`Creado ${path.join(dir, '.env')}`);
}

execSync('docker compose up -d --wait db', { cwd: root, stdio: 'inherit' });
console.log('Listo: base local en localhost:5433 con los 6 schemas.');
