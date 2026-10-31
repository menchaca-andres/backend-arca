import { AppDataSource } from '../data-source';
import { Contrato } from '../entities/contrato.entity';

export class ContratoRepository {
  private repo = AppDataSource.getRepository(Contrato);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Contrato) {
    return this.repo.save(entity);
  }
}
