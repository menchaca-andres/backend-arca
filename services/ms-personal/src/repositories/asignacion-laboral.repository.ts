import { AppDataSource } from '../data-source';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';

export class AsignacionLaboralRepository {
  private repo = AppDataSource.getRepository(AsignacionLaboral);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: AsignacionLaboral) {
    return this.repo.save(entity);
  }
}
