import { AppDataSource } from '../data-source';
import { PlantillaVersion } from '../entities/plantilla-version.entity';

export class PlantillaVersionRepository {
  private repo = AppDataSource.getRepository(PlantillaVersion);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: PlantillaVersion) {
    return this.repo.save(entity);
  }
}
