import { AppDataSource } from '../data-source';
import { Usuario } from '../entities/usuario.entity';
import { RolUsuario } from '@arca/shared';
import type { FindOptionsWhere } from 'typeorm';

export interface UsuarioFilters {
  rol?: RolUsuario;
  activo?: boolean;
}

export class UsuarioRepository {
  private repo = AppDataSource.getRepository(Usuario);

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findAll(filters?: UsuarioFilters) {
    const where: FindOptionsWhere<Usuario> = {};
    if (filters?.rol) where.rol = filters.rol;
    if (filters?.activo !== undefined) where.activo = filters.activo;

    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  findByFuncionarioId(funcionarioId: string) {
    return this.repo.findOneBy({ funcionarioId });
  }

  save(entity: Usuario) {
    return this.repo.save(entity);
  }

  findByEmail(email: string) {
    return this.repo.findOneBy({ email: email.trim().toLowerCase() });
  }

  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('LOWER(usuario.email) = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }
}
