import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, HEADERS, requireEnv } from '@arca/shared';
import type { JwtPayload as ArcaJwtPayload } from '@arca/shared';

const RUTAS_PUBLICAS = ['/api/auth/login', '/api/v1/auth/login'];

/**
 * Valida el JWT en todas las rutas /api salvo el login (HU-05 CA-06) y deja
 * la identidad en cabeceras que los servicios consumen sin volver a validar
 * el token. Las cabeceras que mande el cliente se eliminan antes en app.ts.
 */
export function jwtAuth(): RequestHandler {
  const { JWT_SECRET } = requireEnv('JWT_SECRET');

  return (req, _res, next) => {
    const path = req.path.replace(/\/+$/, '');

    if (!path.startsWith('/api') || RUTAS_PUBLICAS.includes(path)) {
      next();
      return;
    }

    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      next(AppError.unauthorized('Falta el token de acceso'));
      return;
    }

    try {
      const payload = jwt.verify(header.slice(7).trim(), JWT_SECRET, {
        algorithms: ['HS256'],
      }) as ArcaJwtPayload;

      if (!payload.sub || !payload.rol) {
        next(AppError.unauthorized('Token inválido'));
        return;
      }

      req.headers[HEADERS.userId] = payload.sub;
      req.headers[HEADERS.userRole] = payload.rol;
      req.headers[HEADERS.funcionarioId] = payload.id_funcionario ?? '';
      next();
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        next(AppError.unauthorized('La sesión expiró'));
        return;
      }

      next(AppError.unauthorized('Token inválido'));
    }
  };
}
