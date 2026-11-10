import { AppDataSource } from '../data-source';
import { Feriado } from '../entities/feriado.entity';
import { listarFeriados } from '../domain/feriados';

export class FeriadoRepository {
  private readonly repo = AppDataSource.getRepository(Feriado);

  findById(fecha: string) {
    return this.repo.findOneBy({ fecha });
  }

  findAll() {
    return this.repo.find();
  }

  async findByYear(anio: number): Promise<Array<{ fecha: string; descripcion: string }>> {
    const stored = await this.repo
      .createQueryBuilder('feriado')
      .where('feriado.fecha >= :desde AND feriado.fecha < :hasta', {
        desde: `${anio}-01-01`,
        hasta: `${anio + 1}-01-01`,
      })
      .orderBy('feriado.fecha', 'ASC')
      .getMany();
    const calendario = new Map(listarFeriados(anio).map((feriado) => [feriado.fecha, feriado]));
    for (const feriado of stored) calendario.set(feriado.fecha, feriado);
    return [...calendario.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  save(entity: Feriado) {
    return this.repo.save(entity);
  }
}
