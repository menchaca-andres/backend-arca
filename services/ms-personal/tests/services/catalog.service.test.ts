import { AppError } from '@arca/shared';
import { AreaService } from '../../src/services/area.service';
import { CargoService } from '../../src/services/cargo.service';
import { AreaRepository } from '../../src/repositories/area.repository';
import { Area } from '../../src/entities/area.entity';
import { Cargo } from '../../src/entities/cargo.entity';
import { CargoRepository } from '../../src/repositories/cargo.repository';
import { limpiar, unico, usarBase } from '../helpers/db';
import {
  crearArea,
  crearAsignacion,
  crearCargoEnArea,
  crearFuncionario,
  nuevaArea,
  nuevoCargo,
} from '../helpers/fixtures';

describe('Reglas de negocio de áreas y cargos', () => {
  usarBase();
  const areaService = new AreaService();
  const cargoService = new CargoService();
  const areas = new AreaRepository();
  const cargos = new CargoRepository();

  it('no permite códigos ni nombres de área repetidos', async () => {
    const area = await crearArea();

    await expect(areaService.create({ codigo: area.codigo.toLowerCase(), nombre: unico() })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(areaService.create({ codigo: unico(), nombre: area.nombre.toUpperCase() })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('no desactiva un área con una asignación vigente', async () => {
    const area = await crearArea();
    const cargo = await crearCargoEnArea(area.id);
    const funcionario = await crearFuncionario();
    await crearAsignacion(funcionario.id, cargo.id);

    await expect(areaService.update(area.id, { activo: false })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('desactiva un área sin asignaciones vigentes', async () => {
    const area = await crearArea();

    const actualizada = await areaService.update(area.id, { activo: false });

    expect(actualizada.activo).toBe(false);
  });

  it('valida la banda salarial al crear y editar un cargo', async () => {
    const area = await crearArea();

    await expect(
      cargoService.create({
        areaId: area.id,
        nombre: unico(),
        salarioMin: 7000,
        salarioMax: 6000,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    const cargo = await crearCargoEnArea(area.id);
    await expect(cargoService.update(cargo.id, { salarioMin: 9000 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('no crea cargos en áreas inactivas ni con nombres repetidos', async () => {
    const inactiva = await areas.save(nuevaArea({ activo: false }));
    limpiar(Area, { id: inactiva.id });

    await expect(
      cargoService.create({
        areaId: inactiva.id,
        nombre: unico(),
        salarioMin: 3000,
        salarioMax: 6000,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const area = await crearArea();
    const cargo = await crearCargoEnArea(area.id);
    await expect(
      cargoService.create({
        areaId: area.id,
        nombre: cargo.nombre.toLowerCase(),
        salarioMin: 3000,
        salarioMax: 6000,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('no desactiva un cargo con una asignación vigente', async () => {
    const cargo = await crearCargoEnArea((await crearArea()).id);
    const funcionario = await crearFuncionario();
    await crearAsignacion(funcionario.id, cargo.id);

    await expect(cargoService.update(cargo.id, { activo: false })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('desactiva un cargo sin asignaciones vigentes', async () => {
    const cargo = await crearCargoEnArea((await crearArea()).id);

    const actualizado = await cargoService.update(cargo.id, { activo: false });

    expect(actualizado.activo).toBe(false);
  });

  it('rechaza actualizar un cargo inexistente', async () => {
    const error = (await cargoService
      .update('00000000-0000-4000-8000-000000000000', { nombre: unico() })
      .catch((e: unknown) => e)) as AppError;

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('lista solo cargos activos de áreas activas por defecto', async () => {
    const area = await crearArea();
    const activo = await crearCargoEnArea(area.id);
    const inactivo = await cargos.save(nuevoCargo(area.id, { activo: false }));
    limpiar(Cargo, { id: inactivo.id });

    const visibles = await cargoService.list({});
    const todos = await cargoService.list({ includeInactive: true });

    expect(visibles.map((cargo) => cargo.id)).toContain(activo.id);
    expect(visibles.map((cargo) => cargo.id)).not.toContain(inactivo.id);
    expect(todos.map((cargo) => cargo.id)).toContain(inactivo.id);
  });
});
