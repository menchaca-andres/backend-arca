import { CargoRepository } from '../../src/repositories/cargo.repository';
import { usarBase } from '../helpers/db';
import { crearArea, crearCargo, nuevoCargo } from '../helpers/fixtures';

describe('CargoRepository', () => {
  usarBase();
  const repo = new CargoRepository();

  it('guarda y lee por id con numeric convertido a number', async () => {
    const cargo = await crearCargo();
    const leido = await repo.findById(cargo.id);
    expect(leido?.salarioMin).toBe(3000);
    expect(leido?.salarioMax).toBe(6000);
  });

  it('rechaza una banda salarial invertida', async () => {
    const area = await crearArea();
    await expect(repo.save(nuevoCargo(area.id, { salarioMin: 7000, salarioMax: 6000 }))).rejects.toMatchObject({
      driverError: { constraint: 'ck_cargo_banda' },
    });
  });

  it('rechaza un nombre repetido dentro del area', async () => {
    const cargo = await crearCargo();
    await expect(repo.save(nuevoCargo(cargo.areaId, { nombre: cargo.nombre }))).rejects.toMatchObject({
      driverError: { constraint: 'uq_cargo_area_nombre' },
    });
  });
});
