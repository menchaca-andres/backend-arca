import bcrypt from 'bcryptjs';
import { RolUsuario } from '@arca/shared';
import { Usuario } from '../../src/entities/usuario.entity';
import { UsuarioRepository } from '../../src/repositories/usuario.repository';
import { limpiar, unico } from './db';

export const PASSWORD_PRUEBA = 'Secreta123!';

export const nuevoUsuario = (datos: Partial<Usuario> = {}) =>
  Object.assign(new Usuario(), {
    email: `${unico()}@arca.test`.toLowerCase(),
    passwordHash: bcrypt.hashSync(PASSWORD_PRUEBA, 4),
    rol: RolUsuario.RRHH,
    ...datos,
  });

export async function crearUsuario(datos: Partial<Usuario> = {}) {
  const usuario = await new UsuarioRepository().save(nuevoUsuario(datos));
  limpiar(Usuario, { id: usuario.id });
  return usuario;
}
