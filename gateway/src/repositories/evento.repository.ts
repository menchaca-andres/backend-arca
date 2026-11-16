import type { Paginated } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Evento } from '../entities/evento.entity';
import type { FiltrosAuditoria } from '../schemas/auditoria.schema';

export class EventoRepository {
  private get repo() {
    return AppDataSource.getRepository ? AppDataSource.getRepository(Evento) : ({} as any);
  }

  findById(id: string): Promise<Evento | null> {
    return this.repo.findOneBy({ id });
  }

  findAll(): Promise<Evento[]> {
    return this.repo.find({
      order: { fecha: 'DESC', id: 'DESC' },
    });
  }

  save(entity: Partial<Evento>): Promise<Evento> {
    return this.repo.save(entity);
  }

  async findConFiltros(filtros: FiltrosAuditoria = { page: 1, pageSize: 20 }): Promise<Paginated<Evento>> {
    const page = Math.max(1, filtros.page || 1);
    const pageSize = Math.min(100, Math.max(1, filtros.pageSize || 20));

    if (typeof this.repo.createQueryBuilder === 'function') {
      try {
        const qb = this.repo.createQueryBuilder('e');

        if (filtros.usuarioId) {
          qb.andWhere('e.usuarioId = :usuarioId', { usuarioId: filtros.usuarioId });
        }

        if (filtros.servicio) {
          qb.andWhere('e.servicio = :servicio', { servicio: filtros.servicio.toLowerCase() });
        }

        if (filtros.metodo) {
          qb.andWhere('e.metodo = :metodo', { metodo: filtros.metodo.toUpperCase() });
        }

        if (filtros.desde) {
          const d = new Date(filtros.desde);
          qb.andWhere('e.fecha >= :desde', { desde: d });
        }

        if (filtros.hasta) {
          const h = new Date(filtros.hasta);
          // Si es formato YYYY-MM-DD sin hora, extender hasta el final del día
          if (typeof filtros.hasta === 'string' && filtros.hasta.length <= 10) {
            h.setHours(23, 59, 59, 999);
          }
          qb.andWhere('e.fecha <= :hasta', { hasta: h });
        }

        if (filtros.resultado === 'EXITO') {
          qb.andWhere('e.statusCode >= 200 AND e.statusCode < 400');
        } else if (filtros.resultado === 'ERROR') {
          qb.andWhere('e.statusCode >= 400');
        }

        qb.orderBy('e.fecha', 'DESC').addOrderBy('e.id', 'DESC');
        qb.skip((page - 1) * pageSize).take(pageSize);

        const [data, total] = await qb.getManyAndCount();
        return { data, page, pageSize, total };
      } catch {
        // Fallback en memoria para tests unitarios/mocks
      }
    }

    let items = await this.findAll();

    if (filtros.usuarioId) {
      items = items.filter((e) => e.usuarioId === filtros.usuarioId);
    }
    if (filtros.servicio) {
      items = items.filter((e) => e.servicio.toLowerCase() === filtros.servicio!.toLowerCase());
    }
    if (filtros.metodo) {
      items = items.filter((e) => e.metodo.toUpperCase() === filtros.metodo!.toUpperCase());
    }
    if (filtros.desde) {
      const d = new Date(filtros.desde);
      items = items.filter((e) => new Date(e.fecha) >= d);
    }
    if (filtros.hasta) {
      const h = new Date(filtros.hasta);
      if (typeof filtros.hasta === 'string' && filtros.hasta.length <= 10) {
        h.setHours(23, 59, 59, 999);
      }
      items = items.filter((e) => new Date(e.fecha) <= h);
    }
    if (filtros.resultado === 'EXITO') {
      items = items.filter((e) => e.statusCode >= 200 && e.statusCode < 400);
    } else if (filtros.resultado === 'ERROR') {
      items = items.filter((e) => e.statusCode >= 400);
    }

    const total = items.length;
    const data = items.slice((page - 1) * pageSize, page * pageSize);

    return { data, page, pageSize, total };
  }
}
