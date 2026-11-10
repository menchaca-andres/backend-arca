import { AppDataSource } from '../data-source';
import { PlantillaVersion } from '../entities/plantilla-version.entity';

export class PlantillaVersionRepository {
  private repo = AppDataSource.getRepository(PlantillaVersion);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findActiveByPlantillaId(plantillaId: string) {
    return this.repo.findOne({
      where: { plantillaId, activa: true },
    });
  }

  findAllByPlantillaId(plantillaId: string) {
    return this.repo.find({
      where: { plantillaId },
      order: { version: 'DESC' },
    });
  }

  async getLatestVersionNumber(plantillaId: string): Promise<number> {
    const latest = await this.repo.findOne({
      where: { plantillaId },
      order: { version: 'DESC' },
    });
    return latest ? latest.version : 0;
  }

  save(entity: PlantillaVersion) {
    return this.repo.save(entity);
  }
}
