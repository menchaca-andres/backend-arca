import type { NextFunction, Request, Response } from 'express';
import { getIdentity } from '@arca/shared';
import { BoletaService } from '../services/boleta.service';
import type { ListarBoletasQuery, RectificarBoletaInput } from '../schemas/boleta.schema';

export class BoletaController {
  constructor(private readonly service: BoletaService = new BoletaService()) {}

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identity = getIdentity(req);
      const query = (res.locals.query ?? req.query) as unknown as ListarBoletasQuery;
      const resultado = await this.service.listar(
        {
          periodoId: query?.periodoId,
          funcionarioId: query?.funcionarioId,
          estado: query?.estado,
        },
        identity,
      );
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const identity = getIdentity(req);
      const boleta = await this.service.obtenerPorId(id, identity);
      res.json(boleta);
    } catch (error) {
      next(error);
    }
  };

  descargarPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const identity = getIdentity(req);
      const { buffer, boleta } = await this.service.obtenerPdf(id, identity);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Boleta-${boleta.numero || boleta.id}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      if (boleta.hashSha256) {
        res.setHeader('X-Boleta-SHA256', boleta.hashSha256);
      }
      res.send(buffer);
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
