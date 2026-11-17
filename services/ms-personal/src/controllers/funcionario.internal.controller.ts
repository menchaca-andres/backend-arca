import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@arca/shared';
import { z } from 'zod';
import { FuncionarioService } from '../services/funcionario.service';
import { listarContratosQuerySchema } from '../schemas/funcionario.schema';

const uuid = z.uuid();
type ContratoFuncionarioService = Pick<FuncionarioService, 'obtenerContratoInterno' | 'listarContratosInterno'>;

export class FuncionarioInternalController {
  constructor(private readonly service: ContratoFuncionarioService = new FuncionarioService()) {}

  obtener = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = uuid.safeParse(req.params.id);
      if (!resultado.success) throw AppError.badRequest('Identificador de funcionario inválido');
      res.json(await this.service.obtenerContratoInterno(resultado.data));
    } catch (error) {
      next(error);
    }
  };

  // HU-09 CA-05: GET /internal/funcionarios?estado=&activosDesde=&activosHasta=
  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = listarContratosQuerySchema.safeParse(req.query);
      if (!resultado.success) throw AppError.badRequest('Parámetros inválidos', resultado.error.issues);
      res.json(await this.service.listarContratosInterno(resultado.data));
    } catch (error) {
      next(error);
    }
  };
}
