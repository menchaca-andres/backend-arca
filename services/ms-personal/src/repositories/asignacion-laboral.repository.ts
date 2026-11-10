import { IsNull } from 'typeorm';
import { AppDataSource } from '../data-source';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';

export class AsignacionLaboralRepository {
  private get repo() {
    return AppDataSource.getRepository(AsignacionLaboral);
  }

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

  // HU-10: CA-02 y CA-06 Cierra la vigente y crea la nueva en una transacción. Se cierra primero
  // para que el índice ux_asignacion_vigente nunca vea dos asignaciones abiertas.
  reemplazarVigente(actualId: string, vigenteHasta: string, nueva: AsignacionLaboral) {
    return AppDataSource.transaction(async (manager) => {
      await manager.update(AsignacionLaboral, { id: actualId }, { vigenteHasta });
      return manager.save(AsignacionLaboral, nueva);
    });
  }
}
