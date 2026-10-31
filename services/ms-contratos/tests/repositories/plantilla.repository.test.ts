import { PlantillaRepository } from '../../src/repositories/plantilla.repository';
import { usarBase } from '../helpers/db';
import { crearPlantilla, nuevaPlantilla } from '../helpers/fixtures';

describe('PlantillaRepository', () => {
  usarBase();
  const repo = new PlantillaRepository();

  it('guarda y lee por id', async () => {
    const plantilla = await crearPlantilla();
    expect(await repo.findById(plantilla.id)).toMatchObject({ codigo: plantilla.codigo, activo: true });
  });

  it('rechaza un codigo repetido', async () => {
    const plantilla = await crearPlantilla();
    await expect(repo.save(nuevaPlantilla({ codigo: plantilla.codigo }))).rejects.toMatchObject({
      driverError: { code: '23505' },
    });
  });
});
