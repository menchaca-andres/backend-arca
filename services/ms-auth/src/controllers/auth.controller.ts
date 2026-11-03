import type { Request, Response } from 'express';
import { AppError, asyncHandler, getIdentity } from '@arca/shared';
import type { LoginInput } from '../schemas/auth.schema';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private readonly service = new AuthService();

  login = asyncHandler(async (req, res) => {
    const result = await this.service.login(req.body as LoginInput);
    res.json(result);
  });

  me = (req: Request, res: Response): void => {
    const identity = getIdentity(req);

    if (!identity.userId || !identity.rol) {
      throw AppError.unauthorized('No autenticado');
    }

    res.json({
      id: identity.userId,
      rol: identity.rol,
      funcionarioId: identity.funcionarioId,
    });
  };
}
