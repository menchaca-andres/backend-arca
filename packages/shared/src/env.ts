/**
 * Validación mínima de variables de entorno, sin dependencias.
 * Falla rápido y con un mensaje claro en lugar de arrancar con undefined.
 */
export function requireEnv(...names: string[]): Record<string, string> {
  const missing = names.filter((name) => {
    const value = process.env[name];
    return value === undefined || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  }

  return Object.fromEntries(names.map((name) => [name, process.env[name] as string]));
}

export function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value;
}

export function requirePort(name = 'PORT', fallback: number): number {
  const raw = optionalEnv(name, String(fallback));
  const port = Number(raw);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`La variable ${name} debe ser un puerto válido (recibido: "${raw}")`);
  }

  return port;
}

export function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`La variable ${name} debe ser un entero no negativo (recibido: "${raw}")`);
  }

  return value;
}
