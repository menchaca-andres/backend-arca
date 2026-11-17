import type { Request, Response, NextFunction } from 'express';
import { AuditoriaService } from '../services/auditoria.service';
import type { FiltrosAuditoria } from '../schemas/auditoria.schema';

export class AuditoriaController {
  constructor(private readonly service: AuditoriaService = new AuditoriaService()) {}

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filtros = (res.locals.query ?? req.query) as FiltrosAuditoria;
      const resultado = await this.service.consultar(filtros);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      const evento = await this.service.obtenerPorId(id);
      res.status(200).json(evento);
    } catch (error) {
      next(error);
    }
  };
}
