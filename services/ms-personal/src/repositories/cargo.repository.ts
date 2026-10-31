import { AppDataSource } from '../data-source';
import { Cargo } from '../entities/cargo.entity';

export class CargoRepository {
  private repo = AppDataSource.getRepository(Cargo);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Cargo) {
    return this.repo.save(entity);
  }
}
