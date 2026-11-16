import crypto from 'node:crypto';
import { AppError, EstadoBoleta, RolUsuario, type FuncionarioContrato, type Identity } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Boleta } from '../entities/boleta.entity';
import { BoletaDetalle } from '../entities/boleta-detalle.entity';
import { BoletaPdf } from '../entities/boleta-pdf.entity';
import { BoletaRepository, type FiltrosBoleta } from '../repositories/boleta.repository';
import { BoletaDetalleRepository } from '../repositories/boleta-detalle.repository';
import { BoletaPdfRepository } from '../repositories/boleta-pdf.repository';
import { PeriodoRepository } from '../repositories/periodo.repository';
import { CorrelativoRepository } from '../repositories/correlativo.repository';
import { ConceptoRepository } from '../repositories/concepto.repository';
import { NovedadRepository } from '../repositories/novedad.repository';
import { GotenbergClient, type PdfClient } from '../clients/gotenberg.client';
import { PlanillaCalculator } from './planilla-calculator';
import { generarHtmlBoleta } from '../templates/boleta-html.template';
import type { RectificarBoletaInput } from '../schemas/boleta.schema';

export interface ResumenListadoBoletas {
  totalGanado: number;
  totalDescuentos: number;
  totalLiquido: number;
  cantidadBoletas: number;
}

export interface DetalleBoletaResponse extends Boleta {
  versionVigente?: {
    id: string;
    numero: string | null;
    version: number;
    estado: EstadoBoleta;
    liquidoPagable: number;
  } | null;
  historialVersiones?: Array<{
    id: string;
    numero: string | null;
    version: number;
    estado: EstadoBoleta;
    motivoRectificacion: string | null;
    createdAt?: Date;
  }>;
}

export interface ListadoBoletasResponse {
  boletas: Boleta[];
  resumen: ResumenListadoBoletas;
}

export class BoletaService {
  constructor(
    private readonly boletaRepo: BoletaRepository = new BoletaRepository(),
    private readonly boletaDetalleRepo: BoletaDetalleRepository = new BoletaDetalleRepository(),
    private readonly boletaPdfRepo: BoletaPdfRepository = new BoletaPdfRepository(),
    private readonly periodoRepo: PeriodoRepository = new PeriodoRepository(),
    private readonly correlativoRepo: CorrelativoRepository = new CorrelativoRepository(),
    private readonly conceptoRepo: ConceptoRepository = new ConceptoRepository(),
    private readonly novedadRepo: NovedadRepository = new NovedadRepository(),
    private readonly pdfClient: PdfClient = new GotenbergClient(),
  ) {}

  /**
   * HU-23 CA-01 y CA-02:
   * RRHH lista las boletas por período y por funcionario, con totales del período.
   * Un FUNCIONARIO ve solo sus boletas emitidas, ordenadas de la más reciente a la más antigua.
   * CA-05: Las boletas en borrador no son visibles para el FUNCIONARIO.
   */
  async listar(filtros: FiltrosBoleta = {}, identity?: Identity | null): Promise<ListadoBoletasResponse> {
    const filtrosEfectivos: FiltrosBoleta = { ...filtros };

    // CA-02 y CA-05: Regla de visibilidad para FUNCIONARIO
    if (identity?.rol === RolUsuario.FUNCIONARIO) {
      if (!identity.funcionarioId) {
        throw AppError.forbidden('El usuario no tiene un funcionario asociado');
      }
      filtrosEfectivos.funcionarioId = identity.funcionarioId;
      filtrosEfectivos.estados = [EstadoBoleta.EMITIDA, EstadoBoleta.RECTIFICADA];
    }

    const boletas = await this.boletaRepo.findConFiltros(filtrosEfectivos);

    // CA-01: Totales consolidados del conjunto de boletas
    const totalGanado = Number(
      boletas.reduce((acc, b) => acc + (Number(b.totalGanado) || 0), 0).toFixed(2),
    );
    const totalDescuentos = Number(
      boletas.reduce((acc, b) => acc + (Number(b.totalDescuentos) || 0), 0).toFixed(2),
    );
    const totalLiquido = Number(
      boletas.reduce((acc, b) => acc + (Number(b.liquidoPagable) || 0), 0).toFixed(2),
    );

    return {
      boletas,
      resumen: {
        totalGanado,
        totalDescuentos,
        totalLiquido,
        cantidadBoletas: boletas.length,
      },
    };
  }

  /**
   * HU-23 CA-03:
   * El detalle muestra haberes y descuentos línea por línea y, si fue rectificada, enlaza a su versión vigente.
   * Aplica reglas de visibilidad CA-02 y CA-05 para FUNCIONARIO.
   */
  async obtenerPorId(id: string, identity?: Identity | null): Promise<DetalleBoletaResponse> {
    const boleta = await this.boletaRepo.findById(id);
    if (!boleta) {
      throw AppError.notFound('Boleta no encontrada');
    }

    // CA-02 y CA-05: Control de visibilidad
    if (identity?.rol === RolUsuario.FUNCIONARIO) {
      if (!identity.funcionarioId || boleta.funcionarioId !== identity.funcionarioId) {
        throw AppError.forbidden('No tiene permiso para acceder a esta boleta');
      }
      if (boleta.estado === EstadoBoleta.BORRADOR) {
        throw AppError.forbidden('Las boletas en borrador no son visibles para el funcionario');
      }
    }

    // CA-03: Enlace a versión vigente si fue rectificada
    let versionVigente: Boleta | null = null;
    if (boleta.estado === EstadoBoleta.RECTIFICADA) {
      versionVigente = await this.boletaRepo.findVersionVigente(boleta.boletaOriginalId ?? boleta.id);
    }

    // Historial de versiones asociadas
    const historial = await this.boletaRepo.findHistorialVersiones(boleta);

    return {
      ...boleta,
      versionVigente: versionVigente
        ? {
            id: versionVigente.id,
            numero: versionVigente.numero,
            version: versionVigente.version,
            estado: versionVigente.estado,
            liquidoPagable: versionVigente.liquidoPagable,
          }
        : null,
      historialVersiones: historial.map((h) => ({
        id: h.id,
        numero: h.numero,
        version: h.version,
        estado: h.estado,
        motivoRectificacion: h.motivoRectificacion,
        createdAt: h.createdAt,
      })),
    };
  }

  /**
   * HU-23 CA-04:
   * La descarga entrega el PDF guardado y verifica su hash SHA-256.
   */
  async obtenerPdf(
    id: string,
    identity?: Identity | null,
  ): Promise<{ buffer: Buffer; boleta: Boleta }> {
    // Valida visibilidad de la boleta según el rol
    const boleta = await this.obtenerPorId(id, identity);

    const pdf = await this.boletaPdfRepo.findByIdConContenido(id);
    if (!pdf || !pdf.contenido) {
      throw AppError.notFound('El archivo PDF de la boleta no está disponible');
    }

    // CA-04: Verificación criptográfica de integridad SHA-256
    const hashCalculado = crypto.createHash('sha256').update(pdf.contenido).digest('hex');
    if (hashCalculado !== boleta.hashSha256) {
      throw AppError.internal(
        'Error de integridad: el hash SHA-256 del PDF no coincide con el registro original',
      );
    }

    return { buffer: pdf.contenido, boleta };
  }

  /**
   * HU-22 CA-05 y CA-06: Rectifica una boleta emitida con recálculo, nueva versión y nuevo PDF inmutable.
   */
  async rectificar(
    boletaId: string,
    input: RectificarBoletaInput,
  ): Promise<Boleta> {
    const boletaOriginal = await this.boletaRepo.findById(boletaId);
    if (!boletaOriginal) {
      throw AppError.notFound('Boleta original no encontrada');
    }

    // Solo se pueden rectificar boletas EMITIDAS
    if (boletaOriginal.estado !== EstadoBoleta.EMITIDA) {
      throw AppError.conflict(
        `Solo se puede rectificar una boleta en estado EMITIDA (estado actual: ${boletaOriginal.estado})`,
      );
    }

    const periodo = await this.periodoRepo.findById(boletaOriginal.periodoId);
    if (!periodo) {
      throw AppError.notFound('Período de la boleta no encontrado');
    }

    const datos = (boletaOriginal.datosFuncionario ?? {}) as Record<string, any>;
    const funcionarioMock: FuncionarioContrato = {
      id: boletaOriginal.funcionarioId,
      usuarioId: null,
      nombres: datos.nombres ?? '',
      apellidos: datos.apellidos ?? '',
      documentoIdentidad: datos.documentoIdentidad ?? '',
      fechaIngreso: datos.fechaIngreso ?? `${periodo.anio}-01-01`,
      diasPrueba: 90,
      fechaRatificacion: null,
      fechaBaja: null,
      area: datos.area ?? '',
      cargo: datos.cargo ?? '',
      remuneracion: { monto: Number(datos.remuneracion ?? 0), moneda: 'BOB' },
      estado: 'RATIFICADO' as any,
    };

    // Conceptos activos y novedades corregidas para este funcionario en este período
    const conceptosActivos = await this.conceptoRepo.findAll({ activo: true });
    const novedades = await this.novedadRepo.findByPeriodo(
      periodo.anio,
      periodo.mes,
      boletaOriginal.funcionarioId,
    );

    // CA-06: Recalcula con conceptos y novedades actualizadas
    const calculo = PlanillaCalculator.calcularBoletaFuncionario(
      funcionarioMock,
      conceptosActivos,
      novedades,
      periodo.anio,
      periodo.mes,
    );

    if (calculo.tieneAlerta || calculo.liquidoPagable < 0) {
      throw AppError.conflict(
        'La rectificación genera líquido pagable negativo y no puede ser emitida (CA-06)',
      );
    }

    const fechaEmision = new Date();
    let nuevaBoletaId = '';

    await AppDataSource.transaction(async (em) => {
      // 1. Marcar la boleta original como RECTIFICADA (CA-05)
      boletaOriginal.estado = EstadoBoleta.RECTIFICADA;
      await this.boletaRepo.save(boletaOriginal, em);

      // 2. Generar correlativo para la nueva versión
      const seq = await this.correlativoRepo.obtenerSiguiente('BOLETA', periodo.anio, em);
      const seqStr = String(seq).padStart(4, '0');
      const mesStr = String(periodo.mes).padStart(2, '0');
      const numero = `BP-${periodo.anio}${mesStr}-${seqStr}`;

      // 3. Crear la nueva boleta (versión siguiente)
      const nuevaBoleta = new Boleta();
      nuevaBoleta.periodoId = boletaOriginal.periodoId;
      nuevaBoleta.funcionarioId = boletaOriginal.funcionarioId;
      nuevaBoleta.version = boletaOriginal.version + 1;
      nuevaBoleta.estado = EstadoBoleta.EMITIDA;
      nuevaBoleta.boletaOriginalId = boletaOriginal.id;
      nuevaBoleta.motivoRectificacion = input.motivo;
      nuevaBoleta.numero = numero;
      nuevaBoleta.datosFuncionario = calculo.datosFuncionario;
      nuevaBoleta.diasTrabajados = calculo.diasTrabajados;
      nuevaBoleta.totalGanado = calculo.totalGanado;
      nuevaBoleta.totalDescuentos = calculo.totalDescuentos;
      nuevaBoleta.liquidoPagable = calculo.liquidoPagable;
      nuevaBoleta.tieneAlerta = false;
      nuevaBoleta.emitidaEn = fechaEmision;

      const guardada = await this.boletaRepo.save(nuevaBoleta, em);
      nuevaBoletaId = guardada.id;

      // 4. Guardar detalles
      const detalles = calculo.detalles.map((d) => {
        const detalle = new BoletaDetalle();
        detalle.boletaId = guardada.id;
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

      // 5. Generar PDF y hash SHA-256 para la nueva boleta rectificada (CA-06)
      const html = generarHtmlBoleta(guardada, periodo, detalles);
      const pdfBuffer = await this.pdfClient.generarPdf(html);
      const hashSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

      guardada.hashSha256 = hashSha256;
      await this.boletaRepo.save(guardada, em);

      // 6. Guardar binario PDF
      const boletaPdf = new BoletaPdf();
      boletaPdf.boletaId = guardada.id;
      boletaPdf.contenido = pdfBuffer;
      boletaPdf.tamanoBytes = pdfBuffer.length;
      await this.boletaPdfRepo.save(boletaPdf, em);
    });

    const boletaFinal = await this.boletaRepo.findById(nuevaBoletaId);
    if (!boletaFinal) throw AppError.internal('Error al recuperar la boleta rectificada');
    return boletaFinal;
  }
}
