import { IsNull } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Funcionario } from '../entities/funcionario.entity';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';

export class FuncionarioRepository {
  private repo = AppDataSource.getRepository(Funcionario);
  private asignacionRepo = AppDataSource.getRepository(AsignacionLaboral);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findByCi(ci: string) {
    return this.repo.findOneBy({ ci: ci.trim() });
  }

  findAll() {
    return this.repo.find();
  }

  async findWithAsignacionVigente(
    id: string,
  ): Promise<{ funcionario: Funcionario; asignacionVigente: AsignacionLaboral | null } | null> {
    const funcionario = await this.repo.findOneBy({ id });
    if (!funcionario) {
      return null;
    }

    const asignacionVigente = await this.asignacionRepo.findOne({
      where: {
        funcionarioId: id,
        vigenteHasta: IsNull(),
      },
      relations: {
        cargo: {
          area: true,
        },
      },
    });

    return {
      funcionario,
      asignacionVigente,
    };
  }

  save(entity: Funcionario) {
    return this.repo.save(entity);
  }
}
