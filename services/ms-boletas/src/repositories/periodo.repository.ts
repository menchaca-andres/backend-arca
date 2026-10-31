import { AppDataSource } from '../data-source';
import { Periodo } from '../entities/periodo.entity';

export class PeriodoRepository {
  private repo = AppDataSource.getRepository(Periodo);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Periodo) {
    return this.repo.save(entity);
  }
}
