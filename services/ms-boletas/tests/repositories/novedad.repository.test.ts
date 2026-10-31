import { randomUUID } from 'node:crypto';
import { Novedad } from '../../src/entities/novedad.entity';
import { NovedadRepository } from '../../src/repositories/novedad.repository';
import { anioUnico, limpiar, usarBase } from '../helpers/db';
import { crearConcepto } from '../helpers/fixtures';

const nueva = (conceptoId: string, datos: Partial<Novedad> = {}) =>
  Object.assign(new Novedad(), {
    anio: anioUnico(),
    mes: 11,
    funcionarioId: randomUUID(),
    conceptoId,
    monto: 250.75,
    registradoPor: randomUUID(),
    ...datos,
  });

describe('NovedadRepository', () => {
  usarBase();
  const repo = new NovedadRepository();

  it('guarda y lee por id', async () => {
    const concepto = await crearConcepto();
    const novedad = await repo.save(nueva(concepto.id));
    limpiar(Novedad, { id: novedad.id });

    expect((await repo.findById(novedad.id))?.monto).toBe(250.75);
  });

  it('rechaza un monto no positivo', async () => {
    const concepto = await crearConcepto();
    await expect(repo.save(nueva(concepto.id, { monto: 0 }))).rejects.toMatchObject({
      driverError: { constraint: 'ck_novedad_monto' },
    });
  });

  it('rechaza una novedad repetida', async () => {
    const concepto = await crearConcepto();
    const novedad = await repo.save(nueva(concepto.id));
    limpiar(Novedad, { id: novedad.id });

    const { anio, mes, funcionarioId } = novedad;
    await expect(repo.save(nueva(concepto.id, { anio, mes, funcionarioId }))).rejects.toMatchObject({
      driverError: { constraint: 'uq_novedad' },
    });
  });
});
