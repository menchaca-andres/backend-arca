import request from 'supertest';
import { EstadoFuncionario, RolUsuario } from '@arca/shared';
import { app } from '../../src/app';
import { Funcionario } from '../../src/entities/funcionario.entity';
import { AsignacionLaboral } from '../../src/entities/asignacion-laboral.entity';
import { limpiar, unico, usarBase } from '../helpers/db';
import { crearCargo } from '../helpers/fixtures';

const userId = '11111111-1111-4111-8111-111111111111';
const comoRrhh = { 'x-user-rol': RolUsuario.RRHH, 'x-user-id': userId };
const comoAdmin = { 'x-user-rol': RolUsuario.ADMIN, 'x-user-id': userId };
const comoFuncionario = { 'x-user-rol': RolUsuario.FUNCIONARIO, 'x-user-id': userId };

describe('Rutas de funcionarios (HU-08: Supertest)', () => {
  usarBase();

  it('POST /funcionarios registra un funcionario y su asignación inicial (201)', async () => {
    const cargo = await crearCargo(); // Salario min: 3000, max: 6000
    const ci = unico().slice(0, 10);

    const payload = {
      ci,
      ciExpedido: 'LP',
      nombres: 'Marcelo',
      apellidos: 'Claure Bedoya',
      fechaNacimiento: '1985-04-12',
      sexo: 'M',
      correo: `test.${ci}@arca.bo`,
      telefono: '77788990',
      direccion: 'Av. Arce #2000',
      cargoId: cargo.id,
      remuneracion: 5000,
      fechaIngreso: '2026-11-01',
      diasPrueba: 90,
    };

    const res = await request(app)
      .post('/funcionarios')
      .set(comoRrhh)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ci,
      ciExpedido: 'LP',
      nombres: 'Marcelo',
      apellidos: 'Claure Bedoya',
      estado: EstadoFuncionario.EN_PRUEBA,
      diasPrueba: 90,
      asignacionVigente: {
        cargoId: cargo.id,
        remuneracion: 5000,
        motivo: 'INGRESO',
      },
    });

    limpiar(AsignacionLaboral, { funcionarioId: res.body.id });
    limpiar(Funcionario, { id: res.body.id });
  });

  it('POST /funcionarios rechaza acceso a usuarios no autorizados (403)', async () => {
    const res = await request(app)
      .post('/funcionarios')
      .set(comoFuncionario)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('POST /funcionarios rechaza CI duplicado (409 CONFLICT)', async () => {
    const cargo = await crearCargo();
    const ci = unico().slice(0, 10);

    const payload = {
      ci,
      ciExpedido: 'SC',
      nombres: 'Ana',
      apellidos: 'Suarez',
      fechaNacimiento: '1992-08-10',
      sexo: 'F',
      cargoId: cargo.id,
      remuneracion: 4500,
      fechaIngreso: '2026-11-01',
      diasPrueba: 90,
    };

    // Primer registro exitoso
    const res1 = await request(app)
      .post('/funcionarios')
      .set(comoRrhh)
      .send(payload);
    expect(res1.status).toBe(201);

    // Segundo registro con mismo CI
    const res2 = await request(app)
      .post('/funcionarios')
      .set(comoAdmin)
      .send(payload);

    expect(res2.status).toBe(409);
    expect(res2.body.code).toBe('CONFLICT');
    expect(res2.body.message).toContain('Ya existe un funcionario con este CI');

    limpiar(AsignacionLaboral, { funcionarioId: res1.body.id });
    limpiar(Funcionario, { id: res1.body.id });
  });

  it('POST /funcionarios rechaza si la remuneración está fuera de banda (400)', async () => {
    const cargo = await crearCargo(); // min 3000, max 6000

    const payload = {
      ci: unico().slice(0, 10),
      ciExpedido: 'CB',
      nombres: 'Pedro',
      apellidos: 'Vargas',
      fechaNacimiento: '1990-01-01',
      sexo: 'M',
      cargoId: cargo.id,
      remuneracion: 7500, // Fuera de rango (> 6000)
      fechaIngreso: '2026-11-01',
      diasPrueba: 90,
    };

    const res = await request(app)
      .post('/funcionarios')
      .set(comoRrhh)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toContain('banda salarial');
  });

  it('GET /funcionarios/:id devuelve la ficha del funcionario', async () => {
    const cargo = await crearCargo();
    const ci = unico().slice(0, 10);

    const postRes = await request(app)
      .post('/funcionarios')
      .set(comoRrhh)
      .send({
        ci,
        ciExpedido: 'OR',
        nombres: 'Elena',
        apellidos: 'Rios',
        fechaNacimiento: '1993-02-15',
        sexo: 'F',
        cargoId: cargo.id,
        remuneracion: 4000,
        fechaIngreso: '2026-11-01',
        diasPrueba: 60,
      });

    const getRes = await request(app)
      .get(`/funcionarios/${postRes.body.id}`)
      .set(comoRrhh);

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(postRes.body.id);
    expect(getRes.body.ci).toBe(ci);

    limpiar(AsignacionLaboral, { funcionarioId: postRes.body.id });
    limpiar(Funcionario, { id: postRes.body.id });
  });
});

