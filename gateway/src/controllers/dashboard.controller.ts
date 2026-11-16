import type { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  constructor(private readonly service: DashboardService = new DashboardService()) {}

  obtenerDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.obtenerDashboard();
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}
