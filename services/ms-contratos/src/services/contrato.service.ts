import crypto from 'node:crypto';
import type { EntityManager } from 'typeorm';
import {
  AppError,
  EstadoContrato,
  EstadoFuncionario,
  RolUsuario,
  TipoContrato,
  type FuncionarioContrato,
  type Identity,
} from '@arca/shared';
import { AppDataSource } from '../data-source';
import { GotenbergClient, type PdfClient } from '../clients/gotenberg.client';
import { HttpPersonalClient, type PersonalClient } from '../clients/personal.client';
import { construirContextoContrato, prepararHtmlImpresion, type ContratoContexto } from '../domain/contrato-contexto';
import { renderTemplate } from '../domain/template-renderer';
import { ContratoPdf } from '../entities/contrato-pdf.entity';
import { Contrato } from '../entities/contrato.entity';
import { PlantillaVersion } from '../entities/plantilla-version.entity';
import { Plantilla } from '../entities/plantilla.entity';
import { ContratoPdfRepository } from '../repositories/contrato-pdf.repository';
import { ContratoRepository, type FiltrosContrato } from '../repositories/contrato.repository';
import { CorrelativoRepository } from '../repositories/correlativo.repository';
import { PlantillaVersionRepository } from '../repositories/plantilla-version.repository';
import { PlantillaRepository } from '../repositories/plantilla.repository';

export interface DetalleContratoResponse extends Contrato {
  historialVersiones: Contrato[];
}

export interface VistaPreviaContrato {
  funcionario: {
    id: string;
    nombreCompleto: string;
    documentoIdentidad: string;
    fechaIngreso: string;
    diasPrueba: number;
    area: string;
    cargo: string;
    remuneracion: number;
    estado: EstadoFuncionario;
  };
  plantilla: {
    id: string;
    codigo: string;
    nombre: string;
    tipo: TipoContrato;
    version: number;
    plantillaVersionId: string;
  };
  datos: ContratoContexto;
  contenidoRenderizado: string;
}

export class ContratoService {
  constructor(
    private readonly contratoRepo = new ContratoRepository(),
    private readonly contratoPdfRepo = new ContratoPdfRepository(),
    private readonly plantillaRepo = new PlantillaRepository(),
    private readonly plantillaVersionRepo = new PlantillaVersionRepository(),
    private readonly correlativoRepo = new CorrelativoRepository(),
    private readonly personalClient: PersonalClient = new HttpPersonalClient(),
    private readonly pdfClient: PdfClient = new GotenbergClient(),
    private readonly transactionRunner?: <T>(fn: (em: EntityManager) => Promise<T>) => Promise<T>,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private async runTransaction<T>(operation: (em: EntityManager) => Promise<T>): Promise<T> {
    if (this.transactionRunner) {
      return this.transactionRunner(operation);
    }
    return AppDataSource.manager.transaction(operation);
  }

  /**
   * CA-01 & CA-02:
   * Genera la vista previa del contrato con datos reales de ms-personal antes de confirmar.
   */
  async vistaPrevia(funcionarioId: string, plantillaId?: string): Promise<VistaPreviaContrato> {
    const funcionario = await this.obtenerFuncionarioValidado(funcionarioId);
    const { plantilla, versionActiva } = await this.obtenerPlantillaActiva(plantillaId);

    const hoy = this.clock();
    const datos = construirContextoContrato(funcionario, hoy);
    const contenidoRenderizado = renderTemplate(versionActiva.contenido, datos as unknown as Record<string, unknown>);

    return {
      funcionario: {
        id: funcionario.id,
        nombreCompleto: `${funcionario.nombres} ${funcionario.apellidos}`.trim(),
        documentoIdentidad: funcionario.documentoIdentidad,
        fechaIngreso: funcionario.fechaIngreso,
        diasPrueba: funcionario.diasPrueba,
        area: funcionario.area,
        cargo: funcionario.cargo,
        remuneracion: funcionario.remuneracion.monto,
        estado: funcionario.estado,
      },
      plantilla: {
        id: plantilla.id,
        codigo: plantilla.codigo,
        nombre: plantilla.nombre,
        tipo: plantilla.tipo,
        version: versionActiva.version,
        plantillaVersionId: versionActiva.id,
      },
      datos,
      contenidoRenderizado,
    };
  }

  /**
   * HU-18: Generar formalmente el contrato con transacción atómica, correlativo CT-AAAA-NNNN,
   * reemplazo del contrato previo si existía, compilación PDF con Gotenberg y hash SHA-256.
   */
  async generar(funcionarioId: string, plantillaId: string | undefined, generadoPor: string): Promise<Contrato> {
    const funcionario = await this.obtenerFuncionarioValidado(funcionarioId);
    const { versionActiva } = await this.obtenerPlantillaActiva(plantillaId);

    const hoy = this.clock();
    const anio = hoy.getFullYear();
    const datos = construirContextoContrato(funcionario, hoy);
    const contenidoRenderizado = renderTemplate(versionActiva.contenido, datos as unknown as Record<string, unknown>);

    return this.runTransaction(async (em) => {
      // CA-07: correlativo atómico por año CT-AAAA-NNNN
      const seq = await this.correlativoRepo.obtenerSiguiente('CONTRATO', anio, em);
      const numero = `CT-${anio}-${String(seq).padStart(4, '0')}`;

      // CA-05: HTML de impresión con encabezado ARCA, espacio para firmas y numeración
      const html = prepararHtmlImpresion(
        contenidoRenderizado,
        numero,
        datos.funcionario.nombre_completo,
        datos.funcionario.ci,
      );

      // CA-05 y CA-09: Generar PDF
      const pdfBuffer = await this.pdfClient.generarPdf(html);

      // CA-04: Hash SHA-256 del PDF
      const hashSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

      // CA-06: Si tenía contrato previo, el nuevo es la versión siguiente y el anterior queda REEMPLAZADO
      const contratosPrevios = await this.contratoRepo.findByFuncionario(funcionarioId, em);
      const contratoVigente = contratosPrevios.find((c) => c.estado === EstadoContrato.VIGENTE);
      if (contratoVigente) {
        contratoVigente.estado = EstadoContrato.REEMPLAZADO;
        await this.contratoRepo.save(contratoVigente, em);
      }

      const maxVersion = contratosPrevios.length > 0 ? Math.max(...contratosPrevios.map((c) => c.version)) : 0;
      const nuevaVersion = maxVersion + 1;

      // CA-04: Guardar contrato inmutable
      const contrato = Object.assign(new Contrato(), {
        numero,
        funcionarioId,
        plantillaVersionId: versionActiva.id,
        version: nuevaVersion,
        estado: EstadoContrato.VIGENTE,
        datos: datos as unknown as Record<string, unknown>,
        contenidoRenderizado,
        hashSha256,
        generadoPor,
      });
      const guardado = await this.contratoRepo.save(contrato, em);

      // Guardar PDF en tabla contrato_pdf
      const contratoPdf = Object.assign(new ContratoPdf(), {
        contratoId: guardado.id,
        contenido: pdfBuffer,
        tamanoBytes: pdfBuffer.length,
      });
      await this.contratoPdfRepo.save(contratoPdf, em);

      return guardado;
    });
  }

  /**
   * HU-19 CA-02 y CA-04:
   * Obtiene un contrato por su ID, verifica permisos de rol (un FUNCIONARIO solo puede ver los suyos)
   * y adjunta el historial de versiones del mismo funcionario.
   */
  async obtenerPorId(id: string, identity?: Identity | null): Promise<DetalleContratoResponse> {
    const contrato = await this.contratoRepo.findById(id);
    if (!contrato) throw AppError.notFound('Contrato no encontrado');

    // CA-02: Un FUNCIONARIO solo ve y descarga sus propios contratos
    if (identity?.rol === RolUsuario.FUNCIONARIO) {
      if (!identity.funcionarioId || contrato.funcionarioId !== identity.funcionarioId) {
        throw AppError.forbidden('No tiene permiso para acceder a este contrato');
      }
    }

    // CA-04: La ficha del contrato muestra su historial de versiones
    const historial = await this.contratoRepo.findByFuncionario(contrato.funcionarioId);
    historial.sort((a, b) => b.version - a.version);
    const historialVersiones = historial.map((h) => ({
      id: h.id,
      numero: h.numero,
      funcionarioId: h.funcionarioId,
      plantillaVersionId: h.plantillaVersionId,
      version: h.version,
      estado: h.estado,
      datos: h.datos,
      contenidoRenderizado: h.contenidoRenderizado,
      hashSha256: h.hashSha256,
      generadoPor: h.generadoPor,
      createdAt: h.createdAt,
    })) as Contrato[];

    return {
      ...contrato,
      historialVersiones,
    };
  }

  /**
   * HU-19 CA-02 y CA-03:
   * La descarga entrega el PDF guardado, sin volver a generarlo, y verifica que su hash SHA-256 coincida.
   */
  async obtenerPdf(id: string, identity?: Identity | null): Promise<{ buffer: Buffer; contrato: Contrato }> {
    const contrato = await this.obtenerPorId(id, identity);
    const pdf = await this.contratoPdfRepo.findByIdWithContent(id);
    if (!pdf || !pdf.contenido) {
      throw AppError.notFound('El archivo PDF del contrato no está disponible');
    }

    // CA-03: Verificación criptográfica de integridad SHA-256
    const hashCalculado = crypto.createHash('sha256').update(pdf.contenido).digest('hex');
    if (hashCalculado !== contrato.hashSha256) {
      throw AppError.internal('Error de integridad: el hash SHA-256 del PDF no coincide con el registro original');
    }

    return { buffer: pdf.contenido, contrato };
  }

  /**
   * HU-19 CA-01 y CA-02:
   * RRHH lista contratos con filtros (funcionario, plantilla, estado, fechas).
   * Un FUNCIONARIO solo ve sus propios contratos.
   */
  async listar(filtros: FiltrosContrato = {}, identity?: Identity | null): Promise<Contrato[]> {
    const filtrosEfectivos: FiltrosContrato = { ...filtros };

    // CA-02: Forzar filtro por funcionario si el rol es FUNCIONARIO
    if (identity?.rol === RolUsuario.FUNCIONARIO) {
      if (!identity.funcionarioId) {
        throw AppError.forbidden('El usuario no tiene un funcionario asociado');
      }
      filtrosEfectivos.funcionarioId = identity.funcionarioId;
    }

    return this.contratoRepo.findConFiltros(filtrosEfectivos);
  }

  async listarPorFuncionario(funcionarioId: string): Promise<Contrato[]> {
    return this.contratoRepo.findByFuncionario(funcionarioId);
  }

  private async obtenerFuncionarioValidado(funcionarioId: string): Promise<FuncionarioContrato> {
    const funcionario = await this.personalClient.getFuncionario(funcionarioId);
    if (!funcionario) throw AppError.notFound('Funcionario no encontrado');

    // CA-03: No se puede generar contrato para un funcionario de baja
    if (funcionario.estado === EstadoFuncionario.BAJA) {
      throw AppError.badRequest('No se puede generar contrato para un funcionario de baja');
    }

    // Debe tener asignación laboral y remuneración válida
    if (!funcionario.cargo || !funcionario.remuneracion || funcionario.remuneracion.monto <= 0) {
      throw AppError.badRequest('El funcionario no cuenta con una asignación laboral o remuneración vigente');
    }

    return funcionario;
  }

  private async obtenerPlantillaActiva(
    plantillaId?: string,
  ): Promise<{ plantilla: Plantilla; versionActiva: PlantillaVersion }> {
    let plantilla: Plantilla | null;

    if (plantillaId) {
      plantilla = await this.plantillaRepo.findById(plantillaId);
      if (!plantilla) throw AppError.notFound('Plantilla de contrato no encontrada');
    } else {
      // Buscar primera plantilla activa, prefiriendo INDEFINIDO
      const plantillas = await this.plantillaRepo.findAll({ activo: true });
      if (plantillas.length === 0) {
        throw AppError.badRequest('No existen plantillas de contrato registradas');
      }
      plantilla = plantillas.find((p) => p.tipo === TipoContrato.INDEFINIDO) ?? plantillas[0];
    }

    const versionActiva = await this.plantillaVersionRepo.findActiveByPlantillaId(plantilla.id);
    if (!versionActiva) {
      throw AppError.badRequest(`La plantilla "${plantilla.nombre}" no tiene una versión activa configurada`);
    }

    return { plantilla, versionActiva };
  }
}
