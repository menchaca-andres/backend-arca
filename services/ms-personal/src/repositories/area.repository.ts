import { AppDataSource } from '../data-source';
import { Area } from '../entities/area.entity';

export class AreaRepository {
  private repo = AppDataSource.getRepository(Area);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll(includeInactive = false) {
    return this.repo.find({
      where: includeInactive ? {} : { activo: true },
      order: { codigo: 'ASC' },
    });
  }

  findByCodigo(codigo: string) {
    return this.repo
      .createQueryBuilder('area')
      .where('LOWER(area.codigo) = LOWER(:codigo)', { codigo })
      .getOne();
  }

  findByNombre(nombre: string) {
    return this.repo
      .createQueryBuilder('area')
      .where('LOWER(area.nombre) = LOWER(:nombre)', { nombre })
      .getOne();
  }

  save(entity: Area) {
    return this.repo.save(entity);
  }
}
