import { EstadoPeriodo } from '@arca/shared';
import { PeriodoRepository } from '../../src/repositories/periodo.repository';
import { usarBase } from '../helpers/db';
import { crearPeriodo, nuevoPeriodo } from '../helpers/fixtures';

describe('PeriodoRepository', () => {
  usarBase();
  const repo = new PeriodoRepository();

  it('guarda y lee por id', async () => {
    const periodo = await crearPeriodo();
    expect(await repo.findById(periodo.id)).toMatchObject({ mes: 11, estado: EstadoPeriodo.BORRADOR });
  });

  it('rechaza un mes invalido', async () => {
    await expect(repo.save(nuevoPeriodo({ mes: 13 }))).rejects.toMatchObject({
      driverError: { constraint: 'ck_periodo_mes' },
    });
  });

  it('rechaza un periodo repetido', async () => {
    const periodo = await crearPeriodo();
    await expect(repo.save(nuevoPeriodo({ anio: periodo.anio, mes: periodo.mes }))).rejects.toMatchObject({
      driverError: { constraint: 'uq_periodo_anio_mes' },
    });
  });
});
