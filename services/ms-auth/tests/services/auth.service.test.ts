import jwt from 'jsonwebtoken';
import { RolUsuario } from '@arca/shared';
import { AuthService } from '../../src/services/auth.service';
import { UsuarioRepository } from '../../src/repositories/usuario.repository';
import { usarBase } from '../helpers/db';
import { PASSWORD_PRUEBA, crearUsuario } from '../helpers/usuarios';

describe('AuthService', () => {
  usarBase();
  const service = new AuthService();
  const repo = new UsuarioRepository();

  it('devuelve un JWT de 8 h y no expone el hash', async () => {
    const usuario = await crearUsuario({ rol: RolUsuario.RRHH });

    const respuesta = await service.login({ email: usuario.email, password: PASSWORD_PRUEBA });

    expect(respuesta.usuario).toMatchObject({
      id: usuario.id,
      email: usuario.email,
      rol: RolUsuario.RRHH,
      funcionarioId: null,
    });
    expect(respuesta.usuario).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(respuesta)).not.toContain('passwordHash');

    const payload = jwt.verify(respuesta.token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    expect(payload.sub).toBe(usuario.id);
    expect(payload.rol).toBe(RolUsuario.RRHH);
    expect(payload.exp! - payload.iat!).toBe(8 * 60 * 60);
  });

  it('rechaza credenciales inválidas con el mismo mensaje exista o no el correo', async () => {
    const usuario = await crearUsuario();

    const errorExistente = (await service
      .login({ email: usuario.email, password: 'incorrecta' })
      .catch((error: Error) => error)) as Error;
    const errorInexistente = (await service
      .login({ email: 'no-existe@arca.test', password: 'incorrecta' })
      .catch((error: Error) => error)) as Error;

    expect(errorExistente).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(errorInexistente).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(errorExistente.message).toBe(errorInexistente.message);
  });

  it('incrementa los intentos y bloquea la cuenta al quinto fallo', async () => {
    const usuario = await crearUsuario();

    for (let intento = 1; intento <= 4; intento += 1) {
      await expect(service.login({ email: usuario.email, password: 'incorrecta' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });
    }

    await expect(service.login({ email: usuario.email, password: 'incorrecta' })).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
      status: 423,
    });

    const guardado = await repo.findById(usuario.id);
    expect(guardado?.intentosFallidos).toBe(5);
    expect(guardado?.bloqueadoHasta).toBeInstanceOf(Date);

    // Aun con la contraseña correcta, mientras esté bloqueado no entra.
    await expect(service.login({ email: usuario.email, password: PASSWORD_PRUEBA })).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
      status: 423,
    });
  });

  it('rechaza a un usuario desactivado', async () => {
    const usuario = await crearUsuario({ activo: false });

    await expect(service.login({ email: usuario.email, password: PASSWORD_PRUEBA })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('permite entrar cuando el bloqueo ya venció', async () => {
    const usuario = await crearUsuario();
    const guardado = await repo.findByEmailWithPassword(usuario.email);

    guardado!.intentosFallidos = 5;
    guardado!.bloqueadoHasta = new Date(Date.now() - 60_000);
    await repo.save(guardado!);

    const respuesta = await service.login({ email: usuario.email, password: PASSWORD_PRUEBA });
    expect(respuesta.token).toBeDefined();

    const actualizado = await repo.findById(usuario.id);
    expect(actualizado?.intentosFallidos).toBe(0);
    expect(actualizado?.bloqueadoHasta).toBeNull();
    expect(actualizado?.ultimoAcceso).toBeInstanceOf(Date);
  });
});
