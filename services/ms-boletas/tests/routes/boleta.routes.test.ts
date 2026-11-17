import request from 'supertest';
import { createApp } from '../../src/app';
import { BoletaService } from '../../src/services/boleta.service';
import { EstadoBoleta, RolUsuario } from '@arca/shared';

describe('HU-22: Rutas de Rectificación de Boletas (POST /boletas/:id/rectificacion)', () => {
  const rrhhHeaders = {
    'x-user-id': 'u-rrhh-1',
    'x-user-rol': RolUsuario.RRHH,
  };

  const funcionarioHeaders = {
    'x-user-id': 'u-func-1',
    'x-user-rol': RolUsuario.FUNCIONARIO,
  };

  describe('POST /boletas/:id/rectificacion (CA-05 y CA-06)', () => {
    it('rechaza 401 si no hay identidad de usuario', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/boletas/b-1/rectificacion')
        .send({ motivo: 'Ajuste salarial retroactivo' });
      expect(res.status).toBe(401);
    });

    it('rechaza 403 si el rol es FUNCIONARIO (solo RRHH o ADMIN pueden rectificar)', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/boletas/b-1/rectificacion')
        .set(funcionarioHeaders)
        .send({ motivo: 'Ajuste salarial retroactivo' });
      expect(res.status).toBe(403);
    });

    it('rechaza 400 si el motivo tiene menos de 5 caracteres', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/boletas/b-1/rectificacion')
        .set(rrhhHeaders)
        .send({ motivo: 'ABC' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('responde 201 y genera la nueva versión rectificada si los datos son válidos', async () => {
      const mockNuevaBoleta = {
        id: 'b-2',
        version: 2,
        boletaOriginalId: 'b-1',
        numero: 'BP-202610-0002',
        estado: EstadoBoleta.EMITIDA,
        motivoRectificacion: 'Ajuste salarial retroactivo acordado',
        liquidoPagable: 7500,
        hashSha256: 'c'.repeat(64),
      };

      jest.spyOn(BoletaService.prototype, 'rectificar').mockResolvedValue(mockNuevaBoleta as any);

      const app = createApp();
      const res = await request(app)
        .post('/boletas/b-1/rectificacion')
        .set(rrhhHeaders)
        .send({ motivo: 'Ajuste salarial retroactivo acordado' });

      expect(res.status).toBe(201);
      expect(res.body.version).toBe(2);
      expect(res.body.boletaOriginalId).toBe('b-1');
      expect(res.body.numero).toBe('BP-202610-0002');
    });
  });
});
