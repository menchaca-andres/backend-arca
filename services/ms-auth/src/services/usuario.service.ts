import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppError, EstadoFuncionario, RolUsuario } from '@arca/shared';
import { Usuario } from '../entities/usuario.entity';
import { UsuarioRepository, type UsuarioFilters } from '../repositories/usuario.repository';
import { PersonalClient, type IPersonalClient } from '../clients/personal.client';
import type {
  CrearUsuarioInput,
  CambiarRolInput,
  CambiarEstadoInput,
  InternalEstadoUsuarioInput,
} from '../schemas/usuario.schema';

export interface UsuarioResponse {
  id: string;
  email: string;
  rol: RolUsuario;
  funcionarioId: string | null;
  activo: boolean;
  ultimoAcceso: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrearUsuarioResult {
  usuario: UsuarioResponse;
  passwordTemporal: string;
}

export class UsuarioService {
  constructor(
    private readonly repo: UsuarioRepository = new UsuarioRepository(),
    private readonly personalClient: IPersonalClient = new PersonalClient(),
  ) {}

  private mapResponse(u: Usuario): UsuarioResponse {
    return {
      id: u.id,
      email: u.email,
      rol: u.rol,
      funcionarioId: u.funcionarioId,
      activo: u.activo,
      ultimoAcceso: u.ultimoAcceso,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  private generarPasswordTemporal(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    const bytes = crypto.randomBytes(12);
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars[bytes[i] % chars.length];
    }
    return pass;
  }

  async crear(input: CrearUsuarioInput): Promise<CrearUsuarioResult> {
    const email = input.email.trim().toLowerCase();

    // CA-04: El correo es único
    const existente = await this.repo.findByEmail(email);
    if (existente) {
      throw AppError.conflict('Ya existe un usuario con este correo electrónico');
    }

    let funcionarioId: string | null = null;

    if (input.rol === RolUsuario.FUNCIONARIO) {
      if (!input.funcionarioId) {
        throw AppError.badRequest('El funcionario vinculado es obligatorio para el rol FUNCIONARIO');
      }

      // CA-04: Un funcionario no puede tener más de una cuenta
      const cuentaExistente = await this.repo.findByFuncionarioId(input.funcionarioId);
      if (cuentaExistente) {
        throw AppError.conflict('El funcionario ya tiene una cuenta de usuario vinculada');
      }

      // CA-03: El funcionario vinculado debe existir y no estar de baja
      const funcionario = await this.personalClient.getFuncionario(input.funcionarioId);
      if (!funcionario) {
        throw AppError.notFound('El funcionario vinculado no existe');
      }

      if (funcionario.estado === EstadoFuncionario.BAJA) {
        throw AppError.badRequest('No se puede crear un usuario para un funcionario dado de baja');
      }

      funcionarioId = funcionario.id;
    }

    // CA-05: Se genera una contraseña temporal que se muestra una sola vez
    const passwordTemporal = this.generarPasswordTemporal();
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    const nuevo = new Usuario();
    nuevo.email = email;
    nuevo.passwordHash = passwordHash;
    nuevo.rol = input.rol;
    nuevo.funcionarioId = funcionarioId;
    nuevo.activo = true;
    nuevo.intentosFallidos = 0;
    nuevo.bloqueadoHasta = null;

    const guardado = await this.repo.save(nuevo);

    return {
      usuario: this.mapResponse(guardado),
      passwordTemporal,
    };
  }

  async listar(filters?: UsuarioFilters): Promise<UsuarioResponse[]> {
    const usuarios = await this.repo.findAll(filters);
    return usuarios.map((u) => this.mapResponse(u));
  }

  async obtenerPorId(id: string): Promise<UsuarioResponse> {
    const usuario = await this.repo.findById(id);
    if (!usuario) {
      throw AppError.notFound('Usuario no encontrado');
    }
    return this.mapResponse(usuario);
  }

  async cambiarRol(id: string, input: CambiarRolInput): Promise<UsuarioResponse> {
    const usuario = await this.repo.findById(id);
    if (!usuario) {
      throw AppError.notFound('Usuario no encontrado');
    }

    if (input.rol === RolUsuario.FUNCIONARIO) {
      const targetFuncionarioId = input.funcionarioId ?? usuario.funcionarioId;
      if (!targetFuncionarioId) {
        throw AppError.badRequest('El funcionario vinculado es obligatorio para el rol FUNCIONARIO');
      }

      // Si cambia de funcionario o no tenía uno, validar unicidad y existencia
      if (usuario.funcionarioId !== targetFuncionarioId) {
        const cuentaExistente = await this.repo.findByFuncionarioId(targetFuncionarioId);
        if (cuentaExistente && cuentaExistente.id !== usuario.id) {
          throw AppError.conflict('El funcionario ya tiene una cuenta vinculada');
        }

        const funcionario = await this.personalClient.getFuncionario(targetFuncionarioId);
        if (!funcionario) {
          throw AppError.notFound('El funcionario vinculado no existe');
        }

        if (funcionario.estado === EstadoFuncionario.BAJA) {
          throw AppError.badRequest('No se puede vincular un funcionario dado de baja');
        }
      }

      usuario.funcionarioId = targetFuncionarioId;
    } else {
      usuario.funcionarioId = null;
    }

    usuario.rol = input.rol;
    const actualizado = await this.repo.save(usuario);
    return this.mapResponse(actualizado);
  }

  async cambiarEstado(
    id: string,
    input: CambiarEstadoInput,
    solicitanteId: string | null,
  ): Promise<UsuarioResponse> {
    // CA-07: Un ADMIN no puede desactivarse a sí mismo
    if (!input.activo && solicitanteId && solicitanteId === id) {
      throw AppError.badRequest('Un administrador no puede desactivarse a sí mismo');
    }

    const usuario = await this.repo.findById(id);
    if (!usuario) {
      throw AppError.notFound('Usuario no encontrado');
    }

    usuario.activo = input.activo;
    if (input.activo) {
      // Si se reactiva, limpiar bloqueos previos
      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = null;
    }

    const actualizado = await this.repo.save(usuario);
    return this.mapResponse(actualizado);
  }

  // CA-06: Endpoint interno PATCH /internal/usuarios/:id/estado (usado por HU-12 al dar de baja)
  async cambiarEstadoInterno(
    idOrFuncionarioId: string,
    input: InternalEstadoUsuarioInput,
  ): Promise<{ id: string; estado: 'ACTIVO' | 'INACTIVO' }> {
    // Puede venir el ID de usuario o el ID de funcionario
    let usuario = await this.repo.findById(idOrFuncionarioId);
    if (!usuario) {
      usuario = await this.repo.findByFuncionarioId(idOrFuncionarioId);
    }

    if (!usuario) {
      throw AppError.notFound('Usuario no encontrado para el identificador provisto');
    }

    usuario.activo = input.estado === 'ACTIVO';
    if (usuario.activo) {
      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = null;
    }

    await this.repo.save(usuario);

    return {
      id: usuario.id,
      estado: usuario.activo ? 'ACTIVO' : 'INACTIVO',
    };
  }
}

