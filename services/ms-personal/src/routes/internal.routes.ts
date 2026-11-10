import { Router, type Request, type Response, type NextFunction } from 'express';
import { AppError, type FuncionarioContrato } from '@arca/shared';
import { FuncionarioRepository } from '../repositories/funcionario.repository';

export const internalRouter = Router();
const funcionarioRepo = new FuncionarioRepository();

/**
 * CA-05 (HU-01 / HU-09): GET /internal/funcionarios/:id
 * Endpoint interno para que ms-auth, ms-vacaciones, ms-boletas y ms-contratos
 * consulten los datos y asignación vigente del funcionario según contrato acordado.
 */
internalRouter.get(
  '/funcionarios/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = await funcionarioRepo.findWithAsignacionVigente(id);
      if (!data) {
        throw AppError.notFound('Funcionario no encontrado');
      }

      const { funcionario, asignacionVigente } = data;
      const contrato: FuncionarioContrato = {
        id: funcionario.id,
        usuarioId: null,
        nombres: funcionario.nombres,
        apellidos: funcionario.apellidos,
        documentoIdentidad: `${funcionario.ci} ${funcionario.ciExpedido}`,
        fechaIngreso: funcionario.fechaIngreso,
        diasPrueba: funcionario.diasPrueba,
        fechaRatificacion: funcionario.fechaRatificacion,
        fechaBaja: funcionario.fechaBaja,
        area: asignacionVigente?.cargo?.area?.nombre ?? '',
        cargo: asignacionVigente?.cargo?.nombre ?? '',
        remuneracion: {
          monto: asignacionVigente?.remuneracion ?? 0,
          moneda: 'BOB',
        },
        estado: funcionario.estado,
      };

      res.json(contrato);
    } catch (error) {
      next(error);
    }
  },
);

