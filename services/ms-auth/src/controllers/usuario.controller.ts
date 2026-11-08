import type { NextFunction, Request, Response } from 'express';
import { getIdentity, type RolUsuario } from '@arca/shared';
import { UsuarioService } from '../services/usuario.service';
import type {
  CrearUsuarioInput,
  CambiarRolInput,
  CambiarEstadoInput,
  InternalEstadoUsuarioInput,
} from '../schemas/usuario.schema';

export class UsuarioController {
  constructor(private readonly service: UsuarioService = new UsuarioService()) {}

  crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as CrearUsuarioInput;
      const result = await this.service.crear(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rol = req.query.rol as RolUsuario | undefined;
      const activoStr = req.query.activo as string | undefined;
      const activo = activoStr !== undefined ? activoStr === 'true' : undefined;

      const usuarios = await this.service.listar({ rol, activo });
      res.json(usuarios);
    } catch (error) {
      next(error);
    }
  };

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const usuario = await this.service.obtenerPorId(id);
      res.json(usuario);
    } catch (error) {
      next(error);
    }
  };

  cambiarRol = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const input = req.body as CambiarRolInput;
      const usuario = await this.service.cambiarRol(id, input);
      res.json(usuario);
    } catch (error) {
      next(error);
    }
  };

  cambiarEstado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const input = req.body as CambiarEstadoInput;
      const { userId } = getIdentity(req);
      const usuario = await this.service.cambiarEstado(id, input, userId);
      res.json(usuario);
    } catch (error) {
      next(error);
    }
  };

  cambiarEstadoInterno = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const input = req.body as InternalEstadoUsuarioInput;
      const resultado = await this.service.cambiarEstadoInterno(id, input);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };
}

