import type { NextFunction, Request, Response } from 'express';
import { AppError, getIdentity } from '@arca/shared';
import { FuncionarioService } from '../services/funcionario.service';
import type {
  RegistrarFuncionarioInput,
  RatificarFuncionarioInput,
  DarDeBajaInput,
} from '../schemas/funcionario.schema';

export class FuncionarioController {
  private serviceInstance?: FuncionarioService;

  constructor(service?: FuncionarioService) {
    this.serviceInstance = service;
  }

  private get service() {
    this.serviceInstance ??= new FuncionarioService();
    return this.serviceInstance;
  }

  registrar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getIdentity(req);
      if (!userId) {
        throw AppError.unauthorized('Falta la identidad del usuario');
      }

      const input = req.body as RegistrarFuncionarioInput;
      const result = await this.service.registrar(input, userId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  obtenerFicha = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.obtenerFicha(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const estado = req.query.estado as string | undefined;
      const result = await this.service.listarResumen(estado);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // HU-11: Ratificar funcionario
  ratificar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { userId } = getIdentity(req);
      const input = req.body as RatificarFuncionarioInput;
      const result = await this.service.ratificar(id, input, userId ?? undefined);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // HU-11: CA-04 Aviso con funcionarios cuyo periodo de prueba termina en los próximos 7 días
  obtenerPruebaPorVencer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dias = req.query.dias ? Number(req.query.dias) : 7;
      const fechaRef = req.query.fecha as string | undefined;
      const result = await this.service.obtenerPruebaPorVencer(dias, fechaRef);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // HU-12: Dar de baja a un funcionario
  darDeBaja = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { userId } = getIdentity(req);
      const input = req.body as DarDeBajaInput;
      const result = await this.service.darDeBaja(id, input, userId ?? undefined);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
