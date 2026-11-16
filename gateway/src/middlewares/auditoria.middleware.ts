import { randomUUID } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';
import { createLogger, HEADERS } from '@arca/shared';
import { AuditoriaService } from '../services/auditoria.service';

const logger = createLogger('auditoria');

const METODOS_MUTACION = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CA-01: Determina si una petición debe auditarse:
 * - Toda petición POST, PUT, PATCH y DELETE
 * - Descargas de PDF de contratos y boletas (GET)
 */
export function esOperacionAuditable(metodo: string, ruta: string): boolean {
  const m = metodo.toUpperCase();
  if (METODOS_MUTACION.has(m)) {
    return true;
  }

  if (m === 'GET') {
    const cleanPath = ruta.split('?')[0].toLowerCase();
    // Descargas de contratos y boletas en PDF
    if (cleanPath.endsWith('/pdf')) {
      return cleanPath.includes('/contratos') || cleanPath.includes('/boletas');
    }
  }

  return false;
}

/**
 * Infiere el microservicio de destino a partir de la ruta.
 */
export function inferirServicio(ruta: string): string {
  const clean = ruta.toLowerCase();
  if (clean.includes('/auth') || clean.includes('/usuarios')) return 'auth';
  if (clean.includes('/personal') || clean.includes('/funcionarios') || clean.includes('/areas') || clean.includes('/cargos')) return 'personal';
  if (clean.includes('/vacaciones')) return 'vacaciones';
  if (clean.includes('/contratos') || clean.includes('/plantillas')) return 'contratos';
  if (clean.includes('/boletas') || clean.includes('/periodos') || clean.includes('/conceptos') || clean.includes('/novedades')) return 'boletas';
  if (clean.includes('/auditoria')) return 'gateway';
  return 'gateway';
}

const COLECCIONES = new Set([
  'auth',
  'usuarios',
  'personal',
  'funcionarios',
  'areas',
  'cargos',
  'vacaciones',
  'solicitudes',
  'contratos',
  'plantillas',
  'boletas',
  'periodos',
  'conceptos',
  'novedades',
  'auditoria',
  'health',
  'api',
  'v1',
]);

const ACCIONES = new Set([
  'pdf',
  'login',
  'calculo',
  'emision',
  'rectificacion',
  'saldo',
  'historial',
  'selector',
  'estado',
  'rol',
  'dias-habiles',
  'pendientes',
]);

/**
 * Extrae el ID del recurso de la URL si existe.
 */
export function extraerRecursoId(ruta: string): string | null {
  const segments = ruta.split('?')[0].split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const ultimo = segments[segments.length - 1].toLowerCase();

  // Si el último es una sub-acción (ej: /api/contratos/:id/pdf o /api/periodos/:id/calculo)
  if (ACCIONES.has(ultimo) && segments.length >= 2) {
    const candidato = segments[segments.length - 2];
    const candLower = candidato.toLowerCase();
    if (!COLECCIONES.has(candLower) && !ACCIONES.has(candLower)) {
      return candidato;
    }
    return null;
  }

  // Si el último no es una colección ni una acción, es el identificador del recurso
  if (!COLECCIONES.has(ultimo) && !ACCIONES.has(ultimo)) {
    return segments[segments.length - 1];
  }

  return null;
}

/**
 * CA-01, CA-02, CA-03, CA-05:
 * Middleware asíncrono para registro de eventos de auditoría tras la respuesta.
 */
export function auditoriaMiddleware(
  service: AuditoriaService = new AuditoriaService(),
): RequestHandler {
  return (req: Request, res: Response, next) => {
    res.once('finish', () => {
      const metodo = req.method;
      const ruta = req.originalUrl || req.url;

      if (!esOperacionAuditable(metodo, ruta)) {
        return;
      }

      // T1_HU24: Ejecución asíncrona no bloqueante
      setImmediate(async () => {
        try {
          const usuarioId = (req.headers[HEADERS.userId] as string) || (req.headers['x-user-id'] as string) || null;
          const rol =
            (req.headers[HEADERS.userRole] as string) ||
            (req.headers['x-user-rol'] as string) ||
            (req.headers['x-user-role'] as string) ||
            null;
          const servicio = inferirServicio(ruta);
          const recursoId = extraerRecursoId(ruta);
          const statusCode = res.statusCode;
          const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
            req.ip ||
            req.socket.remoteAddress ||
            null;
          const requestId =
            (res.locals.requestId as string) ||
            (req.headers['x-request-id'] as string) ||
            randomUUID();

          // CA-02: Registro completo sin datos sensibles
          await service.registrar({
            usuarioId,
            rol,
            metodo,
            ruta: ruta.split('?')[0],
            servicio,
            recursoId,
            statusCode,
            ip,
            requestId,
          });
        } catch (error) {
          // CA-05: Si falla el registro, la operación no se cae; queda en el log.
          logger.error('auditoria.fallo_registro', {
            error: error instanceof Error ? error.message : String(error),
            ruta,
            metodo,
          });
        }
      });
    });

    next();
  };
}
