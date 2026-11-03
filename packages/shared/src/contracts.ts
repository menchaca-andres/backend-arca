import type { EstadoFuncionario, RolUsuario } from './enums';

/** Cabeceras de identidad que el gateway propaga a los servicios. */
export const HEADERS = {
  userId: 'x-user-id',
  userRole: 'x-user-rol',
  funcionarioId: 'x-funcionario-id',
  requestId: 'x-request-id',
  internalKey: 'x-internal-key',
} as const;

export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';

export interface RemuneracionContrato {
  monto: number;
  moneda: string;
}

/** Contrato de GET /internal/funcionarios/:id y GET /internal/funcionarios. */
export interface FuncionarioContrato {
  id: string;
  usuarioId: string | null;
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  fechaIngreso: string;
  diasPrueba: number;
  fechaRatificacion: string | null;
  fechaBaja: string | null;
  area: string;
  cargo: string;
  remuneracion: RemuneracionContrato;
  estado: EstadoFuncionario;
}

/** Contrato de PATCH /internal/usuarios/:id/estado. */
export interface UsuarioContrato {
  id: string;
  estado: EstadoUsuario;
}

export interface ActualizarEstadoUsuarioRequest {
  estado: EstadoUsuario;
  motivo?: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface HealthResponse {
  service: string;
  status: 'OK' | 'DEGRADED';
  db: 'up' | 'down' | 'not_configured';
}

/** Payload del JWT que emite ms-auth (HU-05). */
export interface JwtPayload {
  sub: string;
  rol: RolUsuario;
  id_funcionario: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: {
    id: string;
    email: string;
    rol: RolUsuario;
    funcionarioId: string | null;
  };
}
