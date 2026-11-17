import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Correlativo } from '../entities/correlativo.entity';

export class CorrelativoRepository {
  private get repo() {
    return AppDataSource.getRepository ? AppDataSource.getRepository(Correlativo) : ({} as any);
  }

  findById(tipo: string, anio: number, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Correlativo) : this.repo;
    return repository.findOneBy({ tipo, anio });
  }

  findAll(manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Correlativo) : this.repo;
    return repository.find();
  }

  save(entity: Correlativo, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(Correlativo) : this.repo;
    return repository.save(entity);
  }

  async obtenerSiguiente(tipo: string, anio: number, manager?: EntityManager): Promise<number> {
    const em = manager ?? AppDataSource.manager;
    // Si em.query está disponible (PostgreSQL real), usar atomic INSERT ON CONFLICT
    if (em && typeof em.query === 'function') {
      try {
        const schema = process.env.DB_SCHEMA ?? 'boletas';
        const result = await em.query(
          `INSERT INTO "${schema}"."correlativo" ("tipo", "anio", "ultimo")
           VALUES ($1, $2, 1)
           ON CONFLICT ("tipo", "anio")
           DO UPDATE SET "ultimo" = "${schema}"."correlativo"."ultimo" + 1
           RETURNING "ultimo"`,
          [tipo, anio],
        );
        if (result && result.length > 0) {
          return Number(result[0].ultimo);
        }
      } catch {
        // Fallback a repositorio ORM en caso de mocks o SQLite en tests
      }
    }

    const repository = manager ? manager.getRepository(Correlativo) : this.repo;
    let correlativo = await repository.findOneBy({ tipo, anio });

    if (!correlativo) {
      correlativo = Object.assign(new Correlativo(), { tipo, anio, ultimo: 1 });
    } else {
      correlativo.ultimo += 1;
    }

    await repository.save(correlativo);
    return correlativo.ultimo;
  }
}
