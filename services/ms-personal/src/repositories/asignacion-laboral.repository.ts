import { IsNull } from 'typeorm';
import { AppDataSource } from '../data-source';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';

export class AsignacionLaboralRepository {
  private repo = AppDataSource.getRepository(AsignacionLaboral);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  async hasVigenteByCargoId(cargoId: string) {
    const total = await this.repo.count({ where: { cargoId, vigenteHasta: IsNull() } });
    return total > 0;
  }

  async hasVigenteByAreaId(areaId: string) {
    const total = await this.repo
      .createQueryBuilder('asignacion')
      .innerJoin('asignacion.cargo', 'cargo')
      .where('cargo.areaId = :areaId', { areaId })
      .andWhere('asignacion.vigenteHasta IS NULL')
      .getCount();
    return total > 0;
  }

  save(entity: AsignacionLaboral) {
    return this.repo.save(entity);
  }
}
