import { AppDataSource } from '../data-source';
import { Area } from '../entities/area.entity';

export class AreaRepository {
  private repo = AppDataSource.getRepository(Area);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Area) {
    return this.repo.save(entity);
  }
}
