import { AppDataSource } from '../data-source';
import { Concepto } from '../entities/concepto.entity';

export class ConceptoRepository {
  private repo = AppDataSource.getRepository(Concepto);

  findById(id: string): Promise<Concepto | null> {
    return this.repo.findOneBy({ id });
  }

  findByCodigo(codigo: string): Promise<Concepto | null> {
    return this.repo.findOneBy({ codigo });
  }

  findAll(options?: { activo?: boolean }): Promise<Concepto[]> {
    const where = options?.activo !== undefined ? { activo: options.activo } : {};
    return this.repo.find({
      where,
      order: {
        orden: 'ASC',
        codigo: 'ASC',
      },
    });
  }

  save(entity: Concepto): Promise<Concepto> {
    return this.repo.save(entity);
  }

  async remove(entity: Concepto): Promise<void> {
    await this.repo.remove(entity);
  }
}
