// Clave exclusiva del proceso de pruebas; no modifica ningun .env.
process.env.INTERNAL_API_KEY = 'infra-test-key-not-for-deployment';
// Clave del JWT solo para pruebas (la exige el login de la HU-05); no modifica ningun .env.
process.env.JWT_SECRET ??= 'infra-test-jwt-secret-not-for-deployment';
