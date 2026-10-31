import { AppDataSource } from '../data-source';
import { BoletaDetalle } from '../entities/boleta-detalle.entity';

export class BoletaDetalleRepository {
  private repo = AppDataSource.getRepository(BoletaDetalle);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: BoletaDetalle) {
    return this.repo.save(entity);
  }
}
