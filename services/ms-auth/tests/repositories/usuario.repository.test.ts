import { randomUUID } from 'node:crypto';
import { RolUsuario } from '@arca/shared';
import { Usuario } from '../../src/entities/usuario.entity';
import { UsuarioRepository } from '../../src/repositories/usuario.repository';
import { limpiar, unico, usarBase } from '../helpers/db';

const nuevo = (datos: Partial<Usuario> = {}) =>
  Object.assign(new Usuario(), {
    email: `${unico()}@arca.test`.toLowerCase(),
    passwordHash: 'hash-de-prueba',
    rol: RolUsuario.RRHH,
    ...datos,
  });

describe('UsuarioRepository', () => {
  usarBase();
  const repo = new UsuarioRepository();

  it('guarda y lee por id sin devolver el password', async () => {
    const usuario = await repo.save(nuevo());
    limpiar(Usuario, { id: usuario.id });

    const leido = await repo.findById(usuario.id);
    expect(leido?.email).toBe(usuario.email);
    expect(leido?.activo).toBe(true);
    expect(leido?.passwordHash).toBeUndefined();
  });

  it('findByEmailWithPassword devuelve el password', async () => {
    const usuario = await repo.save(nuevo());
    limpiar(Usuario, { id: usuario.id });

    const leido = await repo.findByEmailWithPassword(usuario.email);
    expect(leido?.passwordHash).toBe('hash-de-prueba');
  });

  it('rechaza un FUNCIONARIO sin funcionario vinculado', async () => {
    await expect(repo.save(nuevo({ rol: RolUsuario.FUNCIONARIO }))).rejects.toMatchObject({
      driverError: { constraint: 'ck_usuario_funcionario_vinculado' },
    });
  });

  it('rechaza dos cuentas para el mismo funcionario', async () => {
    const funcionarioId = randomUUID();
    const usuario = await repo.save(nuevo({ funcionarioId }));
    limpiar(Usuario, { id: usuario.id });

    await expect(repo.save(nuevo({ funcionarioId }))).rejects.toMatchObject({ driverError: { code: '23505' } });
  });
});
