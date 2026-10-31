import { AppDataSource } from '../data-source';
import { SolicitudVacacion } from '../entities/solicitud-vacacion.entity';

export class SolicitudVacacionRepository {
  private repo = AppDataSource.getRepository(SolicitudVacacion);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: SolicitudVacacion) {
    return this.repo.save(entity);
  }
}
