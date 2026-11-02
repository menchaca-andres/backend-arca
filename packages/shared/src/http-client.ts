import { AppError, type ErrorCode, errorStatus } from './errors';

export const HTTP_TIMEOUT_MS = 3000;
export const HTTP_RETRIES = 1;

export interface HttpClientOptions {
  baseUrl: string;
  internalApiKey: string;
  timeoutMs?: number;
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

// El cliente se limita al origen configurado para no filtrar la clave a otros hosts.
// El reintento tambien aplica a escrituras: quien las invoque debe garantizar idempotencia.
export class HttpClient {
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;

  constructor(private readonly options: HttpClientOptions) {
    this.baseUrl = new URL(options.baseUrl);
    if (!['http:', 'https:'].includes(this.baseUrl.protocol) || this.baseUrl.username || this.baseUrl.password) {
      throw new Error('baseUrl debe ser una URL HTTP sin credenciales');
    }
    if (!options.internalApiKey.trim()) throw new Error('INTERNAL_API_KEY debe estar configurada');
    this.timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new Error('timeoutMs debe ser positivo');
  }

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (url.origin !== this.baseUrl.origin || url.username || url.password) {
      throw new Error('La ruta debe pertenecer al origen configurado');
    }
    const headers = new Headers(options.headers);
    headers.set('X-Internal-Key', this.options.internalApiKey);
    headers.set('Accept', 'application/json');
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    if (body !== undefined) headers.set('Content-Type', 'application/json');

    for (let attempt = 0; attempt <= HTTP_RETRIES; attempt++) {
      const controller = new AbortController();
      // El timeout incluye la lectura del cuerpo, no solo recibir las cabeceras.
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(url, {
          method: options.method ?? 'GET', headers, body,
          signal: controller.signal, redirect: 'error',
        });
        if ([502, 503, 504].includes(response.status)) {
          await response.body?.cancel();
          if (attempt < HTTP_RETRIES) continue;
          throw new AppError('SERVICE_UNAVAILABLE', 'El servicio remoto no esta disponible');
        }
        const text = await response.text();
        let data: unknown;
        try { data = text ? JSON.parse(text) : undefined; }
        catch { throw new AppError('SERVICE_UNAVAILABLE', 'Respuesta invalida del servicio remoto'); }
        if (!response.ok) {
          // Conservar solo codigos comunes cuyo estado coincida. Nunca reflejar texto remoto.
          const code = typeof data === 'object' && data !== null && 'code' in data ? data.code : undefined;
          if (typeof code === 'string' && Object.hasOwn(errorStatus, code)
            && errorStatus[code as ErrorCode] === response.status) {
            throw new AppError(code as ErrorCode, 'El servicio remoto rechazo la solicitud');
          }
          throw new AppError('SERVICE_UNAVAILABLE', 'Respuesta inesperada del servicio remoto');
        }
        return data as T;
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (attempt === HTTP_RETRIES) {
          throw new AppError('SERVICE_UNAVAILABLE', 'El servicio remoto no esta disponible');
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw new AppError('SERVICE_UNAVAILABLE', 'El servicio remoto no esta disponible');
  }
}
