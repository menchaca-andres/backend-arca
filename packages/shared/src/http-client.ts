import { AppError } from './errors';
import { logger } from './logger';

type QueryValue = string | number | boolean | undefined;

export interface InternalClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  /** Reintentos solo para GET (las escrituras no se reintentan solas). */
  retries?: number;
}

interface ErrorPayload {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

/**
 * Cliente HTTP para las rutas /internal/* entre microservicios.
 * - Envía X-Internal-Key.
 * - Timeout configurable (3 s por defecto).
 * - Un reintento por defecto, solo en GET.
 * - Traduce errores al formato común del proyecto.
 */
export class InternalClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(options: InternalClientOptions) {
    if (!options.baseUrl) throw new Error('InternalClient: baseUrl es obligatorio');
    if (!options.apiKey) throw new Error('InternalClient: apiKey es obligatorio');

    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 3_000;
    this.retries = options.retries ?? 1;
  }

  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    const maxAttempts = method === 'GET' ? this.retries + 1 : 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.execute<T>(method, path, body, query);
      } catch (error) {
        lastError = error;
        const retriable = error instanceof AppError ? error.status >= 500 : true;

        if (attempt === maxAttempts || !retriable) throw error;

        logger.warn('Reintentando llamada interna', {
          method,
          path,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }

    throw lastError;
  }

  private async execute<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    const url = this.buildUrl(path, query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers(body !== undefined),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        const { code, message, details } = this.parseError(payload, response.status);
        throw new AppError(code, message, response.status, details);
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof AppError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw AppError.serviceUnavailable(`El servicio interno no respondió en ${this.timeoutMs} ms`, {
          method,
          path,
        });
      }

      throw AppError.serviceUnavailable('No se pudo contactar al servicio interno', {
        method,
        path,
        cause: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  private headers(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Internal-Key': this.apiKey,
    };
    if (hasBody) headers['Content-Type'] = 'application/json';
    return headers;
  }

  private parseError(
    payload: ErrorPayload | null,
    status: number,
  ): {
    code: string;
    message: string;
    details: unknown;
  } {
    if (payload && typeof payload === 'object') {
      return {
        code: typeof payload.code === 'string' ? payload.code : this.fallbackCode(status),
        message: typeof payload.message === 'string' ? payload.message : 'Error del servicio interno',
        details: payload.details ?? null,
      };
    }

    return {
      code: this.fallbackCode(status),
      message: 'Error del servicio interno',
      details: null,
    };
  }

  private fallbackCode(status: number): string {
    if (status === 400) return 'VALIDATION_ERROR';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status >= 500) return 'SERVICE_UNAVAILABLE';
    return 'INTERNAL_ERROR';
  }
}
