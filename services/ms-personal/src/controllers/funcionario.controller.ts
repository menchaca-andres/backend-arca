import type { NextFunction, Request, Response } from 'express';
import { AppError, getIdentity } from '@arca/shared';
import { FuncionarioService } from '../services/funcionario.service';
import type { RegistrarFuncionarioInput } from '../schemas/funcionario.schema';

export class FuncionarioController {
  constructor(private readonly service: FuncionarioService = new FuncionarioService()) {}

  registrar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getIdentity(req);
      if (!userId) {
        throw AppError.unauthorized('Falta la identidad del usuario');
      }

      const input = req.body as RegistrarFuncionarioInput;
      const result = await this.service.registrar(input, userId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  obtenerFicha = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.obtenerFicha(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listar = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listarResumen();
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

