import { AppDataSource } from '../data-source';
import { Correlativo } from '../entities/correlativo.entity';

export class CorrelativoRepository {
  private repo = AppDataSource.getRepository(Correlativo);

  findById(tipo: string, anio: number) {
    return this.repo.findOneBy({ tipo, anio });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Correlativo) {
    return this.repo.save(entity);
  }
}
