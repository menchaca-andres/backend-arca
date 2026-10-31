import { Correlativo } from '../../src/entities/correlativo.entity';
import { CorrelativoRepository } from '../../src/repositories/correlativo.repository';
import { anioUnico, limpiar, unico, usarBase } from '../helpers/db';

describe('CorrelativoRepository', () => {
  usarBase();
  const repo = new CorrelativoRepository();

  it('guarda y lee por tipo y anio', async () => {
    const tipo = unico();
    const anio = anioUnico();
    await repo.save(Object.assign(new Correlativo(), { tipo, anio, ultimo: 7 }));
    limpiar(Correlativo, { tipo, anio });

    expect(await repo.findById(tipo, anio)).toEqual({ tipo, anio, ultimo: 7 });
  });

  it('rechaza una fila sin ultimo', async () => {
    const correlativo = Object.assign(new Correlativo(), { tipo: unico(), anio: anioUnico() });
    await expect(repo.save(correlativo)).rejects.toMatchObject({ driverError: { code: '23502' } });
  });
});
