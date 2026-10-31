import { AreaRepository } from '../../src/repositories/area.repository';
import { usarBase } from '../helpers/db';
import { crearArea, nuevaArea } from '../helpers/fixtures';

describe('AreaRepository', () => {
  usarBase();
  const repo = new AreaRepository();

  it('guarda y lee por id', async () => {
    const area = await crearArea();
    expect(await repo.findById(area.id)).toMatchObject({ codigo: area.codigo, activo: true });
    expect((await repo.findAll()).some((a) => a.id === area.id)).toBe(true);
  });

  it('rechaza un codigo repetido', async () => {
    const area = await crearArea();
    await expect(repo.save(nuevaArea({ codigo: area.codigo }))).rejects.toMatchObject({ driverError: { code: '23505' } });
  });
});
