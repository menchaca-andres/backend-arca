// Clave exclusiva del proceso de pruebas; no modifica ningun .env.
process.env.INTERNAL_API_KEY = 'infra-test-key-not-for-deployment';
// Clave del JWT solo para pruebas (la exige el login de la HU-05); no modifica ningun .env.
process.env.JWT_SECRET ??= 'infra-test-jwt-secret-not-for-deployment';
// Las pruebas de repositorio necesitan borrar filas de auditoria; user_gateway es append-only.
process.env.DATABASE_URL ??= 'postgres://postgres:postgres@localhost:5433/arca';
