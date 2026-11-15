import { AppError, EstadoBoleta, EstadoPeriodo } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Boleta } from '../entities/boleta.entity';
import { BoletaDetalle } from '../entities/boleta-detalle.entity';
import { Periodo } from '../entities/periodo.entity';
import { PeriodoRepository } from '../repositories/periodo.repository';
import { BoletaRepository } from '../repositories/boleta.repository';
import { BoletaDetalleRepository } from '../repositories/boleta-detalle.repository';
import { ConceptoRepository } from '../repositories/concepto.repository';
import { NovedadRepository } from '../repositories/novedad.repository';
import { HttpPersonalClient, type PersonalClient } from '../clients/personal.client';
import { PlanillaCalculator } from './planilla-calculator';
import type { AbrirPeriodoInput } from '../schemas/periodo.schema';

export interface ResumenPeriodo {
  totalGanado: number;
  totalDescuentos: number;
  totalLiquido: number;
  cantidadBoletas: number;
  cantidadAlertas: number;
}

export class PeriodoService {
  constructor(
    private readonly periodoRepo: PeriodoRepository = new PeriodoRepository(),
    private readonly boletaRepo: BoletaRepository = new BoletaRepository(),
    private readonly boletaDetalleRepo: BoletaDetalleRepository = new BoletaDetalleRepository(),
    private readonly conceptoRepo: ConceptoRepository = new ConceptoRepository(),
    private readonly novedadRepo: NovedadRepository = new NovedadRepository(),
    private readonly personalClient: PersonalClient = new HttpPersonalClient(),
  ) {}

  /**
   * CA-01: RRHH abre un período (mes y año); no puede haber dos períodos iguales.
   */
  async abrir(input: AbrirPeriodoInput): Promise<Periodo> {
    const existente = await this.periodoRepo.findByAnioMes(input.anio, input.mes);
    if (existente) {
      throw AppError.conflict(`El período ${input.mes}/${input.anio} ya se encuentra registrado`);
    }

    const periodo = new Periodo();
    periodo.anio = input.anio;
    periodo.mes = input.mes;
    periodo.estado = EstadoPeriodo.BORRADOR;
    periodo.fechaCalculo = null;
    periodo.fechaEmision = null;
    periodo.emitidoPor = null;

    return this.periodoRepo.save(periodo);
  }

  /**
   * Listar todos los períodos con resumen estadístico.
   */
  async listar(): Promise<Array<Periodo & { resumen: ResumenPeriodo }>> {
    const periodos = await this.periodoRepo.findAll();
    const resultados: Array<Periodo & { resumen: ResumenPeriodo }> = [];

    for (const periodo of periodos) {
      const boletas = await this.boletaRepo.findByPeriodoId(periodo.id);
      const resumen = this.calcularResumen(boletas);
      resultados.push(Object.assign(periodo, { resumen }));
    }

    return resultados;
  }

  /**
   * Obtener detalle completo de un período, sus boletas y resumen.
   */
  async obtenerPorId(id: string): Promise<{
    periodo: Periodo;
    resumen: ResumenPeriodo;
    boletas: Boleta[];
  }> {
    const periodo = await this.periodoRepo.findById(id);
    if (!periodo) {
      throw AppError.notFound('Período no encontrado');
    }

    const boletas = await this.boletaRepo.findByPeriodoIdWithDetalles(id);
    const resumen = this.calcularResumen(boletas);

    return {
      periodo,
      resumen,
      boletas,
    };
  }

  /**
   * CA-02 a CA-07: Calcula la planilla del período.
   * Mientras el período esté en BORRADOR, borra y recalcula cuantas veces sea necesario.
   */
  async calcular(periodoId: string): Promise<{
    periodo: Periodo;
    resumen: ResumenPeriodo;
    boletas: Boleta[];
  }> {
    const periodo = await this.periodoRepo.findById(periodoId);
    if (!periodo) {
      throw AppError.notFound('Período no encontrado');
    }

    // CA-07: Solo se recalcula si está en BORRADOR
    if (periodo.estado !== EstadoPeriodo.BORRADOR) {
      throw AppError.conflict('Solo se puede calcular o recalcular un período en estado BORRADOR');
    }

    // Ventana de fechas del mes
    const fechaInicioMes = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(Date.UTC(periodo.anio, periodo.mes, 0)).getUTCDate();
    const fechaFinMes = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    // CA-02: Funcionarios activos al menos un día en el mes vía ms-personal
    const funcionarios = await this.personalClient.getFuncionariosActivos(fechaInicioMes, fechaFinMes);

    // Conceptos activos ordenados
    const conceptosActivos = await this.conceptoRepo.findAll({ activo: true });

    // Novedades del período
    const novedades = await this.novedadRepo.findByPeriodo(periodo.anio, periodo.mes);
    const novedadesPorFuncionario = new Map<string, typeof novedades>();
    for (const nov of novedades) {
      const list = novedadesPorFuncionario.get(nov.funcionarioId) ?? [];
      list.push(nov);
      novedadesPorFuncionario.set(nov.funcionarioId, list);
    }

    // Transacción para borrar borrador previo y persistir el nuevo cálculo limpio (CA-07)
    await AppDataSource.transaction(async (em) => {
      // Borrar boletas previas en borrador
      await this.boletaRepo.deleteByPeriodoId(periodoId, em);

      for (const funcionario of funcionarios) {
        const novedadesFunc = novedadesPorFuncionario.get(funcionario.id) ?? [];
        const calculo = PlanillaCalculator.calcularBoletaFuncionario(
          funcionario,
          conceptosActivos,
          novedadesFunc,
          periodo.anio,
          periodo.mes,
        );

        const boleta = new Boleta();
        boleta.periodoId = periodo.id;
        boleta.funcionarioId = funcionario.id;
        boleta.version = 1;
        boleta.estado = EstadoBoleta.BORRADOR;
        boleta.datosFuncionario = calculo.datosFuncionario;
        boleta.diasTrabajados = calculo.diasTrabajados;
        boleta.totalGanado = calculo.totalGanado;
        boleta.totalDescuentos = calculo.totalDescuentos;
        boleta.liquidoPagable = calculo.liquidoPagable;
        boleta.tieneAlerta = calculo.tieneAlerta;
        boleta.boletaOriginalId = null;
        boleta.motivoRectificacion = null;
        boleta.numero = null;
        boleta.hashSha256 = null;
        boleta.emitidaEn = null;

        const boletaGuardada = await this.boletaRepo.save(boleta, em);

        const detalles = calculo.detalles.map((d) => {
          const detalle = new BoletaDetalle();
          detalle.boletaId = boletaGuardada.id;
          detalle.conceptoId = d.conceptoId;
          detalle.conceptoCodigo = d.conceptoCodigo;
          detalle.conceptoNombre = d.conceptoNombre;
          detalle.tipo = d.tipo;
          detalle.baseMonto = d.baseMonto;
          detalle.porcentaje = d.porcentaje;
          detalle.monto = d.monto;
          detalle.orden = d.orden;
          return detalle;
        });

        if (detalles.length > 0) {
          await this.boletaDetalleRepo.saveMany(detalles, em);
        }
      }

      periodo.fechaCalculo = new Date();
      await this.periodoRepo.save(periodo, em);
    });

    const boletasGuardadas = await this.boletaRepo.findByPeriodoIdWithDetalles(periodo.id);
    const resumen = this.calcularResumen(boletasGuardadas);

    return {
      periodo,
      resumen,
      boletas: boletasGuardadas,
    };
  }

  private calcularResumen(boletas: Boleta[]): ResumenPeriodo {
    let totalGanado = 0;
    let totalDescuentos = 0;
    let totalLiquido = 0;
    let cantidadAlertas = 0;

    for (const b of boletas) {
      totalGanado += Number(b.totalGanado) || 0;
      totalDescuentos += Number(b.totalDescuentos) || 0;
      totalLiquido += Number(b.liquidoPagable) || 0;
      if (b.tieneAlerta) {
        cantidadAlertas += 1;
      }
    }

    return {
      totalGanado: Number(totalGanado.toFixed(2)),
      totalDescuentos: Number(totalDescuentos.toFixed(2)),
      totalLiquido: Number(totalLiquido.toFixed(2)),
      cantidadBoletas: boletas.length,
      cantidadAlertas,
    };
  }
}
