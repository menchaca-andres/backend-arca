import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { BoletaPdf } from '../entities/boleta-pdf.entity';

export class BoletaPdfRepository {
  private get repo() {
    return AppDataSource.getRepository ? AppDataSource.getRepository(BoletaPdf) : ({} as any);
  }

  findById(boletaId: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(BoletaPdf) : this.repo;
    return repository.findOneBy({ boletaId });
  }

  findByIdConContenido(boletaId: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(BoletaPdf) : this.repo;
    return repository
      .createQueryBuilder('bp')
      .addSelect('bp.contenido')
      .where('bp.boletaId = :boletaId', { boletaId })
      .getOne();
  }

  findAll(manager?: EntityManager) {
    const repository = manager ? manager.getRepository(BoletaPdf) : this.repo;
    return repository.find();
  }

  save(entity: BoletaPdf, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(BoletaPdf) : this.repo;
    return repository.save(entity);
  }
}
