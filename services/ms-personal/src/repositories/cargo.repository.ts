import { AppDataSource } from '../data-source';
import { Cargo } from '../entities/cargo.entity';

export interface CargoListOptions {
  includeInactive?: boolean;
  areaId?: string;
}

export class CargoRepository {
  private get repo() {
    return AppDataSource.getRepository(Cargo);
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id }, relations: { area: true } });
  }

  findAll(options: CargoListOptions = {}) {
    const query = this.repo
      .createQueryBuilder('cargo')
      .innerJoinAndSelect('cargo.area', 'area')
      .orderBy('area.codigo', 'ASC')
      .addOrderBy('cargo.nombre', 'ASC');

    if (!options.includeInactive) {
      query.andWhere('cargo.activo = true').andWhere('area.activo = true');
    }
    if (options.areaId) {
      query.andWhere('cargo.areaId = :areaId', { areaId: options.areaId });
    }

    return query.getMany();
  }

  findByAreaAndNombre(areaId: string, nombre: string) {
    return this.repo
      .createQueryBuilder('cargo')
      .where('cargo.areaId = :areaId', { areaId })
      .andWhere('LOWER(cargo.nombre) = LOWER(:nombre)', { nombre })
      .getOne();
  }

  save(entity: Cargo) {
    return this.repo.save(entity);
  }
}
