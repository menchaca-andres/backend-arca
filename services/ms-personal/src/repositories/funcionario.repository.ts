import { AppDataSource } from '../data-source';
import { Funcionario } from '../entities/funcionario.entity';

export class FuncionarioRepository {
  private repo = AppDataSource.getRepository(Funcionario);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Funcionario) {
    return this.repo.save(entity);
  }
}
