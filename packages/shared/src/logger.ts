// Logger mínimo y estructurado (JSON por línea). No agrega dependencias externas.
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configured = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const threshold = LEVELS[configured as LogLevel] ?? LEVELS.info;

function serializeMeta(meta: unknown): unknown {
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack };
  }
  return meta;
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (LEVELS[level] < threshold) return;

  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    message,
  };
  if (meta !== undefined) entry.meta = serializeMeta(meta);

  let line: string;
  try {
    line = JSON.stringify(entry);
  } catch {
    line = JSON.stringify({ ts: entry.ts, level, message, meta: '[no serializable]' });
  }

  // Los errores y advertencias van a stderr para que Docker/grep los separe de la salida normal.
  if (level === 'error' || level === 'warn') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};
