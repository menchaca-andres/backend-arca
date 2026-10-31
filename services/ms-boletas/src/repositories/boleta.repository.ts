import { AppDataSource } from '../data-source';
import { Boleta } from '../entities/boleta.entity';

export class BoletaRepository {
  private repo = AppDataSource.getRepository(Boleta);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Boleta) {
    return this.repo.save(entity);
  }
}
