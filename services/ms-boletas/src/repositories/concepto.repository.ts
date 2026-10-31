import { AppDataSource } from '../data-source';
import { Concepto } from '../entities/concepto.entity';

export class ConceptoRepository {
  private repo = AppDataSource.getRepository(Concepto);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Concepto) {
    return this.repo.save(entity);
  }
}
