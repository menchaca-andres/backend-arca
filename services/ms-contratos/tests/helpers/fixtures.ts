import { randomUUID } from 'node:crypto';
import { EstadoContrato, TipoContrato } from '@arca/shared';
import { Contrato } from '../../src/entities/contrato.entity';
import { Plantilla } from '../../src/entities/plantilla.entity';
import { PlantillaVersion } from '../../src/entities/plantilla-version.entity';
import { ContratoRepository } from '../../src/repositories/contrato.repository';
import { PlantillaRepository } from '../../src/repositories/plantilla.repository';
import { PlantillaVersionRepository } from '../../src/repositories/plantilla-version.repository';
import { limpiar, unico } from './db';

export const nuevaPlantilla = (datos: Partial<Plantilla> = {}) =>
  Object.assign(new Plantilla(), { codigo: unico(), nombre: 'Prueba', tipo: TipoContrato.INDEFINIDO, ...datos });

export const nuevaVersion = (plantillaId: string, datos: Partial<PlantillaVersion> = {}) =>
  Object.assign(new PlantillaVersion(), {
    plantillaId,
    version: 1,
    contenido: '<p>{{nombre}}</p>',
    variables: ['nombre'],
    activa: true,
    creadoPor: randomUUID(),
    ...datos,
  });

export const nuevoContrato = (plantillaVersionId: string, datos: Partial<Contrato> = {}) =>
  Object.assign(new Contrato(), {
    numero: `CT-${unico()}`,
    funcionarioId: randomUUID(),
    plantillaVersionId,
    version: 1,
    estado: EstadoContrato.VIGENTE,
    datos: { nombre: 'Prueba' },
    contenidoRenderizado: '<p>Prueba</p>',
    hashSha256: 'a'.repeat(64),
    generadoPor: randomUUID(),
    ...datos,
  });

export async function crearPlantilla() {
  const plantilla = await new PlantillaRepository().save(nuevaPlantilla());
  limpiar(Plantilla, { id: plantilla.id });
  return plantilla;
}

export async function crearVersion() {
  const plantilla = await crearPlantilla();
  const version = await new PlantillaVersionRepository().save(nuevaVersion(plantilla.id));
  limpiar(PlantillaVersion, { id: version.id });
  return version;
}

export async function crearContrato() {
  const version = await crearVersion();
  const contrato = await new ContratoRepository().save(nuevoContrato(version.id));
  limpiar(Contrato, { id: contrato.id });
  return contrato;
}
