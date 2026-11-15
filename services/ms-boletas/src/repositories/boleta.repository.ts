import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Boleta } from '../entities/boleta.entity';

export class BoletaRepository {
  private getRepo(em?: EntityManager) {
    return em ? em.getRepository(Boleta) : AppDataSource.getRepository(Boleta);
  }

  findById(id: string, em?: EntityManager): Promise<Boleta | null> {
    return this.getRepo(em).findOne({
      where: { id },
      relations: { detalles: { concepto: true } },
    });
  }

  findAll(em?: EntityManager): Promise<Boleta[]> {
    return this.getRepo(em).find();
  }

  findByPeriodoId(periodoId: string, em?: EntityManager): Promise<Boleta[]> {
    return this.getRepo(em).find({
      where: { periodoId },
      order: { createdAt: 'ASC' },
    });
  }

  findByPeriodoIdWithDetalles(periodoId: string, em?: EntityManager): Promise<Boleta[]> {
    return this.getRepo(em).find({
      where: { periodoId },
      relations: { detalles: { concepto: true } },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteByPeriodoId(periodoId: string, em?: EntityManager): Promise<void> {
    const repo = this.getRepo(em);
    const boletas = await repo.find({ where: { periodoId } });
    if (boletas.length > 0) {
      await repo.remove(boletas);
    }
  }

  save(entity: Boleta, em?: EntityManager): Promise<Boleta> {
    return this.getRepo(em).save(entity);
  }

  saveMany(entities: Boleta[], em?: EntityManager): Promise<Boleta[]> {
    return this.getRepo(em).save(entities);
  }
}
