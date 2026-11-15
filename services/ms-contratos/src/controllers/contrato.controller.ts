import type { NextFunction, Request, Response } from 'express';
import { AppError, getIdentity } from '@arca/shared';
import { ContratoService } from '../services/contrato.service';
import type {
  FiltrosContratoInput,
  GenerarContratoInput,
  PreviewContratoInput,
} from '../schemas/contrato.schema';

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

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identity = getIdentity(req);
      const filtros = (res.locals.query ?? req.query) as unknown as FiltrosContratoInput;
      const contratos = await this.service.listar(filtros, identity);
      res.json(contratos);
    } catch (error) {
      next(error);
    }
  };

  obtenerPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identity = getIdentity(req);
      const id = req.params.id as string;
      const contrato = await this.service.obtenerPorId(id, identity);
      res.json(contrato);
    } catch (error) {
      next(error);
    }
  };

  descargarPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identity = getIdentity(req);
      const id = req.params.id as string;
      const { buffer, contrato } = await this.service.obtenerPdf(id, identity);

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
