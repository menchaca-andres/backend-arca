const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..');
const SERVICES = [
  { name: 'gateway', role: 'arca_auditoria', schema: 'auditoria', table: 'evento', key: 'GATEWAY_DB_PASSWORD' },
  { name: 'ms-auth', role: 'arca_auth', schema: 'autenticacion', table: 'usuario', key: 'AUTH_DB_PASSWORD' },
  { name: 'ms-personal', role: 'arca_personal', schema: 'personal', table: 'funcionario', key: 'PERSONAL_DB_PASSWORD' },
  {
    name: 'ms-vacaciones',
    role: 'arca_vacaciones',
    schema: 'vacaciones',
    table: 'solicitud_vacacion',
    key: 'VACACIONES_DB_PASSWORD',
  },
  {
    name: 'ms-contratos',
    role: 'arca_contratos',
    schema: 'contratos',
    table: 'contrato',
    key: 'CONTRATOS_DB_PASSWORD',
  },
  { name: 'ms-boletas', role: 'arca_boletas', schema: 'boletas', table: 'boleta', key: 'BOLETAS_DB_PASSWORD' },
];

function validateValues(values) {
  const required = [
    'SUPABASE_POOLER_HOST',
    'SUPABASE_PROJECT_REF',
    'SUPABASE_ADMIN_PASSWORD',
    'SUPABASE_SSL_CA_FILE',
    ...SERVICES.map((service) => service.key),
  ];
  for (const key of required) {
    if (!values[key] || !values[key].trim()) throw new Error('Falta ' + key + ' en .env.supabase');
  }
  if (!/^[a-z0-9-]+\.pooler\.supabase\.com$/i.test(values.SUPABASE_POOLER_HOST)) {
    throw new Error('Copia el host real del Session Pooler de Supabase');
  }
  if (!/^[a-z0-9]+$/i.test(values.SUPABASE_PROJECT_REF)) throw new Error('SUPABASE_PROJECT_REF invalido');
  const passwords = SERVICES.map((service) => values[service.key]);
  if (passwords.some((password) => password.length < 24 || password.startsWith('arca_local_'))) {
    throw new Error('Usa passwords nuevas de al menos 24 caracteres para los seis usuarios');
  }
  if (new Set(passwords).size !== passwords.length) throw new Error('Cada servicio debe tener una password diferente');
  return values;
}

function loadConfig() {
  const filename = path.join(ROOT, '.env.supabase');
  if (!fs.existsSync(filename)) throw new Error('Falta .env.supabase; usa docker/supabase.env.example como referencia');
  const values = validateValues(dotenv.parse(fs.readFileSync(filename)));
  const caFilename = path.resolve(ROOT, values.SUPABASE_SSL_CA_FILE);
  const ca = fs.readFileSync(caFilename, 'utf8');
  if (!ca.includes('BEGIN CERTIFICATE')) throw new Error('El certificado CA debe estar en formato PEM');
  return { values, ca };
}

function connectionOptions(config, role, password, purpose) {
  return {
    host: config.values.SUPABASE_POOLER_HOST,
    port: 5432,
    database: 'postgres',
    user: role + '.' + config.values.SUPABASE_PROJECT_REF,
    password,
    ssl: { ca: config.ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    application_name: 'arca-hu03-' + purpose,
  };
}

function safeError(error, config) {
  let message = String(error.message || 'Operacion fallida');
  if (config) {
    for (const key of ['SUPABASE_ADMIN_PASSWORD', ...SERVICES.map((service) => service.key)]) {
      const secret = config.values[key];
      if (secret) message = message.split(secret).join('[REDACTED]');
    }
  }
  message = message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_URL]');
  return '[' + (error.code || 'ERROR') + '] ' + message;
}

module.exports = { ROOT, SERVICES, validateValues, loadConfig, connectionOptions, safeError };
