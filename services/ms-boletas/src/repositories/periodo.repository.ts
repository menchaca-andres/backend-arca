import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Periodo } from '../entities/periodo.entity';

export class PeriodoRepository {
  private getRepo(em?: EntityManager) {
    return em ? em.getRepository(Periodo) : AppDataSource.getRepository(Periodo);
  }

  findById(id: string, em?: EntityManager): Promise<Periodo | null> {
    return this.getRepo(em).findOneBy({ id });
  }

  findByAnioMes(anio: number, mes: number, em?: EntityManager): Promise<Periodo | null> {
    return this.getRepo(em).findOneBy({ anio, mes });
  }

  findAll(em?: EntityManager): Promise<Periodo[]> {
    return this.getRepo(em).find({
      order: { anio: 'DESC', mes: 'DESC' },
    });
  }

  save(entity: Periodo, em?: EntityManager): Promise<Periodo> {
    return this.getRepo(em).save(entity);
  }
}
