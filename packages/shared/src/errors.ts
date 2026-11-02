export const errorStatus = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof errorStatus;

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details: Record<string, unknown> | null;
}

// Solo usar mensajes y detalles que sea seguro devolver al cliente.
export class AppError extends Error {
  readonly statusCode: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = errorStatus[code];
  }

  toResponse(): ErrorResponse {
    return { code: this.code, message: this.message, details: this.details };
  }
}
