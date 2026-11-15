import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { BoletaDetalle } from '../entities/boleta-detalle.entity';

export class BoletaDetalleRepository {
  private getRepo(em?: EntityManager) {
    return em ? em.getRepository(BoletaDetalle) : AppDataSource.getRepository(BoletaDetalle);
  }

  findById(id: string, em?: EntityManager): Promise<BoletaDetalle | null> {
    return this.getRepo(em).findOneBy({ id });
  }

  findAll(em?: EntityManager): Promise<BoletaDetalle[]> {
    return this.getRepo(em).find();
  }

  findByBoletaId(boletaId: string, em?: EntityManager): Promise<BoletaDetalle[]> {
    return this.getRepo(em).find({
      where: { boletaId },
      order: { orden: 'ASC' },
    });
  }

  async hasBoletasWithConcepto(conceptoId: string, em?: EntityManager): Promise<boolean> {
    const count = await this.getRepo(em).countBy({ conceptoId });
    return count > 0;
  }

  save(entity: BoletaDetalle, em?: EntityManager): Promise<BoletaDetalle> {
    return this.getRepo(em).save(entity);
  }

  saveMany(entities: BoletaDetalle[], em?: EntityManager): Promise<BoletaDetalle[]> {
    return this.getRepo(em).save(entities);
  }
}
