import { AppDataSource } from '../data-source';
import { Feriado } from '../entities/feriado.entity';

export class FeriadoRepository {
  private repo = AppDataSource.getRepository(Feriado);

  findById(fecha: string) {
    return this.repo.findOneBy({ fecha });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Feriado) {
    return this.repo.save(entity);
  }
}
