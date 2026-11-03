import bcrypt from 'bcryptjs';
import { RolUsuario } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Usuario } from '../entities/usuario.entity';
import { UsuarioRepository } from '../repositories/usuario.repository';

/**
 * ID fijo de Daniela Mendoza en la semilla de ms-personal (CI 9000003).
 * Al ser un dato de demo, permite que el usuario FUNCIONARIO quede vinculado
 * a un funcionario real sin cruzar schemas.
 */
const FUNCIONARIO_DEMO_ID = '11111111-1111-4111-8111-111111111103';

const USUARIOS = [
  {
    email: 'admin@arca.bo',
    password: 'Admin123!',
    rol: RolUsuario.ADMIN,
    funcionarioId: null,
  },
  {
    email: 'rrhh@arca.bo',
    password: 'Rrhh123!',
    rol: RolUsuario.RRHH,
    funcionarioId: null,
  },
  {
    email: 'direccion@arca.bo',
    password: 'Direccion123!',
    rol: RolUsuario.DIRECCION,
    funcionarioId: null,
  },
  {
    email: 'funcionario@arca.bo',
    password: 'Funcionario123!',
    rol: RolUsuario.FUNCIONARIO,
    funcionarioId: FUNCIONARIO_DEMO_ID,
  },
];

async function seed() {
  const repo = new UsuarioRepository();

  for (const datos of USUARIOS) {
    const existente = await repo.findByEmail(datos.email);
    const usuario = existente ?? Object.assign(new Usuario(), { email: datos.email });

    usuario.passwordHash = await bcrypt.hash(datos.password, 10);
    usuario.rol = datos.rol;
    usuario.funcionarioId = datos.funcionarioId;
    usuario.activo = true;
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;

    await repo.save(usuario);
  }
}

AppDataSource.initialize()
  .then(seed)
  .then(() => AppDataSource.destroy())
  .then(() => console.log('[ms-auth] Semilla de usuarios aplicada'))
  .catch((error) => {
    console.error('[ms-auth] La semilla de usuarios falló:', error);
    process.exit(1);
  });
