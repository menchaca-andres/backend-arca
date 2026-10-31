import { BaseCalculo, FormaCalculo } from '@arca/shared';
import { ConceptoRepository } from '../../src/repositories/concepto.repository';
import { usarBase } from '../helpers/db';
import { crearConcepto, nuevoConcepto } from '../helpers/fixtures';

describe('ConceptoRepository', () => {
  usarBase();
  const repo = new ConceptoRepository();

  it('guarda y lee por id', async () => {
    const concepto = await crearConcepto();
    const leido = await repo.findById(concepto.id);
    expect(leido?.valor).toBe(100);
    expect(leido?.base).toBeNull();
  });

  it('rechaza un codigo repetido', async () => {
    const concepto = await crearConcepto();
    await expect(repo.save(nuevoConcepto({ codigo: concepto.codigo }))).rejects.toMatchObject({
      driverError: { code: '23505' },
    });
  });

  it.each([
    ['ck_concepto_porcentaje', { formaCalculo: FormaCalculo.PORCENTAJE, valor: 101, base: BaseCalculo.TOTAL_GANADO }],
    ['ck_concepto_monto_fijo', { valor: 0 }],
    ['ck_concepto_sistema', { formaCalculo: FormaCalculo.SISTEMA }],
  ])('rechaza datos que violan %s', async (constraint, datos) => {
    await expect(repo.save(nuevoConcepto(datos))).rejects.toMatchObject({ driverError: { constraint } });
  });
});
