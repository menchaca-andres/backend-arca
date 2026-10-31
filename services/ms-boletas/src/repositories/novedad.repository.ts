import { AppDataSource } from '../data-source';
import { Novedad } from '../entities/novedad.entity';

export class NovedadRepository {
  private repo = AppDataSource.getRepository(Novedad);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Novedad) {
    return this.repo.save(entity);
  }
}
