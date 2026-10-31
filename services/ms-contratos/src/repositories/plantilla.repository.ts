import { AppDataSource } from '../data-source';
import { Plantilla } from '../entities/plantilla.entity';

export class PlantillaRepository {
  private repo = AppDataSource.getRepository(Plantilla);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Plantilla) {
    return this.repo.save(entity);
  }
}
