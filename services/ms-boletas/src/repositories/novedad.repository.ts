import { AppDataSource } from '../data-source';
import { Novedad } from '../entities/novedad.entity';

export class NovedadRepository {
  private repo = AppDataSource.getRepository(Novedad);

  findById(id: string): Promise<Novedad | null> {
    return this.repo.findOne({
      where: { id },
      relations: { concepto: true },
    });
  }

  findAll(): Promise<Novedad[]> {
    return this.repo.find({
      relations: { concepto: true },
      order: { anio: 'DESC', mes: 'DESC', createdAt: 'DESC' },
    });
  }

  findByPeriodo(anio: number, mes: number, funcionarioId?: string): Promise<Novedad[]> {
    const where: { anio: number; mes: number; funcionarioId?: string } = { anio, mes };
    if (funcionarioId) {
      where.funcionarioId = funcionarioId;
    }
    return this.repo.find({
      where,
      relations: { concepto: true },
      order: { createdAt: 'ASC' },
    });
  }

  findByPeriodoFuncionarioAndConcepto(
    anio: number,
    mes: number,
    funcionarioId: string,
    conceptoId: string,
  ): Promise<Novedad | null> {
    return this.repo.findOne({
      where: { anio, mes, funcionarioId, conceptoId },
      relations: { concepto: true },
    });
  }

  save(entity: Novedad): Promise<Novedad> {
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
