import { randomUUID } from 'node:crypto';
import { MotivoAsignacion } from '@arca/shared';
import { Area } from '../../src/entities/area.entity';
import { AsignacionLaboral } from '../../src/entities/asignacion-laboral.entity';
import { Cargo } from '../../src/entities/cargo.entity';
import { Funcionario } from '../../src/entities/funcionario.entity';
import { AreaRepository } from '../../src/repositories/area.repository';
import { CargoRepository } from '../../src/repositories/cargo.repository';
import { FuncionarioRepository } from '../../src/repositories/funcionario.repository';
import { limpiar, unico } from './db';

export const nuevaArea = (datos: Partial<Area> = {}) =>
  Object.assign(new Area(), { codigo: unico(), nombre: unico(), ...datos });

export const nuevoCargo = (areaId: string, datos: Partial<Cargo> = {}) =>
  Object.assign(new Cargo(), { areaId, nombre: unico(), salarioMin: 3000, salarioMax: 6000, ...datos });

export const nuevoFuncionario = (datos: Partial<Funcionario> = {}) =>
  Object.assign(new Funcionario(), {
    ci: unico(),
    ciExpedido: 'CB',
    nombres: 'Prueba',
    apellidos: 'Repositorio',
    fechaNacimiento: '1990-05-20',
    sexo: 'F',
    fechaIngreso: '2026-01-15',
    ...datos,
  });

export const nuevaAsignacion = (funcionarioId: string, cargoId: string, datos: Partial<AsignacionLaboral> = {}) =>
  Object.assign(new AsignacionLaboral(), {
    funcionarioId,
    cargoId,
    remuneracion: 4500.5,
    vigenteDesde: '2026-01-15',
    motivo: MotivoAsignacion.INGRESO,
    registradoPor: randomUUID(),
    ...datos,
  });

export async function crearArea() {
  const area = await new AreaRepository().save(nuevaArea());
  limpiar(Area, { id: area.id });
  return area;
}

export async function crearCargo() {
  const area = await crearArea();
  const cargo = await new CargoRepository().save(nuevoCargo(area.id));
  limpiar(Cargo, { id: cargo.id });
  return cargo;
}

export async function crearFuncionario() {
  const funcionario = await new FuncionarioRepository().save(nuevoFuncionario());
  limpiar(Funcionario, { id: funcionario.id });
  return funcionario;
}
