import { AppError } from '@arca/shared';
import { Area } from '../entities/area.entity';
import { AreaRepository } from '../repositories/area.repository';
import { AsignacionLaboralRepository } from '../repositories/asignacion-laboral.repository';
import type { CreateAreaInput, UpdateAreaInput } from '../schemas/area.schema';

export class AreaService {
  private readonly repo = new AreaRepository();
  private readonly asignaciones = new AsignacionLaboralRepository();

  list(includeInactive: boolean) {
    return this.repo.findAll(includeInactive);
  }

  async create(input: CreateAreaInput) {
    const codigo = input.codigo.trim().toUpperCase();
    const nombre = input.nombre.trim();
    await this.validarUnicos(codigo, nombre);
    return this.repo.save(Object.assign(new Area(), { codigo, nombre }));
  }

  async update(id: string, input: UpdateAreaInput) {
    const area = await this.repo.findById(id);
    if (!area) throw AppError.notFound('Área no encontrada');

    const codigo = input.codigo?.trim().toUpperCase();
    const nombre = input.nombre?.trim();

    if (codigo !== undefined && codigo !== area.codigo.toUpperCase()) {
      const existente = await this.repo.findByCodigo(codigo);
      if (existente) throw AppError.conflict('Ya existe un área con ese código');
    }

    if (nombre !== undefined && nombre.toLowerCase() !== area.nombre.toLowerCase()) {
      const existente = await this.repo.findByNombre(nombre);
      if (existente) throw AppError.conflict('Ya existe un área con ese nombre');
    }

    if (input.activo === false && area.activo && (await this.asignaciones.hasVigenteByAreaId(id))) {
      throw AppError.conflict('No se puede desactivar un área con funcionarios con asignación vigente');
    }

    Object.assign(area, {
      ...(codigo === undefined ? {} : { codigo }),
      ...(nombre === undefined ? {} : { nombre }),
      ...(input.activo === undefined ? {} : { activo: input.activo }),
    });
    return this.repo.save(area);
  }

  private async validarUnicos(codigo: string, nombre: string) {
    if (await this.repo.findByCodigo(codigo)) {
      throw AppError.conflict('Ya existe un área con ese código');
    }
    if (await this.repo.findByNombre(nombre)) {
      throw AppError.conflict('Ya existe un área con ese nombre');
    }
  }
}
