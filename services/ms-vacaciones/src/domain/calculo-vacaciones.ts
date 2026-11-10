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
