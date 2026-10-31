import { AppDataSource } from '../data-source';
import { Evento } from '../entities/evento.entity';

export class EventoRepository {
  private repo = AppDataSource.getRepository(Evento);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Evento) {
    return this.repo.save(entity);
  }
}
