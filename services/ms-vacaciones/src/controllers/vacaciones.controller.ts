import type { NextFunction, Request, Response } from 'express';
import { AppError, getIdentity } from '@arca/shared';
import type { ResolutorSolicitud, VacacionesService } from '../services/vacaciones.service';
import type { RechazarSolicitudInput, SolicitudVacacionInput } from '../schemas/vacaciones.schema';

export class VacacionesController {
  constructor(private readonly service: VacacionesService) {}

  obtenerSaldo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idFuncionario } = res.locals.params as { idFuncionario: string };
      res.json(await this.service.obtenerSaldo(idFuncionario));
    } catch (error) {
      next(error);
    }
  };

  contarDias = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { desde, hasta } = res.locals.query as { desde: string; hasta: string };
      res.json({ desde, hasta, diasHabiles: this.service.contarDiasHabiles(desde, hasta) });
    } catch (error) {
      next(error);
    }
  };

  listarFeriados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { anio } = res.locals.params as { anio: number };
      res.json(await this.service.listarFeriados(anio));
    } catch (error) {
      next(error);
    }
  };

  listarSolicitudes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rol, funcionarioId } = getIdentity(req);
      if (!rol) throw AppError.unauthorized('Falta la identidad del usuario');
      const objetivo = rol === 'FUNCIONARIO' ? (funcionarioId ?? undefined) : undefined;
      if (rol === 'FUNCIONARIO' && !objetivo) {
        throw AppError.forbidden('La cuenta no tiene un funcionario asociado');
      }
      res.json(await this.service.listarSolicitudes(objetivo));
    } catch (error) {
      next(error);
    }
  };

  crearSolicitud = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identity = getIdentity(req);
      if (!identity.userId) throw AppError.unauthorized('Falta la identidad del usuario');
      const input = req.body as SolicitudVacacionInput;
      const funcionarioId = identity.rol === 'FUNCIONARIO' ? identity.funcionarioId : input.funcionarioId;
      if (!funcionarioId) {
        throw AppError.badRequest('Debe indicar el funcionario de la solicitud');
      }
      if (identity.rol === 'FUNCIONARIO' && input.funcionarioId && input.funcionarioId !== funcionarioId) {
        throw AppError.forbidden('Un funcionario solo puede solicitar vacaciones para sí mismo');
      }
      const solicitud = await this.service.crearSolicitud(input, funcionarioId, identity.userId);
      res.status(201).json(solicitud);
    } catch (error) {
      next(error);
    }
  };

  listarPendientes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(await this.service.listarPendientes());
    } catch (error) {
      next(error);
    }
  };

  aprobarSolicitud = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = res.locals.params as { id: string };
      res.json(await this.service.aprobarSolicitud(id, this.resolutor(req)));
    } catch (error) {
      next(error);
    }
  };

  rechazarSolicitud = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = res.locals.params as { id: string };
      const { motivo } = req.body as RechazarSolicitudInput;
      res.json(await this.service.rechazarSolicitud(id, motivo, this.resolutor(req)));
    } catch (error) {
      next(error);
    }
  };

  private resolutor(req: Request): ResolutorSolicitud {
    const { userId, funcionarioId } = getIdentity(req);
    if (!userId) throw AppError.unauthorized('Falta la identidad del usuario');
    return { userId, funcionarioId: funcionarioId ?? null };
  }
}
