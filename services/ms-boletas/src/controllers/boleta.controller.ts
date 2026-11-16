import type { NextFunction, Request, Response } from 'express';
import { BoletaService } from '../services/boleta.service';
import type { RectificarBoletaInput } from '../schemas/boleta.schema';

export class BoletaController {
  constructor(private readonly service: BoletaService = new BoletaService()) {}

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const boleta = await this.service.obtenerPorId(id);
      res.json(boleta);
    } catch (error) {
      next(error);
    }
  };

  rectificar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const input = req.body as RectificarBoletaInput;
      const boletaRectificada = await this.service.rectificar(id, input);
      res.status(201).json(boletaRectificada);
    } catch (error) {
      next(error);
    }
  };
}
