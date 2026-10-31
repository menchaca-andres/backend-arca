import { randomUUID } from 'node:crypto';
import { EstadoSolicitud } from '@arca/shared';
import { SolicitudVacacion } from '../../src/entities/solicitud-vacacion.entity';
import { SolicitudVacacionRepository } from '../../src/repositories/solicitud-vacacion.repository';
import { limpiar, usarBase } from '../helpers/db';

const nueva = (datos: Partial<SolicitudVacacion> = {}) =>
  Object.assign(new SolicitudVacacion(), {
    funcionarioId: randomUUID(),
    funcionarioNombre: 'Prueba Repositorio',
    fechaInicio: '2026-12-01',
    fechaFin: '2026-12-05',
    diasHabiles: 5,
    registradoPor: randomUUID(),
    ...datos,
  });

describe('SolicitudVacacionRepository', () => {
  usarBase();
  const repo = new SolicitudVacacionRepository();

  it('guarda y lee por id', async () => {
    const solicitud = await repo.save(nueva());
    limpiar(SolicitudVacacion, { id: solicitud.id });

    const leida = await repo.findById(solicitud.id);
    expect(leida?.estado).toBe(EstadoSolicitud.PENDIENTE);
    expect(leida?.fechaInicio).toBe('2026-12-01');
  });

  it.each([
    ['ck_solicitud_fechas', { fechaFin: '2026-11-30' }],
    ['ck_solicitud_dias_habiles', { diasHabiles: 0 }],
    ['ck_solicitud_motivo_rechazo', { estado: EstadoSolicitud.RECHAZADA }],
    ['ck_solicitud_resolucion', { estado: EstadoSolicitud.APROBADA }],
  ])('rechaza datos que violan %s', async (constraint, datos) => {
    await expect(repo.save(nueva(datos))).rejects.toMatchObject({ driverError: { constraint } });
  });
});
