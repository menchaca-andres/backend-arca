// Verifica que cada rol de base solo pueda leer su schema (HU-03 CA-03).
// Uso local/Supabase:
//   ARCA_AUTH_URL=postgresql://... ARCA_PERSONAL_URL=postgresql://... node scripts/verify-isolation.js
// Si falta una URL, se omite esa verificación.
const { Client } = require('pg');

const CASES = [
  { role: 'arca_auth', env: 'ARCA_AUTH_URL', own: 'autenticacion.usuario', forbidden: 'personal.funcionario' },
  { role: 'arca_personal', env: 'ARCA_PERSONAL_URL', own: 'personal.funcionario', forbidden: 'autenticacion.usuario' },
  { role: 'arca_vacaciones', env: 'ARCA_VACACIONES_URL', own: 'vacaciones.feriado', forbidden: 'contratos.contrato' },
  { role: 'arca_contratos', env: 'ARCA_CONTRATOS_URL', own: 'contratos.contrato', forbidden: 'boletas.boleta' },
  {
    role: 'arca_boletas',
    env: 'ARCA_BOLETAS_URL',
    own: 'boletas.concepto',
    forbidden: 'vacaciones.solicitud_vacacion',
  },
  { role: 'arca_auditoria', env: 'ARCA_AUDITORIA_URL', own: 'auditoria.evento', forbidden: 'personal.funcionario' },
];

async function checkCase(testCase) {
  const url = process.env[testCase.env];
  if (!url) {
    console.log(`[skip] ${testCase.role}: falta ${testCase.env}`);
    return true;
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`SELECT 1 FROM ${testCase.own} LIMIT 1`);

    try {
      await client.query(`SELECT 1 FROM ${testCase.forbidden} LIMIT 1`);
      console.error(`[fallo] ${testCase.role} pudo leer ${testCase.forbidden}`);
      return false;
    } catch (error) {
      if (error.code === '42501') {
        console.log(`[ok] ${testCase.role} no puede leer ${testCase.forbidden}`);
        return true;
      }
      console.error(`[fallo] ${testCase.role}: error inesperado al leer ${testCase.forbidden}: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.error(`[fallo] ${testCase.role} no puede leer su propio schema ${testCase.own}: ${error.message}`);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  let ok = true;
  for (const testCase of CASES) {
    ok = (await checkCase(testCase)) && ok;
  }

  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[verify-isolation] Falló:', error.message);
  process.exit(1);
});
