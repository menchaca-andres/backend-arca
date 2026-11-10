import { AppError } from '@arca/shared';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Plantilla } from '../entities/plantilla.entity';
import { PlantillaVersion } from '../entities/plantilla-version.entity';
import { PlantillaRepository } from '../repositories/plantilla.repository';
import { PlantillaVersionRepository } from '../repositories/plantilla-version.repository';
import { validarVariablesPlantilla } from '../domain/template-variables';
import { renderTemplate } from '../domain/template-renderer';
import type {
  ActualizarPlantillaInput,
  CrearPlantillaInput,
  PreviewPlantillaInput,
} from '../schemas/plantilla.schema';

export interface PlantillaResponse {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  versionActiva: {
    id: string;
    version: number;
    contenido: string;
    variables: string[];
    activa: boolean;
    creadoPor: string;
    createdAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PlantillaService {
  constructor(
    private readonly plantillaRepo: PlantillaRepository = new PlantillaRepository(),
    private readonly versionRepo: PlantillaVersionRepository = new PlantillaVersionRepository(),
    private readonly runTransaction: <T>(fn: (em: EntityManager) => Promise<T>) => Promise<T> = (fn) =>
      AppDataSource.transaction(fn),
  ) {}

  async crear(input: CrearPlantillaInput, userId: string): Promise<PlantillaResponse> {
    const codigo = input.codigo.trim().toUpperCase();

    // Validar unicidad del código
    const existente = await this.plantillaRepo.findByCodigo(codigo);
    if (existente) {
      throw AppError.conflict(`Ya existe una plantilla con el código ${codigo}`);
    }

    // CA-04: Validar que no haya variables desconocidas y que estén las 3 obligatorias
    const validacion = validarVariablesPlantilla(input.contenido);
    if (!validacion.valid) {
      throw AppError.badRequest(validacion.errores.join(' '));
    }

    return this.runTransaction(async (manager) => {
      // 1. Guardar plantilla cabecera
      const plantilla = manager.create(Plantilla, {
        codigo,
        nombre: input.nombre.trim(),
        tipo: input.tipo,
        activo: true,
      });
      const plantillaGuardada = await manager.save(Plantilla, plantilla);

      // 2. Guardar primera versión activa (v1)
      const version1 = manager.create(PlantillaVersion, {
        plantillaId: plantillaGuardada.id,
        version: 1,
        contenido: input.contenido.trim(),
        variables: validacion.variables,
        activa: true,
        creadoPor: userId,
      });
      const versionGuardada = await manager.save(PlantillaVersion, version1);

      return {
        id: plantillaGuardada.id,
        codigo: plantillaGuardada.codigo,
        nombre: plantillaGuardada.nombre,
        tipo: plantillaGuardada.tipo,
        activo: plantillaGuardada.activo,
        versionActiva: {
          id: versionGuardada.id,
          version: versionGuardada.version,
          contenido: versionGuardada.contenido,
          variables: versionGuardada.variables,
          activa: versionGuardada.activa,
          creadoPor: versionGuardada.creadoPor,
          createdAt: versionGuardada.createdAt,
        },
        createdAt: plantillaGuardada.createdAt,
        updatedAt: plantillaGuardada.updatedAt,
      };
    });
  }

  async actualizar(
    id: string,
    input: ActualizarPlantillaInput,
    userId: string,
  ): Promise<PlantillaResponse> {
    const plantilla = await this.plantillaRepo.findById(id);
    if (!plantilla) {
      throw AppError.notFound('Plantilla no encontrada');
    }

    // CA-04: Validar variables de la nueva versión
    const validacion = validarVariablesPlantilla(input.contenido);
    if (!validacion.valid) {
      throw AppError.badRequest(validacion.errores.join(' '));
    }

    // CA-05 y CA-06: Crear nueva versión e inactivar la anterior en una sola transacción
    return this.runTransaction(async (manager) => {
      // Actualizar cabecera si cambiaron nombre o tipo
      if (input.nombre || input.tipo) {
        if (input.nombre) plantilla.nombre = input.nombre.trim();
        if (input.tipo) plantilla.tipo = input.tipo;
        await manager.save(Plantilla, plantilla);
      }

      // Inactivar la versión activa actual
      const versionActual = await manager.findOne(PlantillaVersion, {
        where: { plantillaId: id, activa: true },
      });

      if (versionActual) {
        versionActual.activa = false;
        await manager.save(PlantillaVersion, versionActual);
      }

      // Obtener el número de versión más alto
      const latestVersion = await this.versionRepo.getLatestVersionNumber(id);
      const siguienteVersion = latestVersion + 1;

      // Crear nueva versión activa
      const nuevaVersion = manager.create(PlantillaVersion, {
        plantillaId: id,
        version: siguienteVersion,
        contenido: input.contenido.trim(),
        variables: validacion.variables,
        activa: true,
        creadoPor: userId,
      });
      const versionGuardada = await manager.save(PlantillaVersion, nuevaVersion);

      return {
        id: plantilla.id,
        codigo: plantilla.codigo,
        nombre: plantilla.nombre,
        tipo: plantilla.tipo,
        activo: plantilla.activo,
        versionActiva: {
          id: versionGuardada.id,
          version: versionGuardada.version,
          contenido: versionGuardada.contenido,
          variables: versionGuardada.variables,
          activa: versionGuardada.activa,
          creadoPor: versionGuardada.creadoPor,
          createdAt: versionGuardada.createdAt,
        },
        createdAt: plantilla.createdAt,
        updatedAt: plantilla.updatedAt,
      };
    });
  }

  async obtenerPorId(id: string): Promise<PlantillaResponse> {
    const plantilla = await this.plantillaRepo.findById(id);
    if (!plantilla) {
      throw AppError.notFound('Plantilla no encontrada');
    }

    const versionActiva = await this.versionRepo.findActiveByPlantillaId(id);

    return {
      id: plantilla.id,
      codigo: plantilla.codigo,
      nombre: plantilla.nombre,
      tipo: plantilla.tipo,
      activo: plantilla.activo,
      versionActiva: versionActiva
        ? {
            id: versionActiva.id,
            version: versionActiva.version,
            contenido: versionActiva.contenido,
            variables: versionActiva.variables,
            activa: versionActiva.activa,
            creadoPor: versionActiva.creadoPor,
            createdAt: versionActiva.createdAt,
          }
        : null,
      createdAt: plantilla.createdAt,
      updatedAt: plantilla.updatedAt,
    };
  }

  async listar(): Promise<PlantillaResponse[]> {
    const plantillas = await this.plantillaRepo.findAll();
    const resultados: PlantillaResponse[] = [];

    for (const p of plantillas) {
      const versionActiva = await this.versionRepo.findActiveByPlantillaId(p.id);
      resultados.push({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: p.tipo,
        activo: p.activo,
        versionActiva: versionActiva
          ? {
              id: versionActiva.id,
              version: versionActiva.version,
              contenido: versionActiva.contenido,
              variables: versionActiva.variables,
              activa: versionActiva.activa,
              creadoPor: versionActiva.creadoPor,
              createdAt: versionActiva.createdAt,
            }
          : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      });
    }

    return resultados;
  }

  async obtenerHistorialVersiones(plantillaId: string): Promise<PlantillaVersion[]> {
    const plantilla = await this.plantillaRepo.findById(plantillaId);
    if (!plantilla) {
      throw AppError.notFound('Plantilla no encontrada');
    }
    return this.versionRepo.findAllByPlantillaId(plantillaId);
  }

  preview(input: PreviewPlantillaInput): { contenidoRenderizado: string; variables: string[] } {
    const validacion = validarVariablesPlantilla(input.contenido);
    if (!validacion.valid) {
      throw AppError.badRequest(validacion.errores.join(' '));
    }

    try {
      const renderizado = renderTemplate(input.contenido, input.datos);
      return {
        contenidoRenderizado: renderizado,
        variables: validacion.variables,
      };
    } catch (err) {
      throw AppError.badRequest(
        `Error de compilación Handlebars: ${err instanceof Error ? err.message : 'Sintaxis inválida'}`,
      );
    }
  }
}

