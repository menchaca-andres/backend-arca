import { randomUUID } from 'node:crypto';
import { EntityTarget, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { AppDataSource } from '../../src/data-source';

const pendientes: Array<() => Promise<unknown>> = [];

// Texto único corto, para no chocar con la semilla ni con otras corridas.
export const unico = () => randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();

export const anioUnico = () => 3000 + Math.floor(Math.random() * 6000);

// Registra una fila de prueba para borrarla al final, en orden inverso por las FK.
export function limpiar<T extends ObjectLiteral>(entidad: EntityTarget<T>, criterio: FindOptionsWhere<T>) {
  pendientes.push(() => AppDataSource.getRepository(entidad).delete(criterio));
}

export function usarBase() {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    for (const borrar of pendientes.reverse()) await borrar();
    await AppDataSource.destroy();
  });
}
