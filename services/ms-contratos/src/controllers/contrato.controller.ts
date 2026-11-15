import type { NextFunction, Request, Response } from 'express';
import { AppError, getIdentity } from '@arca/shared';
import { ContratoService } from '../services/contrato.service';
import type { GenerarContratoInput, PreviewContratoInput } from '../schemas/contrato.schema';

export class ContratoController {
  constructor(private readonly service = new ContratoService()) {}

  vistaPrevia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { funcionarioId, plantillaId } = req.body as PreviewContratoInput;
      const resultado = await this.service.vistaPrevia(funcionarioId, plantillaId);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  generar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getIdentity(req);
      if (!userId) throw AppError.unauthorized('Falta la identidad del usuario');

      const { funcionarioId, plantillaId } = req.body as GenerarContratoInput;
      const contrato = await this.service.generar(funcionarioId, plantillaId, userId);
      res.status(201).json(contrato);
    } catch (error) {
      next(error);
    }
  };

  listar = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contratos = await this.service.listar();
      res.json(contratos);
    } catch (error) {
      next(error);
    }
  };

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const contrato = await this.service.obtenerPorId(id);
      res.json(contrato);
    } catch (error) {
      next(error);
    }
  };

  descargarPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { buffer, contrato } = await this.service.obtenerPdf(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Contrato-${contrato.numero}.pdf"`,
      );
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
}
