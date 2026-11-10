// Crea los .env de desarrollo que falten, sin tocar los existentes.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

const LOCAL_DB = {
  gateway: 'postgres://user_gateway:arca_local_gateway_2026@localhost:5433/arca',
  'ms-auth': 'postgres://user_auth:arca_local_auth_2026@localhost:5433/arca',
  'ms-personal': 'postgres://user_personal:arca_local_personal_2026@localhost:5433/arca',
  'ms-vacaciones': 'postgres://user_vacaciones:arca_local_vacaciones_2026@localhost:5433/arca',
  'ms-contratos': 'postgres://user_contratos:arca_local_contratos_2026@localhost:5433/arca',
  'ms-boletas': 'postgres://user_boletas:arca_local_boletas_2026@localhost:5433/arca',
};

const INTERNAL_API_KEY = 'arca-local-internal-key-2026';
const JWT_SECRET = 'arca-local-jwt-secret-2026';

function completar(source, target, values) {
  let content = fs.readFileSync(source, 'utf8');
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    content = pattern.test(content)
      ? content.replace(pattern, `${key}=${value}`)
      : `${content.trimEnd()}\n${key}=${value}\n`;
  }
  fs.writeFileSync(target, content);
}

function crearEnv() {
  const rootTarget = path.join(root, '.env');
  if (!fs.existsSync(rootTarget)) {
    completar(path.join(root, '.env.example'), rootTarget, {
      POSTGRES_PASSWORD: 'postgres',
      GATEWAY_DATABASE_URL: LOCAL_DB.gateway.replace('localhost:5433', 'db:5432'),
      AUTH_DATABASE_URL: LOCAL_DB['ms-auth'].replace('localhost:5433', 'db:5432'),
      PERSONAL_DATABASE_URL: LOCAL_DB['ms-personal'].replace('localhost:5433', 'db:5432'),
      VACACIONES_DATABASE_URL: LOCAL_DB['ms-vacaciones'].replace('localhost:5433', 'db:5432'),
      CONTRATOS_DATABASE_URL: LOCAL_DB['ms-contratos'].replace('localhost:5433', 'db:5432'),
      BOLETAS_DATABASE_URL: LOCAL_DB['ms-boletas'].replace('localhost:5433', 'db:5432'),
      INTERNAL_API_KEY,
      JWT_SECRET,
    });
    console.log('Creado .env');
  }

  const entries = [
    { dir: 'gateway', name: 'gateway' },
    ...fs.readdirSync(path.join(root, 'services')).map((name) => ({ dir: path.join('services', name), name })),
  ];

  for (const entry of entries) {
    const target = path.join(root, entry.dir, '.env');
    if (fs.existsSync(target)) continue;

    const values = {
      DATABASE_URL: LOCAL_DB[entry.name],
      INTERNAL_API_KEY,
    };
    if (entry.name === 'gateway' || entry.name === 'ms-auth') values.JWT_SECRET = JWT_SECRET;

    completar(path.join(root, entry.dir, '.env.example'), target, values);
    console.log(`Creado ${path.join(entry.dir, '.env')}`);
  }
}

if (require.main === module) crearEnv();

module.exports = { crearEnv };
