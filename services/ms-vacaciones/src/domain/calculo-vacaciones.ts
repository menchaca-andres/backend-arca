import { EstadoFuncionario } from '@arca/shared';

export interface DatosFuncionarioVacaciones {
  id: string;
  nombreCompleto: string;
  fechaIngreso: string;
  estado: EstadoFuncionario;
}

export interface PeriodoVacacional {
  fechaProximaGestion: string;
  gestiones: number;
  diasGanados: number;
}

function fechaAniversario(fechaIngreso: string, anio: number): string {
  const [, mes, dia] = fechaIngreso.split('-').map(Number);
  const candidato = new Date(Date.UTC(anio, mes - 1, dia));
  if (candidato.getUTCMonth() !== mes - 1) {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(Date.UTC(anio, mes, 0)).getUTCDate()).padStart(2, '0')}`;
  }
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function calcularPeriodoVacacional(fechaIngreso: string, hoy: string): PeriodoVacacional {
  const anioIngreso = Number(fechaIngreso.slice(0, 4));
  const anioActual = Number(hoy.slice(0, 4));
  let gestiones = Math.max(0, anioActual - anioIngreso);

  if (gestiones > 0 && fechaAniversario(fechaIngreso, anioActual) > hoy) gestiones -= 1;

  const fechaProximaGestion = fechaAniversario(fechaIngreso, anioIngreso + gestiones + 1);
  return {
    gestiones,
    diasGanados: gestiones * 15,
    fechaProximaGestion,
  };
}

export function evaluarElegibilidad(
  funcionario: DatosFuncionarioVacaciones,
  hoy: string,
): { elegible: boolean; motivo: string | null } {
  if (funcionario.estado === EstadoFuncionario.BAJA) {
    return { elegible: false, motivo: 'El funcionario se encuentra de baja' };
  }
  if (funcionario.estado !== EstadoFuncionario.RATIFICADO) {
    return { elegible: false, motivo: 'El funcionario debe estar ratificado' };
  }
  if (calcularPeriodoVacacional(funcionario.fechaIngreso, hoy).gestiones < 1) {
    return { elegible: false, motivo: 'Debe cumplir al menos un año desde su fecha de ingreso' };
  }
  return { elegible: true, motivo: null };
}

export interface SolicitudItemKardex {
  id: string;
  funcionarioId: string;
  funcionarioNombre: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  estado: string;
  motivoRechazo: string | null;
  registradoPor: string;
  resueltoPor: string | null;
  fechaResolucion: Date | null;
  createdAt: Date;
}

export interface GestionKardexItem {
  numero: number;
  periodoInicio: string;
  periodoFin: string;
  cumplida: boolean;
  diasGanados: number;
  diasUsados: number;
  diasReservados: number;
  diasDisponibles: number;
  solicitudes: SolicitudItemKardex[];
}

export interface KardexVacaciones {
  funcionarioId: string;
  funcionarioNombre: string;
  fechaIngreso: string;
  gestionesCumplidas: number;
  diasGanadosTotal: number;
  diasUsadosTotal: number;
  diasReservadosTotal: number;
  diasDisponiblesTotal: number;
  gestiones: GestionKardexItem[];
}

export function construirKardex(
  funcionario: DatosFuncionarioVacaciones,
  hoy: string,
  todasSolicitudes: SolicitudItemKardex[],
  filtros?: { estado?: string; anio?: number },
): KardexVacaciones {
  const periodo = calcularPeriodoVacacional(funcionario.fechaIngreso, hoy);
  const gestionesCumplidas = periodo.gestiones;
  const anioIngreso = Number(funcionario.fechaIngreso.slice(0, 4));

  // Determinar hasta qué año extender las gestiones (mínimo período en curso)
  let maxAnioSolicitud = anioIngreso + gestionesCumplidas + 1;
  for (const sol of todasSolicitudes) {
    const anioSol = Number(sol.fechaInicio.slice(0, 4));
    if (anioSol > maxAnioSolicitud) maxAnioSolicitud = anioSol;
  }

  const totalPeriodos = Math.max(1, maxAnioSolicitud - anioIngreso + 1);
  const gestionesBrutas: GestionKardexItem[] = [];

  for (let i = 1; i <= totalPeriodos; i += 1) {
    const periodoInicio = fechaAniversario(funcionario.fechaIngreso, anioIngreso + i - 1);
    const periodoFin = fechaAniversario(funcionario.fechaIngreso, anioIngreso + i);
    const cumplida = i <= gestionesCumplidas;
    const diasGanados = cumplida ? 15 : 0;

    // Asignar solicitudes cuyo inicio caiga dentro del período de la gestión
    const solicitudesDeGestion = todasSolicitudes.filter((s) => {
      if (i === 1 && s.fechaInicio < periodoInicio) return true;
      if (i === totalPeriodos && s.fechaInicio >= periodoFin) return true;
      return s.fechaInicio >= periodoInicio && s.fechaInicio < periodoFin;
    });

    const diasUsados = solicitudesDeGestion
      .filter((s) => s.estado === 'APROBADA')
      .reduce((acc, s) => acc + s.diasHabiles, 0);
    const diasReservados = solicitudesDeGestion
      .filter((s) => s.estado === 'PENDIENTE')
      .reduce((acc, s) => acc + s.diasHabiles, 0);
    const diasDisponibles = Math.max(0, diasGanados - diasUsados - diasReservados);

    // Filtrar solicitudes a mostrar si el usuario aplicó filtro de estado
    let solicitudesVisibles = solicitudesDeGestion;
    if (filtros?.estado) {
      solicitudesVisibles = solicitudesVisibles.filter((s) => s.estado === filtros.estado);
    }
    if (filtros?.anio) {
      const anioStr = String(filtros.anio);
      solicitudesVisibles = solicitudesVisibles.filter(
        (s) => s.fechaInicio.startsWith(anioStr) || s.fechaFin.startsWith(anioStr),
      );
    }

    gestionesBrutas.push({
      numero: i,
      periodoInicio,
      periodoFin,
      cumplida,
      diasGanados,
      diasUsados,
      diasReservados,
      diasDisponibles,
      solicitudes: solicitudesVisibles,
    });
  }

  // Si hay filtro por año, filtrar las gestiones que coinciden con el año o tienen solicitudes en él
  let gestionesFinales = gestionesBrutas;
  if (filtros?.anio) {
    const anioStr = String(filtros.anio);
    gestionesFinales = gestionesBrutas.filter(
      (g) => g.periodoInicio.startsWith(anioStr) || g.periodoFin.startsWith(anioStr) || g.solicitudes.length > 0,
    );
  }

  const diasGanadosTotal = periodo.diasGanados;
  const diasUsadosTotal = todasSolicitudes
    .filter((s) => s.estado === 'APROBADA')
    .reduce((acc, s) => acc + s.diasHabiles, 0);
  const diasReservadosTotal = todasSolicitudes
    .filter((s) => s.estado === 'PENDIENTE')
    .reduce((acc, s) => acc + s.diasHabiles, 0);
  const diasDisponiblesTotal = diasGanadosTotal - diasUsadosTotal - diasReservadosTotal;

  return {
    funcionarioId: funcionario.id,
    funcionarioNombre: funcionario.nombreCompleto,
    fechaIngreso: funcionario.fechaIngreso,
    gestionesCumplidas,
    diasGanadosTotal,
    diasUsadosTotal,
    diasReservadosTotal,
    diasDisponiblesTotal,
    gestiones: gestionesFinales,
  };
}
