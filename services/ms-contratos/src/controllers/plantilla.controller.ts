import type { NextFunction, Request, Response } from 'express';
import { AppError, getIdentity } from '@arca/shared';
import { PlantillaService } from '../services/plantilla.service';
import type {
  ActualizarPlantillaInput,
  CrearPlantillaInput,
  PreviewPlantillaInput,
} from '../schemas/plantilla.schema';

export class PlantillaController {
  constructor(private readonly service: PlantillaService = new PlantillaService()) {}

  listar = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listar();
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.obtenerPorId(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  obtenerHistorialVersiones = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.obtenerHistorialVersiones(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getIdentity(req);
      if (!userId) {
        throw AppError.unauthorized('Falta la identidad del usuario');
      }

      const input = req.body as CrearPlantillaInput;
      const result = await this.service.crear(input, userId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  actualizar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getIdentity(req);
      if (!userId) {
        throw AppError.unauthorized('Falta la identidad del usuario');
      }

      const { id } = req.params;
      const input = req.body as ActualizarPlantillaInput;
      const result = await this.service.actualizar(id, input, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  preview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as PreviewPlantillaInput;
      const result = this.service.preview(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

