import type { EntityManager } from 'typeorm';
import { EstadoContrato } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Contrato } from '../entities/contrato.entity';

export interface FiltrosContrato {
  funcionarioId?: string;
  plantillaId?: string;
  estado?: EstadoContrato;
  desde?: string;
  hasta?: string;
}

export class ContratoRepository {
  private get repo() {
    return AppDataSource.getRepository(Contrato);
  }

  findById(id: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Contrato) : this.repo;
    return repository.findOne({
      where: { id },
      relations: ['plantillaVersion', 'plantillaVersion.plantilla'],
    });
  }

  findByNumero(numero: string) {
    return this.repo.findOne({
      where: { numero },
      relations: ['plantillaVersion', 'plantillaVersion.plantilla'],
    });
  }

  findByFuncionario(funcionarioId: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Contrato) : this.repo;
    return repository.find({
      where: { funcionarioId },
      order: { version: 'DESC' },
      relations: ['plantillaVersion', 'plantillaVersion.plantilla'],
    });
  }

  findVigenteByFuncionario(funcionarioId: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Contrato) : this.repo;
    return repository.findOne({
      where: { funcionarioId, estado: EstadoContrato.VIGENTE },
      relations: ['plantillaVersion', 'plantillaVersion.plantilla'],
    });
  }

  findAll() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      relations: ['plantillaVersion', 'plantillaVersion.plantilla'],
    });
  }

  async findConFiltros(filtros: FiltrosContrato = {}, manager?: EntityManager): Promise<Contrato[]> {
    const repository = manager ? manager.getRepository(Contrato) : this.repo;

    if (typeof repository.createQueryBuilder === 'function') {
      try {
        const qb = repository
          .createQueryBuilder('contrato')
          .leftJoinAndSelect('contrato.plantillaVersion', 'plantillaVersion')
          .leftJoinAndSelect('plantillaVersion.plantilla', 'plantilla')
          .orderBy('contrato.createdAt', 'DESC');

        if (filtros.funcionarioId) {
          qb.andWhere('contrato.funcionarioId = :funcionarioId', { funcionarioId: filtros.funcionarioId });
        }
        if (filtros.plantillaId) {
          qb.andWhere('plantillaVersion.plantillaId = :plantillaId', { plantillaId: filtros.plantillaId });
        }
        if (filtros.estado) {
          qb.andWhere('contrato.estado = :estado', { estado: filtros.estado });
        }
        if (filtros.desde) {
          qb.andWhere('contrato.createdAt >= :desde', { desde: new Date(filtros.desde) });
        }
        if (filtros.hasta) {
          const hastaFecha = new Date(filtros.hasta);
          hastaFecha.setHours(23, 59, 59, 999);
          qb.andWhere('contrato.createdAt <= :hasta', { hasta: hastaFecha });
        }

        return await qb.getMany();
      } catch {
        // Fallback a filtrado en memoria para entornos de tests/mocks
      }
    }

    let contratos = await this.findAll();
    if (filtros.funcionarioId) {
      contratos = contratos.filter((c) => c.funcionarioId === filtros.funcionarioId);
    }
    if (filtros.plantillaId) {
      contratos = contratos.filter((c) => c.plantillaVersion?.plantillaId === filtros.plantillaId);
    }
    if (filtros.estado) {
      contratos = contratos.filter((c) => c.estado === filtros.estado);
    }
    if (filtros.desde) {
      const d = new Date(filtros.desde);
      contratos = contratos.filter((c) => new Date(c.createdAt) >= d);
    }
    if (filtros.hasta) {
      const h = new Date(filtros.hasta);
      h.setHours(23, 59, 59, 999);
      contratos = contratos.filter((c) => new Date(c.createdAt) <= h);
    }
    return contratos;
  }

  save(entity: Contrato, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Contrato) : this.repo;
    return repository.save(entity);
  }
}
