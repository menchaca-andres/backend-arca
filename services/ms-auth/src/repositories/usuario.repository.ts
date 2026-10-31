import { AppDataSource } from '../data-source';
import { Usuario } from '../entities/usuario.entity';

export class UsuarioRepository {
  private repo = AppDataSource.getRepository(Usuario);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll() {
    return this.repo.find();
  }

  save(entity: Usuario) {
    return this.repo.save(entity);
  }

  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.email = :email', { email })
      .getOne();
  }
}
