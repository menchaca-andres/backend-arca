import type { NextFunction, Request, Response } from 'express';
import { AppError, type FuncionarioContrato } from '@arca/shared';
import { z } from 'zod';
import { FuncionarioService } from '../services/funcionario.service';

const uuid = z.uuid();
type ContratoFuncionarioService = Pick<FuncionarioService, 'obtenerContratoInterno'>;

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
}
