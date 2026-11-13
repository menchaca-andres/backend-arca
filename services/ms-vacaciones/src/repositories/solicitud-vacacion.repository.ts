import { EstadoSolicitud } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { SolicitudVacacion } from '../entities/solicitud-vacacion.entity';

export class SolicitudVacacionRepository {
  private get repo() {
    return AppDataSource.getRepository(SolicitudVacacion);
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  /** HU-15 CA-01: bandeja de pendientes, de la más antigua a la más nueva. */
  findPendientes() {
    return this.repo.find({
      where: { estado: EstadoSolicitud.PENDIENTE },
      order: { createdAt: 'ASC' },
    });
  }

  findByFuncionario(funcionarioId: string) {
    return this.repo.find({
      where: { funcionarioId },
      order: { createdAt: 'DESC' },
    });
  }

  findOverlapping(funcionarioId: string, fechaInicio: string, fechaFin: string) {
    return this.repo
      .createQueryBuilder('solicitud')
      .where('solicitud.funcionarioId = :funcionarioId', { funcionarioId })
      .andWhere('solicitud.estado IN (:...estados)', { estados: ['PENDIENTE', 'APROBADA'] })
      .andWhere('solicitud.fechaInicio <= :fechaFin AND solicitud.fechaFin >= :fechaInicio', {
        fechaInicio,
        fechaFin,
      })
      .getOne();
  }

  save(entity: SolicitudVacacion) {
    return this.repo.save(entity);
  }
}
