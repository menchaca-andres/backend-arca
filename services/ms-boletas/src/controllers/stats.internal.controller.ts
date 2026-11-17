import type { Request, Response, NextFunction } from 'express';
import { PeriodoService } from '../services/periodo.service';

export class StatsInternalController {
  constructor(private readonly service: PeriodoService = new PeriodoService()) {}

  obtenerEstadisticas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.service.obtenerEstadisticas();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };
}
