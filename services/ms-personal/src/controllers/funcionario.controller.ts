import type { NextFunction, Request, Response } from 'express';
import { AppError, getIdentity } from '@arca/shared';
import { FuncionarioService } from '../services/funcionario.service';
import { AsignacionService } from '../services/asignacion.service';
import type {
  RegistrarFuncionarioInput,
  RatificarFuncionarioInput,
  DarDeBajaInput,
  ListarPadronQuery,
  CambiarAsignacionInput,
  ActualizarContactoInput,
} from '../schemas/funcionario.schema';

export class FuncionarioController {
  private serviceInstance?: FuncionarioService;
  private asignacionServiceInstance?: AsignacionService;

  constructor(service?: FuncionarioService, asignacionService?: AsignacionService) {
    this.serviceInstance = service;
    this.asignacionServiceInstance = asignacionService;
  }

  private get service() {
    this.serviceInstance ??= new FuncionarioService();
    return this.serviceInstance;
  }

  private get asignacionService() {
    this.asignacionServiceInstance ??= new AsignacionService();
    return this.asignacionServiceInstance;
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
      const { rol, funcionarioId } = getIdentity(req);
      const result = await this.service.obtenerFicha(id, { rol, funcionarioId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listar = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listarPadron(res.locals.query as ListarPadronQuery);
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

  // HU-10: Cambio de área, cargo o remuneración con historial
  cambiarAsignacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getIdentity(req);
      if (!userId) {
        throw AppError.unauthorized('Falta la identidad del usuario');
      }

      const { id } = req.params;
      const result = await this.asignacionService.cambiar(id, req.body as CambiarAsignacionInput, userId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  // HU-10: CA-07 Datos de contacto
  actualizarContacto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.actualizarContacto(id, req.body as ActualizarContactoInput);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
