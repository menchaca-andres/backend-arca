import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError, requireEnv } from '@arca/shared';
import type { LoginResponse } from '@arca/shared';
import { UsuarioRepository } from '../repositories/usuario.repository';

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

// Hash de descarte: si el correo no existe igual se compara, para no filtrar
// por tiempo de respuesta si la cuenta existe.
const DUMMY_HASH = bcrypt.hashSync('credencial-invalida-de-relleno', 10);

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  private readonly repo = new UsuarioRepository();
  private readonly jwtSecret = requireEnv('JWT_SECRET').JWT_SECRET;

  async login(input: LoginInput): Promise<LoginResponse> {
    const email = input.email.trim().toLowerCase();
    const usuario = await this.repo.findByEmailWithPassword(email);

    if (!usuario) {
      await bcrypt.compare(input.password, DUMMY_HASH);
      throw AppError.unauthorized('Credenciales inválidas');
    }

    if (!usuario.activo) {
      await bcrypt.compare(input.password, usuario.passwordHash);
      throw AppError.unauthorized('Credenciales inválidas');
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta.getTime() > Date.now()) {
      const minutosRestantes = Math.max(1, Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60_000));
      throw new AppError(
        'ACCOUNT_LOCKED',
        `Cuenta bloqueada temporalmente. Intente nuevamente en ${minutosRestantes} minuto(s).`,
        423,
        { minutosRestantes },
      );
    }

    // Si el bloqueo ya venció, se limpiar antes de evaluar el nuevo intento.
    if (usuario.bloqueadoHasta) {
      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = null;
    }

    const passwordOk = await bcrypt.compare(input.password, usuario.passwordHash);

    if (!passwordOk) {
      usuario.intentosFallidos += 1;

      if (usuario.intentosFallidos >= MAX_INTENTOS) {
        usuario.bloqueadoHasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60_000);
        await this.repo.save(usuario);
        throw new AppError(
          'ACCOUNT_LOCKED',
          `Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos por demasiados intentos fallidos.`,
          423,
          { minutosRestantes: BLOQUEO_MINUTOS },
        );
      }

      await this.repo.save(usuario);
      throw AppError.unauthorized('Credenciales inválidas');
    }

    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    usuario.ultimoAcceso = new Date();
    await this.repo.save(usuario);

    const token = jwt.sign(
      {
        sub: usuario.id,
        rol: usuario.rol,
        id_funcionario: usuario.funcionarioId,
      },
      this.jwtSecret,
      { expiresIn: '8h' },
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        funcionarioId: usuario.funcionarioId,
      },
    };
  }
}
