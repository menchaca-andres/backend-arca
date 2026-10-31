import { randomUUID } from 'node:crypto';
import { TipoConcepto } from '@arca/shared';
import { AppDataSource } from '../../src/data-source';
import { Boleta } from '../../src/entities/boleta.entity';
import { BoletaDetalle } from '../../src/entities/boleta-detalle.entity';
import { Concepto } from '../../src/entities/concepto.entity';
import { BoletaDetalleRepository } from '../../src/repositories/boleta-detalle.repository';
import { limpiar, usarBase } from '../helpers/db';
import { crearBoleta, crearConcepto } from '../helpers/fixtures';

const nuevo = (boletaId: string, conceptoId: string) =>
  Object.assign(new BoletaDetalle(), {
    boletaId,
    conceptoId,
    conceptoCodigo: 'PRUEBA',
    conceptoNombre: 'Prueba',
    tipo: TipoConcepto.DESCUENTO,
    baseMonto: 5000,
    porcentaje: 12.71,
    monto: 635.5,
    orden: 1,
  });

describe('BoletaDetalleRepository', () => {
  usarBase();
  const repo = new BoletaDetalleRepository();

  it('guarda y lee por id', async () => {
    const [boleta, concepto] = await Promise.all([crearBoleta(), crearConcepto()]);
    const detalle = await repo.save(nuevo(boleta.id, concepto.id));
    limpiar(BoletaDetalle, { id: detalle.id });

    expect(await repo.findById(detalle.id)).toMatchObject({ porcentaje: 12.71, monto: 635.5 });
  });

  it('rechaza un concepto que no existe', async () => {
    const boleta = await crearBoleta();
    await expect(repo.save(nuevo(boleta.id, randomUUID()))).rejects.toMatchObject({ driverError: { code: '23503' } });
  });

  it('no deja borrar un concepto usado y borra el detalle junto con la boleta', async () => {
    const [boleta, concepto] = await Promise.all([crearBoleta(), crearConcepto()]);
    const detalle = await repo.save(nuevo(boleta.id, concepto.id));

    await expect(AppDataSource.getRepository(Concepto).delete({ id: concepto.id })).rejects.toMatchObject({
      driverError: { code: '23503' },
    });

    await AppDataSource.getRepository(Boleta).delete({ id: boleta.id });
    expect(await repo.findById(detalle.id)).toBeNull();
  });
});
