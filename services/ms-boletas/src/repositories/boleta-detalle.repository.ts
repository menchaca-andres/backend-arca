import { AppDataSource } from '../data-source';
import { BoletaDetalle } from '../entities/boleta-detalle.entity';

export class BoletaDetalleRepository {
  private repo = AppDataSource.getRepository(BoletaDetalle);

  findById(id: string): Promise<BoletaDetalle | null> {
    return this.repo.findOneBy({ id });
  }

  findAll(): Promise<BoletaDetalle[]> {
    return this.repo.find();
  }

  findByBoletaId(boletaId: string): Promise<BoletaDetalle[]> {
    return this.repo.find({
      where: { boletaId },
      order: { orden: 'ASC' },
    });
  }

  async hasBoletasWithConcepto(conceptoId: string): Promise<boolean> {
    const count = await this.repo.countBy({ conceptoId });
    return count > 0;
  }

  save(entity: BoletaDetalle): Promise<BoletaDetalle> {
    return this.repo.save(entity);
  }
}
