import { Router } from 'express';
import { StatsInternalController } from '../controllers/stats.internal.controller';

export const statsInternalRouter = Router();
const controller = new StatsInternalController();

// HU-25 CA-05: GET /internal/stats
statsInternalRouter.get('/stats', controller.obtenerEstadisticas);
