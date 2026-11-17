import type { Request, Response, NextFunction } from 'express';
import { FuncionarioService } from '../services/funcionario.service';

export class StatsInternalController {
  constructor(private readonly service: FuncionarioService = new FuncionarioService()) {}

  obtenerEstadisticas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.service.obtenerEstadisticas();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };
}
