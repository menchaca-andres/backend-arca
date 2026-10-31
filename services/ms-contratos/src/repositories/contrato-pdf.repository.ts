import { AppDataSource } from '../data-source';
import { ContratoPdf } from '../entities/contrato-pdf.entity';

export class ContratoPdfRepository {
  private repo = AppDataSource.getRepository(ContratoPdf);

  findById(contratoId: string) {
    return this.repo.findOneBy({ contratoId });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: ContratoPdf) {
    return this.repo.save(entity);
  }
}
