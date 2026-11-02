export type LogLevel = 'info' | 'warn' | 'error';
export type LogSink = (line: string) => void;

const sensitiveKey = /password|passwd|secret|token|authorization|cookie|apikey|internalkey|databaseurl|connectionstring|body/i;

function sanitize(value: unknown, seen: WeakSet<object>): unknown {
  // Los errores pueden contener URLs de conexion y datos de la peticion.
  if (value instanceof Error) return { name: value.name };
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') {
    return value.replace(/\b(postgres(?:ql)?|https?):\/\/[^\s]+/gi, '[REDACTED_URL]');
  }
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    sensitiveKey.test(key.replace(/[-_]/g, '')) ? '[REDACTED]' : sanitize(item, seen),
  ]));
}

// El mensaje describe el evento; no pasar cuerpos, tokens ni secretos como texto libre.
export function createLogger(service: string, sink?: LogSink) {
  function log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service,
      message: sanitize(message, new WeakSet()),
      context: sanitize(context, new WeakSet()),
    });
    if (sink) sink(line);
    else if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }
  return {
    info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
    warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
    error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
  };
}

export const logger = createLogger('arca');
