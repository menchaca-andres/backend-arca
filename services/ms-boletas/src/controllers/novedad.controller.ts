import type { Request, Response } from 'express';
import { NovedadService } from '../services/novedad.service';

export class NovedadController {
  constructor(private service: NovedadService = new NovedadService()) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    const query = res.locals.query ?? {};
    const novedades = await this.service.listar(query);
    res.json(novedades);
  };

  obtenerPorId = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const novedad = await this.service.obtenerPorId(id);
    res.json(novedad);
  };

  registrar = async (req: Request, res: Response): Promise<void> => {
    const registradoPor = (req.headers['x-user-id'] as string) || '00000000-0000-0000-0000-000000000001';
    const novedad = await this.service.registrar(req.body, registradoPor);
    res.status(201).json(novedad);
  };

  eliminar = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.service.eliminar(id);
    res.status(204).send();
  };
}

