import request from 'supertest';
import { RolUsuario } from '@arca/shared';
import { app } from '../../src/app';
import { Area } from '../../src/entities/area.entity';
import { AreaRepository } from '../../src/repositories/area.repository';
import { limpiar, unico, usarBase } from '../helpers/db';
import {
  crearArea,
  crearAsignacion,
  crearCargoEnArea,
  crearFuncionario,
  nuevaArea,
} from '../helpers/fixtures';

const comoRrhh = { 'x-user-rol': RolUsuario.RRHH };

describe('Rutas de áreas', () => {
  usarBase();
  const repo = new AreaRepository();

  it('POST /areas crea el área y normaliza el código', async () => {
    const codigo = unico();
    const res = await request(app)
      .post('/areas')
      .set(comoRrhh)
      .send({ codigo: codigo.toLowerCase(), nombre: unico() });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ codigo, activo: true });
    limpiar(Area, { id: res.body.id });
  });

  it('POST /areas rechaza código y nombre repetidos', async () => {
    const area = await crearArea();

    const porCodigo = await request(app)
      .post('/areas')
      .set(comoRrhh)
      .send({ codigo: area.codigo.toLowerCase(), nombre: unico() });
    const porNombre = await request(app)
      .post('/areas')
      .set(comoRrhh)
      .send({ codigo: unico(), nombre: area.nombre.toUpperCase() });

    expect(porCodigo.status).toBe(409);
    expect(porCodigo.body.code).toBe('CONFLICT');
    expect(porNombre.status).toBe(409);
    expect(porNombre.body.code).toBe('CONFLICT');
  });

  it('POST /areas valida el cuerpo con Zod', async () => {
    const res = await request(app).post('/areas').set(comoRrhh).send({ codigo: '', nombre: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('GET /areas solo devuelve activas salvo que se pidan todas', async () => {
    const activa = await crearArea();
    const inactiva = await repo.save(nuevaArea({ activo: false }));
    limpiar(Area, { id: inactiva.id });

    const activas = await request(app).get('/areas').set(comoRrhh);
    const todas = await request(app).get('/areas?incluirInactivos=true').set(comoRrhh);

    expect(activas.status).toBe(200);
    expect(activas.body.map((area: Area) => area.id)).toContain(activa.id);
    expect(activas.body.map((area: Area) => area.id)).not.toContain(inactiva.id);
    expect(todas.body.map((area: Area) => area.id)).toContain(inactiva.id);
  });

  it('PATCH /areas/:id edita el área', async () => {
    const area = await crearArea();
    const nombre = unico();

    const res = await request(app).patch(`/areas/${area.id}`).set(comoRrhh).send({ nombre });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: area.id, nombre });
  });

  it('PATCH /areas/:id no desactiva un área con asignaciones vigentes', async () => {
    const area = await crearArea();
    const cargo = await crearCargoEnArea(area.id);
    const funcionario = await crearFuncionario();
    await crearAsignacion(funcionario.id, cargo.id);

    const res = await request(app).patch(`/areas/${area.id}`).set(comoRrhh).send({ activo: false });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('PATCH /areas/:id desactiva un área sin asignaciones vigentes', async () => {
    const area = await crearArea();

    const res = await request(app).patch(`/areas/${area.id}`).set(comoRrhh).send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
  });

  it('rechaza IDs inválidos y roles sin permiso', async () => {
    const idInvalido = await request(app).patch('/areas/no-es-uuid').set(comoRrhh).send({ nombre: unico() });
    const sinPermiso = await request(app)
      .get('/areas')
      .set('x-user-rol', RolUsuario.FUNCIONARIO);

    expect(idInvalido.status).toBe(400);
    expect(sinPermiso.status).toBe(403);
  });
});
