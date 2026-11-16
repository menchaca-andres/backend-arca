export interface PersonalStats {
  activos: number;
  enPrueba: number;
  bajasMes: number;
  funcionariosPorArea: Array<{ area: string; cantidad: number }>;
  periodosPruebaPorVencer: Array<{
    id: string;
    nombreCompleto: string;
    ci: string;
    diasRestantes: number;
    fechaVencimiento: string;
  }>;
  cumplenGestionMes: Array<{
    id: string;
    nombres: string;
    apellidos: string;
    ci: string;
    aniosCumplidos: number;
    fechaIngreso: string;
  }>;
}

export interface VacacionesStats {
  solicitudesPendientes: number;
  alertas: Array<{
    id: string;
    funcionarioId: string;
    funcionarioNombre: string;
    diasHabiles: number;
    fechaInicio: string;
    fechaFin: string;
    createdAt: string;
  }>;
}

export interface PeriodoMasaSalarial {
  periodoId: string;
  anio: number;
  mes: number;
  periodoNombre: string;
  masaSalarial: number;
  liquidoTotal: number;
  totalBoletas: number;
}

export interface BoletasStats {
  masaSalarialUltimoPeriodo: {
    periodoId: string;
    anio: number;
    mes: number;
    periodoNombre: string;
    monto: number;
    moneda: string;
    totalBoletas: number;
  } | null;
  historialMasaSalarial: PeriodoMasaSalarial[];
}

export type EstadoServicio = 'OK' | 'ERROR';

export interface DashboardResponse {
  personal: PersonalStats | null;
  vacaciones: VacacionesStats | null;
  boletas: BoletasStats | null;
  servicios: {
    personal: EstadoServicio;
    vacaciones: EstadoServicio;
    boletas: EstadoServicio;
  };
  timestamp: string;
}
