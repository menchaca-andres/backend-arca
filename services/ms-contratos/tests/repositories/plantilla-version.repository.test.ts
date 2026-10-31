import { PlantillaVersion } from '../../src/entities/plantilla-version.entity';
import { PlantillaVersionRepository } from '../../src/repositories/plantilla-version.repository';
import { limpiar, usarBase } from '../helpers/db';
import { crearVersion, nuevaVersion } from '../helpers/fixtures';

describe('PlantillaVersionRepository', () => {
  usarBase();
  const repo = new PlantillaVersionRepository();

  it('guarda y lee por id con jsonb', async () => {
    const version = await crearVersion();
    expect((await repo.findById(version.id))?.variables).toEqual(['nombre']);
  });

  it('rechaza dos versiones activas de la misma plantilla', async () => {
    const version = await crearVersion();
    await expect(repo.save(nuevaVersion(version.plantillaId, { version: 2 }))).rejects.toMatchObject({
      driverError: { constraint: 'ux_plantilla_version_activa' },
    });
  });

  it('permite otra version si no esta activa, pero no con el mismo numero', async () => {
    const version = await crearVersion();
    const inactiva = await repo.save(nuevaVersion(version.plantillaId, { version: 2, activa: false }));
    limpiar(PlantillaVersion, { id: inactiva.id });

    await expect(repo.save(nuevaVersion(version.plantillaId, { version: 2, activa: false }))).rejects.toMatchObject({
      driverError: { constraint: 'uq_plantilla_version' },
    });
  });
});
