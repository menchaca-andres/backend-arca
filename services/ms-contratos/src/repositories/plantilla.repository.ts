import { AppDataSource } from '../data-source';
import { Plantilla } from '../entities/plantilla.entity';

export class PlantillaRepository {
  private repo = AppDataSource.getRepository(Plantilla);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findByCodigo(codigo: string) {
    return this.repo.findOneBy({ codigo: codigo.trim().toUpperCase() });
  }

  findAll(options?: { activo?: boolean }) {
    if (options?.activo !== undefined) {
      return this.repo.find({
        where: { activo: options.activo },
        order: { codigo: 'ASC' },
      });
    }
    return this.repo.find({ order: { codigo: 'ASC' } });
  }

  save(entity: Plantilla) {
    return this.repo.save(entity);
  }
}
