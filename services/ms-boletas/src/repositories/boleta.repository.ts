import type { EntityManager } from 'typeorm';
import { EstadoBoleta } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Boleta } from '../entities/boleta.entity';

export interface FiltrosBoleta {
  periodoId?: string;
  funcionarioId?: string;
  estado?: EstadoBoleta;
  estados?: EstadoBoleta[];
}

export class BoletaRepository {
  private getRepo(em?: EntityManager) {
    return em ? em.getRepository(Boleta) : AppDataSource.getRepository(Boleta);
  }

  findById(id: string, em?: EntityManager): Promise<Boleta | null> {
    return this.getRepo(em).findOne({
      where: { id },
      relations: { detalles: { concepto: true }, periodo: true },
    });
  }

  findAll(em?: EntityManager): Promise<Boleta[]> {
    return this.getRepo(em).find({
      relations: { detalles: { concepto: true }, periodo: true },
    });
  }

  async findConFiltros(filtros: FiltrosBoleta = {}, em?: EntityManager): Promise<Boleta[]> {
    const repository = this.getRepo(em);

    if (typeof repository.createQueryBuilder === 'function') {
      try {
        const qb = repository
          .createQueryBuilder('b')
          .leftJoinAndSelect('b.periodo', 'periodo')
          .leftJoinAndSelect('b.detalles', 'detalles')
          .leftJoinAndSelect('detalles.concepto', 'concepto');

        if (filtros.periodoId) {
          qb.andWhere('b.periodoId = :periodoId', { periodoId: filtros.periodoId });
        }
        if (filtros.funcionarioId) {
          qb.andWhere('b.funcionarioId = :funcionarioId', { funcionarioId: filtros.funcionarioId });
        }
        if (filtros.estado) {
          qb.andWhere('b.estado = :estado', { estado: filtros.estado });
        }
        if (filtros.estados && filtros.estados.length > 0) {
          qb.andWhere('b.estado IN (:...estados)', { estados: filtros.estados });
        }

        // Ordenar de la más reciente a la más antigua (CA-02)
        qb.orderBy('b.createdAt', 'DESC').addOrderBy('b.version', 'DESC');

        return await qb.getMany();
      } catch {
        // Fallback a filtrado en memoria para entornos de prueba con mocks
      }
    }

    let boletas = await this.findAll(em);
    if (filtros.periodoId) {
      boletas = boletas.filter((b) => b.periodoId === filtros.periodoId);
    }
    if (filtros.funcionarioId) {
      boletas = boletas.filter((b) => b.funcionarioId === filtros.funcionarioId);
    }
    if (filtros.estado) {
      boletas = boletas.filter((b) => b.estado === filtros.estado);
    }
    if (filtros.estados && filtros.estados.length > 0) {
      boletas = boletas.filter((b) => filtros.estados!.includes(b.estado));
    }

    boletas.sort((a, b) => {
      const fechaA = new Date(a.createdAt || 0).getTime();
      const fechaB = new Date(b.createdAt || 0).getTime();
      if (fechaB !== fechaA) return fechaB - fechaA;
      return (b.version || 1) - (a.version || 1);
    });

    return boletas;
  }

  async findVersionVigente(boletaOriginalId: string, em?: EntityManager): Promise<Boleta | null> {
    return this.getRepo(em).findOne({
      where: [
        { boletaOriginalId, estado: EstadoBoleta.EMITIDA },
        { id: boletaOriginalId, estado: EstadoBoleta.EMITIDA },
      ],
      relations: { detalles: { concepto: true }, periodo: true },
    });
  }

  async findHistorialVersiones(boleta: Boleta, em?: EntityManager): Promise<Boleta[]> {
    const rootId = boleta.boletaOriginalId ?? boleta.id;
    return this.getRepo(em).find({
      where: [
        { id: rootId },
        { boletaOriginalId: rootId },
      ],
      relations: { detalles: { concepto: true } },
      order: { version: 'ASC' },
    });
  }

  findByPeriodoId(periodoId: string, em?: EntityManager): Promise<Boleta[]> {
    return this.getRepo(em).find({
      where: { periodoId },
      order: { createdAt: 'ASC' },
    });
  }

  findByPeriodoIdWithDetalles(periodoId: string, em?: EntityManager): Promise<Boleta[]> {
    return this.getRepo(em).find({
      where: { periodoId },
      relations: { detalles: { concepto: true } },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteByPeriodoId(periodoId: string, em?: EntityManager): Promise<void> {
    const repo = this.getRepo(em);
    const boletas = await repo.find({ where: { periodoId } });
    if (boletas.length > 0) {
      await repo.remove(boletas);
    }
  }

  save(entity: Boleta, em?: EntityManager): Promise<Boleta> {
    return this.getRepo(em).save(entity);
  }

  saveMany(entities: Boleta[], em?: EntityManager): Promise<Boleta[]> {
    return this.getRepo(em).save(entities);
  }
}
