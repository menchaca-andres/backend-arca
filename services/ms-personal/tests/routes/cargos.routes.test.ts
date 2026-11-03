import request from 'supertest';
import { RolUsuario } from '@arca/shared';
import { app } from '../../src/app';
import { Area } from '../../src/entities/area.entity';
import { Cargo } from '../../src/entities/cargo.entity';
import { AreaRepository } from '../../src/repositories/area.repository';
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

const comoRrhh = { 'x-user-rol': RolUsuario.RRHH };

describe('Rutas de cargos', () => {
  usarBase();
  const areas = new AreaRepository();
  const cargos = new CargoRepository();

  it('POST /cargos crea el cargo en un área activa', async () => {
    const area = await crearArea();
    const nombre = unico();

    const res = await request(app)
      .post('/cargos')
      .set(comoRrhh)
      .send({ areaId: area.id, nombre, salarioMin: 3000, salarioMax: 6000 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ areaId: area.id, nombre, salarioMin: 3000, salarioMax: 6000 });
    limpiar(Cargo, { id: res.body.id });
  });

  it('POST /cargos valida la banda salarial y el área', async () => {
    const area = await crearArea();
    const bandaInvalida = await request(app)
      .post('/cargos')
      .set(comoRrhh)
      .send({ areaId: area.id, nombre: unico(), salarioMin: 7000, salarioMax: 6000 });
    const areaInexistente = await request(app)
      .post('/cargos')
      .set(comoRrhh)
      .send({ areaId: '00000000-0000-4000-8000-000000000000', nombre: unico(), salarioMin: 3000, salarioMax: 6000 });

    expect(bandaInvalida.status).toBe(400);
    expect(bandaInvalida.body.code).toBe('VALIDATION_ERROR');
    expect(areaInexistente.status).toBe(404);
    expect(areaInexistente.body.code).toBe('NOT_FOUND');
  });

  it('POST /cargos rechaza nombres repetidos dentro del área', async () => {
    const area = await crearArea();
    const cargo = await crearCargoEnArea(area.id);

    const res = await request(app)
      .post('/cargos')
      .set(comoRrhh)
      .send({
        areaId: area.id,
        nombre: cargo.nombre.toLowerCase(),
        salarioMin: 3000,
        salarioMax: 6000,
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('POST /cargos rechaza un área inactiva', async () => {
    const area = await areas.save(nuevaArea({ activo: false }));
    limpiar(Area, { id: area.id });

    const res = await request(app)
      .post('/cargos')
      .set(comoRrhh)
      .send({ areaId: area.id, nombre: unico(), salarioMin: 3000, salarioMax: 6000 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('GET /cargos filtra inactivos y cargos de áreas inactivas', async () => {
    const area = await crearArea();
    const activo = await crearCargoEnArea(area.id);
    const inactivo = await cargos.save(nuevoCargo(area.id, { activo: false }));
    limpiar(Cargo, { id: inactivo.id });

    const areaInactiva = await areas.save(nuevaArea({ activo: false }));
    limpiar(Area, { id: areaInactiva.id });
    const cargoDeAreaInactiva = await cargos.save(nuevoCargo(areaInactiva.id));
    limpiar(Cargo, { id: cargoDeAreaInactiva.id });

    const visibles = await request(app).get('/cargos').set(comoRrhh);
    const todos = await request(app).get('/cargos?incluirInactivos=true').set(comoRrhh);

    expect(visibles.body.map((cargo: Cargo) => cargo.id)).toContain(activo.id);
    expect(visibles.body.map((cargo: Cargo) => cargo.id)).not.toContain(inactivo.id);
    expect(visibles.body.map((cargo: Cargo) => cargo.id)).not.toContain(cargoDeAreaInactiva.id);
    expect(todos.body.map((cargo: Cargo) => cargo.id)).toContain(inactivo.id);
    expect(todos.body.map((cargo: Cargo) => cargo.id)).toContain(cargoDeAreaInactiva.id);
  });

  it('GET /cargos filtra por área', async () => {
    const area = await crearArea();
    const cargo = await crearCargoEnArea(area.id);

    const res = await request(app).get(`/cargos?areaId=${area.id}`).set(comoRrhh);

    expect(res.status).toBe(200);
    expect(res.body.map((item: Cargo) => item.id)).toContain(cargo.id);
    expect(res.body.every((item: Cargo) => item.areaId === area.id)).toBe(true);
  });

  it('PATCH /cargos/:id edita el cargo y valida la banda resultante', async () => {
    const cargo = await crearCargoEnArea((await crearArea()).id);

    const editado = await request(app)
      .patch(`/cargos/${cargo.id}`)
      .set(comoRrhh)
      .send({ salarioMin: 3500, salarioMax: 7000 });
    const bandaInvalida = await request(app)
      .patch(`/cargos/${cargo.id}`)
      .set(comoRrhh)
      .send({ salarioMin: 8000 });

    expect(editado.status).toBe(200);
    expect(editado.body).toMatchObject({ salarioMin: 3500, salarioMax: 7000 });
    expect(bandaInvalida.status).toBe(400);
    expect(bandaInvalida.body.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /cargos/:id no desactiva un cargo con asignaciones vigentes', async () => {
    const cargo = await crearCargoEnArea((await crearArea()).id);
    const funcionario = await crearFuncionario();
    await crearAsignacion(funcionario.id, cargo.id);

    const res = await request(app).patch(`/cargos/${cargo.id}`).set(comoRrhh).send({ activo: false });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('PATCH /cargos/:id desactiva un cargo sin asignaciones vigentes', async () => {
    const cargo = await crearCargoEnArea((await crearArea()).id);

    const res = await request(app).patch(`/cargos/${cargo.id}`).set(comoRrhh).send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
  });

  it('rechaza roles sin permiso', async () => {
    const res = await request(app).get('/cargos').set('x-user-rol', RolUsuario.FUNCIONARIO);

    expect(res.status).toBe(403);
  });
});
