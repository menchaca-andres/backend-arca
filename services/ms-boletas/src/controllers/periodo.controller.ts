import type { NextFunction, Request, Response } from 'express';
import { PeriodoService } from '../services/periodo.service';
import type { AbrirPeriodoInput } from '../schemas/periodo.schema';

export class PeriodoController {
  constructor(private readonly service: PeriodoService = new PeriodoService()) {}

  abrir = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as AbrirPeriodoInput;
      const periodo = await this.service.abrir(input);
      res.status(201).json(periodo);
    } catch (error) {
      next(error);
    }
  };

  listar = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const periodos = await this.service.listar();
      res.json(periodos);
    } catch (error) {
      next(error);
    }
  };

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const resultado = await this.service.obtenerPorId(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  calcular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const resultado = await this.service.calcular(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  emitir = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const emitidoPor = (req.headers['x-user-id'] as string) ?? '00000000-0000-0000-0000-000000000000';
      const resultado = await this.service.emitir(id, emitidoPor);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };
}
