import { AppDataSource } from '../data-source';
import { BoletaPdf } from '../entities/boleta-pdf.entity';

export class BoletaPdfRepository {
  private repo = AppDataSource.getRepository(BoletaPdf);

  findById(boletaId: string) {
    return this.repo.findOneBy({ boletaId });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: BoletaPdf) {
    return this.repo.save(entity);
  }
}
