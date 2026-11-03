import { AppError } from '@arca/shared';
import { Cargo } from '../entities/cargo.entity';
import { AreaRepository } from '../repositories/area.repository';
import { AsignacionLaboralRepository } from '../repositories/asignacion-laboral.repository';
import { CargoRepository, type CargoListOptions } from '../repositories/cargo.repository';
import type { CreateCargoInput, UpdateCargoInput } from '../schemas/cargo.schema';

export class CargoService {
  private readonly repo = new CargoRepository();
  private readonly areas = new AreaRepository();
  private readonly asignaciones = new AsignacionLaboralRepository();

  list(options: CargoListOptions) {
    return this.repo.findAll(options);
  }

  async create(input: CreateCargoInput) {
    const nombre = input.nombre.trim();
    this.validarBanda(input.salarioMin, input.salarioMax);

    const area = await this.areas.findById(input.areaId);
    if (!area) throw AppError.notFound('Área no encontrada');
    if (!area.activo) throw AppError.conflict('El área no está activa');

    await this.validarNombre(input.areaId, nombre);

    return this.repo.save(Object.assign(new Cargo(), { ...input, nombre }));
  }

  async update(id: string, input: UpdateCargoInput) {
    const cargo = await this.repo.findById(id);
    if (!cargo) throw AppError.notFound('Cargo no encontrado');

    const nombre = (input.nombre ?? cargo.nombre).trim();
    const salarioMin = input.salarioMin ?? Number(cargo.salarioMin);
    const salarioMax = input.salarioMax ?? Number(cargo.salarioMax);
    this.validarBanda(salarioMin, salarioMax);

    if (input.nombre !== undefined && nombre.toLowerCase() !== cargo.nombre.toLowerCase()) {
      const existente = await this.repo.findByAreaAndNombre(cargo.areaId, nombre);
      if (existente) throw AppError.conflict('Ya existe un cargo con ese nombre en el área');
    }

    if (input.activo === false && cargo.activo && (await this.asignaciones.hasVigenteByCargoId(id))) {
      throw AppError.conflict('No se puede desactivar un cargo con funcionarios con asignación vigente');
    }

    if (input.activo === true && !cargo.activo) {
      const area = await this.areas.findById(cargo.areaId);
      if (!area?.activo) throw AppError.conflict('No se puede activar un cargo de un área inactiva');
    }

    Object.assign(cargo, {
      nombre,
      salarioMin,
      salarioMax,
      ...(input.activo === undefined ? {} : { activo: input.activo }),
    });
    return this.repo.save(cargo);
  }

  private validarBanda(salarioMin: number, salarioMax: number) {
    if (!Number.isFinite(salarioMin) || !Number.isFinite(salarioMax) || salarioMin <= 0) {
      throw AppError.badRequest('Los salarios deben ser mayores a cero');
    }
    if (salarioMin > salarioMax) {
      throw AppError.badRequest('El salario mínimo no puede superar al máximo');
    }
  }

  private async validarNombre(areaId: string, nombre: string) {
    if (await this.repo.findByAreaAndNombre(areaId, nombre)) {
      throw AppError.conflict('Ya existe un cargo con ese nombre en el área');
    }
  }
}
