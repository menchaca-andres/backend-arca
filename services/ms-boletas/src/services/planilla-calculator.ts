import { BaseCalculo, FormaCalculo, TipoConcepto, type FuncionarioContrato } from '@arca/shared';
import type { Concepto } from '../entities/concepto.entity';
import type { Novedad } from '../entities/novedad.entity';

export interface DetalleCalculado {
  conceptoId: string;
  conceptoCodigo: string;
  conceptoNombre: string;
  tipo: TipoConcepto;
  baseMonto: number | null;
  porcentaje: number | null;
  monto: number;
  orden: number;
}

export interface BoletaCalculada {
  funcionarioId: string;
  datosFuncionario: {
    nombres: string;
    apellidos: string;
    documentoIdentidad: string;
    cargo: string;
    area: string;
    remuneracion: number;
  };
  diasTrabajados: number;
  totalGanado: number;
  totalDescuentos: number;
  liquidoPagable: number;
  tieneAlerta: boolean;
  detalles: DetalleCalculado[];
}

export class PlanillaCalculator {
  /**
   * CA-03: Prorratea días trabajados en base 30 comercial boliviana.
   */
  static calcularDiasTrabajados(
    fechaIngresoStr: string,
    fechaBajaStr: string | null | undefined,
    anio: number,
    mes: number,
  ): number {
    const fechaInicioMes = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDiaMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const fechaFinMes = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

    const ingreso = fechaIngresoStr.slice(0, 10);
    const baja = fechaBajaStr ? fechaBajaStr.slice(0, 10) : null;

    // Si ingresó después del fin de mes o fue dado de baja antes del inicio de mes
    if (ingreso > fechaFinMes) return 0;
    if (baja && baja < fechaInicioMes) return 0;

    let startDay = 1;
    if (ingreso > fechaInicioMes) {
      startDay = parseInt(ingreso.slice(8, 10), 10);
    }

    let endDay = 30;
    if (baja && baja <= fechaFinMes) {
      endDay = parseInt(baja.slice(8, 10), 10);
    }

    if (startDay === 1 && !baja) {
      return 30;
    }

    const start = Math.min(startDay, 30);
    const end = Math.min(endDay, 30);
    const dias = Math.max(0, end - start + 1);

    return Math.min(30, Math.max(0, dias));
  }

  /**
   * CA-04 y CA-05: Aplica conceptos y novedades para un funcionario calculando líneas a 2 decimales.
   */
  static calcularBoletaFuncionario(
    funcionario: FuncionarioContrato,
    conceptosActivos: Concepto[],
    novedadesFuncionario: Novedad[],
    anio: number,
    mes: number,
  ): BoletaCalculada {
    const diasTrabajados = this.calcularDiasTrabajados(funcionario.fechaIngreso, funcionario.fechaBaja, anio, mes);

    const remuneracion = funcionario.remuneracion?.monto ?? 0;
    const detalles: DetalleCalculado[] = [];
    const mapaNovedades = new Map<string, Novedad>();
    for (const nov of novedadesFuncionario) {
      mapaNovedades.set(nov.conceptoId, nov);
    }

    // Ordenar primero todos los Haberes por su orden configurado, luego Descuentos por su orden.
    // Esto asegura que totalGanado esté completo antes de calcular descuentos basados en TOTAL_GANADO.
    const haberes = conceptosActivos
      .filter((c) => c.tipo === TipoConcepto.HABER)
      .sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
    const descuentos = conceptosActivos
      .filter((c) => c.tipo === TipoConcepto.DESCUENTO)
      .sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));

    let haberBasico = 0;
    let totalGanado = 0;
    let totalDescuentos = 0;

    // 1. Evaluar Haberes
    for (const concepto of haberes) {
      if (concepto.automatico) {
        if (concepto.formaCalculo === FormaCalculo.SISTEMA) {
          // Haber básico proporcional a días trabajados
          const monto = Number(((remuneracion * diasTrabajados) / 30).toFixed(2));
          haberBasico = monto;
          totalGanado += monto;
          detalles.push({
            conceptoId: concepto.id,
            conceptoCodigo: concepto.codigo,
            conceptoNombre: concepto.nombre,
            tipo: TipoConcepto.HABER,
            baseMonto: remuneracion,
            porcentaje: null,
            monto,
            orden: concepto.orden,
          });
        } else if (concepto.formaCalculo === FormaCalculo.MONTO_FIJO) {
          const monto = Number((concepto.valor ?? 0).toFixed(2));
          totalGanado += monto;
          detalles.push({
            conceptoId: concepto.id,
            conceptoCodigo: concepto.codigo,
            conceptoNombre: concepto.nombre,
            tipo: TipoConcepto.HABER,
            baseMonto: null,
            porcentaje: null,
            monto,
            orden: concepto.orden,
          });
        } else if (concepto.formaCalculo === FormaCalculo.PORCENTAJE) {
          const base = concepto.base === BaseCalculo.HABER_BASICO ? haberBasico : totalGanado;
          const porcentaje = concepto.valor ?? 0;
          const monto = Number((base * (porcentaje / 100)).toFixed(2));
          totalGanado += monto;
          detalles.push({
            conceptoId: concepto.id,
            conceptoCodigo: concepto.codigo,
            conceptoNombre: concepto.nombre,
            tipo: TipoConcepto.HABER,
            baseMonto: base,
            porcentaje,
            monto,
            orden: concepto.orden,
          });
        }
      } else {
        // Concepto no automático: se aplica solo si existe novedad
        const novedad = mapaNovedades.get(concepto.id);
        if (novedad) {
          const monto = Number(Number(novedad.monto).toFixed(2));
          totalGanado += monto;
          detalles.push({
            conceptoId: concepto.id,
            conceptoCodigo: concepto.codigo,
            conceptoNombre: concepto.nombre,
            tipo: TipoConcepto.HABER,
            baseMonto: null,
            porcentaje: null,
            monto,
            orden: concepto.orden,
          });
        }
      }
    }

    totalGanado = Number(totalGanado.toFixed(2));

    // 2. Evaluar Descuentos
    for (const concepto of descuentos) {
      if (concepto.automatico) {
        if (concepto.formaCalculo === FormaCalculo.MONTO_FIJO) {
          const monto = Number((concepto.valor ?? 0).toFixed(2));
          totalDescuentos += monto;
          detalles.push({
            conceptoId: concepto.id,
            conceptoCodigo: concepto.codigo,
            conceptoNombre: concepto.nombre,
            tipo: TipoConcepto.DESCUENTO,
            baseMonto: null,
            porcentaje: null,
            monto,
            orden: concepto.orden,
          });
        } else if (concepto.formaCalculo === FormaCalculo.PORCENTAJE) {
          const base = concepto.base === BaseCalculo.HABER_BASICO ? haberBasico : totalGanado;
          const porcentaje = concepto.valor ?? 0;
          const monto = Number((base * (porcentaje / 100)).toFixed(2));
          totalDescuentos += monto;
          detalles.push({
            conceptoId: concepto.id,
            conceptoCodigo: concepto.codigo,
            conceptoNombre: concepto.nombre,
            tipo: TipoConcepto.DESCUENTO,
            baseMonto: base,
            porcentaje,
            monto,
            orden: concepto.orden,
          });
        }
      } else {
        // Concepto no automático de descuento
        const novedad = mapaNovedades.get(concepto.id);
        if (novedad) {
          const monto = Number(Number(novedad.monto).toFixed(2));
          totalDescuentos += monto;
          detalles.push({
            conceptoId: concepto.id,
            conceptoCodigo: concepto.codigo,
            conceptoNombre: concepto.nombre,
            tipo: TipoConcepto.DESCUENTO,
            baseMonto: null,
            porcentaje: null,
            monto,
            orden: concepto.orden,
          });
        }
      }
    }

    totalDescuentos = Number(totalDescuentos.toFixed(2));
    const liquidoPagable = Number((totalGanado - totalDescuentos).toFixed(2));
    // CA-06: Si el líquido fuera negativo, se marca con alerta
    const tieneAlerta = liquidoPagable < 0;

    return {
      funcionarioId: funcionario.id,
      datosFuncionario: {
        nombres: funcionario.nombres,
        apellidos: funcionario.apellidos,
        documentoIdentidad: funcionario.documentoIdentidad,
        cargo: funcionario.cargo,
        area: funcionario.area,
        remuneracion,
      },
      diasTrabajados,
      totalGanado,
      totalDescuentos,
      liquidoPagable,
      tieneAlerta,
      detalles,
    };
  }
}
