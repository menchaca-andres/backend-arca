import crypto from 'node:crypto';
import { AppError, EstadoBoleta, EstadoPeriodo } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Boleta } from '../entities/boleta.entity';
import { BoletaDetalle } from '../entities/boleta-detalle.entity';
import { BoletaPdf } from '../entities/boleta-pdf.entity';
import { Periodo } from '../entities/periodo.entity';
import { PeriodoRepository } from '../repositories/periodo.repository';
import { BoletaRepository } from '../repositories/boleta.repository';
import { BoletaDetalleRepository } from '../repositories/boleta-detalle.repository';
import { BoletaPdfRepository } from '../repositories/boleta-pdf.repository';
import { CorrelativoRepository } from '../repositories/correlativo.repository';
import { ConceptoRepository } from '../repositories/concepto.repository';
import { NovedadRepository } from '../repositories/novedad.repository';
import { HttpPersonalClient, type PersonalClient } from '../clients/personal.client';
import { GotenbergClient, type PdfClient } from '../clients/gotenberg.client';
import { PlanillaCalculator } from './planilla-calculator';
import { generarHtmlBoleta } from '../templates/boleta-html.template';
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
    private readonly boletaPdfRepo: BoletaPdfRepository = new BoletaPdfRepository(),
    private readonly correlativoRepo: CorrelativoRepository = new CorrelativoRepository(),
    private readonly conceptoRepo: ConceptoRepository = new ConceptoRepository(),
    private readonly novedadRepo: NovedadRepository = new NovedadRepository(),
    private readonly personalClient: PersonalClient = new HttpPersonalClient(),
    private readonly pdfClient: PdfClient = new GotenbergClient(),
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

  /**
   * HU-22 CA-01 a CA-03: Emite las boletas del período haciéndolas inmutables.
   */
  async emitir(
    periodoId: string,
    emitidoPor: string = '00000000-0000-0000-0000-000000000000',
  ): Promise<{
    periodo: Periodo;
    resumen: ResumenPeriodo;
    boletas: Boleta[];
  }> {
    const periodo = await this.periodoRepo.findById(periodoId);
    if (!periodo) {
      throw AppError.notFound('Período no encontrado');
    }

    if (periodo.estado !== EstadoPeriodo.BORRADOR) {
      throw AppError.conflict('El período ya fue emitido previamente');
    }

    const boletas = await this.boletaRepo.findByPeriodoIdWithDetalles(periodoId);
    if (!boletas || boletas.length === 0) {
      throw AppError.badRequest('No se pueden emitir boletas sin haber calculado la planilla previamente');
    }

    // CA-02: No se puede emitir si alguna boleta tiene alerta o líquido negativo
    const conAlerta = boletas.filter((b) => b.tieneAlerta || Number(b.liquidoPagable) < 0);
    if (conAlerta.length > 0) {
      throw AppError.conflict(
        `No se puede emitir el período: existen ${conAlerta.length} boleta(s) con alertas o líquido pagable negativo (CA-02)`,
      );
    }

    const fechaEmision = new Date();

    // Emisión en una sola transacción atómica (CA-01)
    await AppDataSource.transaction(async (em) => {
      for (const boleta of boletas) {
        // Obtener siguiente correlativo atómico BP-AAAAMM-NNNN
        const seq = await this.correlativoRepo.obtenerSiguiente('BOLETA', periodo.anio, em);
        const seqStr = String(seq).padStart(4, '0');
        const mesStr = String(periodo.mes).padStart(2, '0');
        const numero = `BP-${periodo.anio}${mesStr}-${seqStr}`;

        boleta.numero = numero;
        boleta.estado = EstadoBoleta.EMITIDA;
        boleta.emitidaEn = fechaEmision;

        // Generar HTML y PDF (CA-03)
        const html = generarHtmlBoleta(boleta, periodo, boleta.detalles ?? []);
        const pdfBuffer = await this.pdfClient.generarPdf(html);
        const hashSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

        boleta.hashSha256 = hashSha256;
        await this.boletaRepo.save(boleta, em);

        // Guardar binario PDF
        const boletaPdf = new BoletaPdf();
        boletaPdf.boletaId = boleta.id;
        boletaPdf.contenido = pdfBuffer;
        boletaPdf.tamanoBytes = pdfBuffer.length;
        await this.boletaPdfRepo.save(boletaPdf, em);
      }

      periodo.estado = EstadoPeriodo.EMITIDO;
      periodo.fechaEmision = fechaEmision;
      periodo.emitidoPor = emitidoPor;
      await this.periodoRepo.save(periodo, em);
    });

    const boletasEmitidas = await this.boletaRepo.findByPeriodoIdWithDetalles(periodoId);
    const resumen = this.calcularResumen(boletasEmitidas);

    return {
      periodo,
      resumen,
      boletas: boletasEmitidas,
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

  // HU-25 CA-01, CA-02, CA-05: Estadísticas de masa salarial para el Dashboard
  async obtenerEstadisticas(): Promise<StatsBoletasDto> {
    const periodos = await this.periodoRepo.findAll();
    const boletas = await this.boletaRepo.findConFiltros({
      estados: [EstadoBoleta.EMITIDA, EstadoBoleta.RECTIFICADA],
    });

    const mapaPeriodos = new Map<string, { masaSalarial: number; liquidoTotal: number; count: number }>();
    for (const b of boletas) {
      if (b.estado === EstadoBoleta.EMITIDA) {
        const curr = mapaPeriodos.get(b.periodoId) || { masaSalarial: 0, liquidoTotal: 0, count: 0 };
        curr.masaSalarial += Number(b.totalGanado) || 0;
        curr.liquidoTotal += Number(b.liquidoPagable) || 0;
        curr.count += 1;
        mapaPeriodos.set(b.periodoId, curr);
      }
    }

    const periodosConEmision = periodos.filter((p) => (mapaPeriodos.get(p.id)?.count || 0) > 0);

    let masaSalarialUltimoPeriodo: StatsBoletasDto['masaSalarialUltimoPeriodo'] = null;
    if (periodosConEmision.length > 0) {
      const ultimo = periodosConEmision[0];
      const stats = mapaPeriodos.get(ultimo.id)!;
      masaSalarialUltimoPeriodo = {
        periodoId: ultimo.id,
        anio: ultimo.anio,
        mes: ultimo.mes,
        periodoNombre: `${String(ultimo.mes).padStart(2, '0')}/${ultimo.anio}`,
        monto: Number(stats.masaSalarial.toFixed(2)),
        moneda: 'BOB',
        totalBoletas: stats.count,
      };
    }

    const historialMasaSalarial: PeriodoMasaSalarial[] = periodosConEmision
      .slice(0, 6)
      .map((p) => {
        const s = mapaPeriodos.get(p.id)!;
        return {
          periodoId: p.id,
          anio: p.anio,
          mes: p.mes,
          periodoNombre: `${String(p.mes).padStart(2, '0')}/${p.anio}`,
          masaSalarial: Number(s.masaSalarial.toFixed(2)),
          liquidoTotal: Number(s.liquidoTotal.toFixed(2)),
          totalBoletas: s.count,
        };
      })
      .reverse();

    return {
      masaSalarialUltimoPeriodo,
      historialMasaSalarial,
    };
  }
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

export interface StatsBoletasDto {
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
