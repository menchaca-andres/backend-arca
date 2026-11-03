// Crea los .env de desarrollo que falten, sin tocar los existentes.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function crearEnv() {
  const dirs = ['gateway', ...fs.readdirSync(path.join(root, 'services')).map((name) => path.join('services', name))];

  for (const dir of dirs) {
    const target = path.join(root, dir, '.env');
    if (fs.existsSync(target)) continue;

    fs.copyFileSync(path.join(root, dir, '.env.example'), target);
    console.log(`Creado ${path.join(dir, '.env')}`);
  }
}

if (require.main === module) crearEnv();

module.exports = { crearEnv };
