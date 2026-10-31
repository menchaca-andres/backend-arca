import { Feriado } from '../../src/entities/feriado.entity';
import { FeriadoRepository } from '../../src/repositories/feriado.repository';
import { anioUnico, limpiar, usarBase } from '../helpers/db';

describe('FeriadoRepository', () => {
  usarBase();
  const repo = new FeriadoRepository();

  it('guarda y lee por fecha', async () => {
    const fecha = `${anioUnico()}-08-06`;
    await repo.save(Object.assign(new Feriado(), { fecha, descripcion: 'Prueba' }));
    limpiar(Feriado, { fecha });

    expect(await repo.findById(fecha)).toEqual({ fecha, descripcion: 'Prueba' });
  });

  it('rechaza un feriado sin descripcion', async () => {
    const fecha = `${anioUnico()}-08-07`;
    await expect(repo.save(Object.assign(new Feriado(), { fecha }))).rejects.toMatchObject({
      driverError: { code: '23502' },
    });
  });
});
