import type { EntityManager } from 'typeorm';
import { EstadoContrato } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Contrato } from '../entities/contrato.entity';

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
      relations: ['plantillaVersion'],
    });
  }

  findVigenteByFuncionario(funcionarioId: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Contrato) : this.repo;
    return repository.findOne({
      where: { funcionarioId, estado: EstadoContrato.VIGENTE },
      relations: ['plantillaVersion'],
    });
  }

  findAll() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      relations: ['plantillaVersion', 'plantillaVersion.plantilla'],
    });
  }

  save(entity: Contrato, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Contrato) : this.repo;
    return repository.save(entity);
  }
}
