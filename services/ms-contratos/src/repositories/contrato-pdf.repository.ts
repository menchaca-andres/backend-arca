import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { ContratoPdf } from '../entities/contrato-pdf.entity';

export class ContratoPdfRepository {
  private get repo() {
    return AppDataSource.getRepository(ContratoPdf);
  }

  findById(contratoId: string) {
    return this.repo.findOneBy({ contratoId });
  }

  findByIdWithContent(contratoId: string) {
    return this.repo
      .createQueryBuilder('pdf')
      .addSelect('pdf.contenido')
      .where('pdf.contratoId = :contratoId', { contratoId })
      .getOne();
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: ContratoPdf, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(ContratoPdf) : this.repo;
    return repository.save(entity);
  }
}
