import request from 'supertest';
import { EstadoFuncionario, MotivoBaja, RolUsuario } from '@arca/shared';
import { app } from '../../src/app';
import { AsignacionLaboral } from '../../src/entities/asignacion-laboral.entity';
import { Funcionario } from '../../src/entities/funcionario.entity';
import { FuncionarioRepository } from '../../src/repositories/funcionario.repository';
import { limpiar, unico, usarBase } from '../helpers/db';
import { crearArea, crearAsignacion, crearCargoEnArea, nuevoFuncionario } from '../helpers/fixtures';

const comoRrhh = { 'x-user-id': '00000000-0000-4000-8000-000000000001', 'x-user-rol': RolUsuario.RRHH };
const conClave = { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' };

// Crea un funcionario con apellido marcado para aislar las búsquedas de la semilla y de otras corridas.
async function crearEnPadron(marca: string, cargoId: string, datos: Partial<Funcionario> = {}) {
  const funcionario = await new FuncionarioRepository().save(nuevoFuncionario({ apellidos: marca, ...datos }));
  limpiar(Funcionario, { id: funcionario.id });
  limpiar(AsignacionLaboral, { funcionarioId: funcionario.id });
  await crearAsignacion(funcionario.id, cargoId, { remuneracion: 4000 });
  return funcionario;
}

describe('Padrón y ficha (HU-09) y cambios con historial (HU-10)', () => {
  usarBase();

  describe('GET /funcionarios', () => {
    it('CA-02: busca por nombre o CI y filtra por área, cargo y estado', async () => {
      const marca = unico();
      const areaA = await crearArea();
      const areaB = await crearArea();
      const cargoA = await crearCargoEnArea(areaA.id);
      const cargoB = await crearCargoEnArea(areaB.id);
      const ana = await crearEnPadron(marca, cargoA.id, { nombres: 'Ana' });
      const beto = await crearEnPadron(marca, cargoB.id, { nombres: 'Beto' });
      await crearEnPadron(marca, cargoB.id, {
        nombres: 'Ciro',
        estado: EstadoFuncionario.BAJA,
        fechaBaja: '2026-06-01',
        motivoBaja: MotivoBaja.RENUNCIA,
      });

      const porNombre = await request(app)
        .get('/funcionarios')
        .query({ q: `ana ${marca}` })
        .set(comoRrhh);
      const porCi = await request(app).get('/funcionarios').query({ q: beto.ci.toLowerCase() }).set(comoRrhh);
      const porArea = await request(app).get('/funcionarios').query({ q: marca, areaId: areaB.id }).set(comoRrhh);
      const porCargo = await request(app).get('/funcionarios').query({ q: marca, cargoId: cargoA.id }).set(comoRrhh);
      const conBajas = await request(app).get('/funcionarios').query({ q: marca, estado: 'TODOS' }).set(comoRrhh);
      const soloBajas = await request(app).get('/funcionarios').query({ q: marca, estado: 'BAJA' }).set(comoRrhh);

      expect(porNombre.body.data.map((f: { id: string }) => f.id)).toEqual([ana.id]);
      expect(porNombre.body.data[0]).toMatchObject({
        areaId: areaA.id,
        cargoId: cargoA.id,
        cargoNombre: cargoA.nombre,
      });
      expect(porCi.body.data.map((f: { id: string }) => f.id)).toEqual([beto.id]);
      // Sin filtro de estado no aparecen las bajas
      expect(porArea.body.data.map((f: { id: string }) => f.id)).toEqual([beto.id]);
      expect(porCargo.body.data.map((f: { id: string }) => f.id)).toEqual([ana.id]);
      expect(conBajas.body.total).toBe(3);
      expect(soloBajas.body.data.map((f: { nombreCompleto: string }) => f.nombreCompleto)).toEqual([`Ciro ${marca}`]);
    });

    it('CA-01: pagina de 20 en 20 por defecto', async () => {
      const marca = unico();
      const cargo = await crearCargoEnArea((await crearArea()).id);
      for (let i = 0; i < 22; i++) await crearEnPadron(marca, cargo.id, { nombres: `N${String(i).padStart(2, '0')}` });

      const primera = await request(app).get('/funcionarios').query({ q: marca }).set(comoRrhh);
      const segunda = await request(app).get('/funcionarios').query({ q: marca, page: 2 }).set(comoRrhh);

      expect(primera.status).toBe(200);
      expect(primera.body).toMatchObject({ page: 1, pageSize: 20, total: 22 });
      expect(primera.body.data).toHaveLength(20);
      expect(segunda.body.data.map((f: { nombreCompleto: string }) => f.nombreCompleto)).toEqual([
        `N20 ${marca}`,
        `N21 ${marca}`,
      ]);
    });

    it('trata los comodines de la búsqueda como texto', async () => {
      const res = await request(app).get('/funcionarios').query({ q: '%' }).set(comoRrhh);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /funcionarios/:id', () => {
    it('CA-03 y CA-04: devuelve la ficha con historial y deja ver la propia a un FUNCIONARIO', async () => {
      const cargo = await crearCargoEnArea((await crearArea()).id);
      const funcionario = await crearEnPadron(unico(), cargo.id);

      const propia = await request(app)
        .get(`/funcionarios/${funcionario.id}`)
        .set({ 'x-user-rol': RolUsuario.FUNCIONARIO, 'x-funcionario-id': funcionario.id });

      expect(propia.status).toBe(200);
      expect(propia.body.historialAsignaciones).toHaveLength(1);
      expect(propia.body.asignacionVigente).toMatchObject({ cargoId: cargo.id, vigenteHasta: null });
    });

    it('responde 404 si el funcionario no existe', async () => {
      const res = await request(app).get('/funcionarios/00000000-0000-4000-8000-00000000abcd').set(comoRrhh);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /funcionarios/:id/asignaciones', () => {
    it('CA-02 y CA-06: cierra la actual el día anterior y deja una sola vigente', async () => {
      const area = await crearArea();
      const cargo = await crearCargoEnArea(area.id);
      const otroCargo = await crearCargoEnArea((await crearArea()).id);
      const funcionario = await crearEnPadron(unico(), cargo.id);

      const res = await request(app)
        .post(`/funcionarios/${funcionario.id}/asignaciones`)
        .set(comoRrhh)
        .send({ cargoId: otroCargo.id, remuneracion: 5000, vigenteDesde: '2026-12-01', motivo: 'TRASLADO' });

      expect(res.status).toBe(201);
      expect(res.body.asignacionVigente).toMatchObject({
        cargoId: otroCargo.id,
        remuneracion: 5000,
        vigenteDesde: '2026-12-01',
        motivo: 'TRASLADO',
      });
      expect(res.body.historialAsignaciones).toHaveLength(2);
      expect(res.body.historialAsignaciones[1]).toMatchObject({ cargoId: cargo.id, vigenteHasta: '2026-11-30' });
    });

    it('CA-03: rechaza una vigencia el mismo día que la actual sin tocar el historial', async () => {
      const cargo = await crearCargoEnArea((await crearArea()).id);
      const funcionario = await crearEnPadron(unico(), cargo.id);

      const res = await request(app)
        .post(`/funcionarios/${funcionario.id}/asignaciones`)
        .set(comoRrhh)
        .send({ remuneracion: 5000, vigenteDesde: '2026-01-15', motivo: 'INCREMENTO' });
      const ficha = await request(app).get(`/funcionarios/${funcionario.id}`).set(comoRrhh);

      expect(res.status).toBe(400);
      expect(ficha.body.historialAsignaciones).toHaveLength(1);
      expect(ficha.body.asignacionVigente.vigenteHasta).toBeNull();
    });
  });

  describe('PATCH /funcionarios/:id/contacto', () => {
    it('CA-07: actualiza el contacto sin crear historial', async () => {
      const cargo = await crearCargoEnArea((await crearArea()).id);
      const funcionario = await crearEnPadron(unico(), cargo.id);

      const res = await request(app)
        .patch(`/funcionarios/${funcionario.id}/contacto`)
        .set(comoRrhh)
        .send({ correo: 'Nuevo@Arca.bo', telefono: '70011122' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ correo: 'nuevo@arca.bo', telefono: '70011122', ci: funcionario.ci });
      expect(res.body.historialAsignaciones).toHaveLength(1);
    });
  });

  describe('GET /internal/funcionarios', () => {
    it('CA-05: lista a los activos en el rango con su asignación vigente', async () => {
      const marca = unico();
      const cargo = await crearCargoEnArea((await crearArea()).id);
      const activo = await crearEnPadron(marca, cargo.id, { fechaIngreso: '2026-01-15' });
      const ingresaDespues = await crearEnPadron(marca, cargo.id, { fechaIngreso: '2027-01-15' });
      const bajaAntes = await crearEnPadron(marca, cargo.id, {
        estado: EstadoFuncionario.BAJA,
        fechaBaja: '2026-02-01',
        motivoBaja: MotivoBaja.RENUNCIA,
      });

      const res = await request(app)
        .get('/internal/funcionarios')
        .query({ activosDesde: '2026-11-01', activosHasta: '2026-11-30', pageSize: 200 })
        .set(conClave);
      const ids = res.body.data.map((f: { id: string }) => f.id);

      expect(res.status).toBe(200);
      expect(ids).toContain(activo.id);
      expect(ids).not.toContain(ingresaDespues.id);
      expect(ids).not.toContain(bajaAntes.id);
      expect(res.body.data.find((f: { id: string }) => f.id === activo.id)).toMatchObject({
        cargo: cargo.nombre,
        remuneracion: { monto: 4000, moneda: 'BOB' },
      });
    });
  });
});
