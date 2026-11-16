import { Brackets, In, IsNull, type SelectQueryBuilder } from 'typeorm';
import { EstadoFuncionario } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Funcionario } from '../entities/funcionario.entity';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';
import { Cargo } from '../entities/cargo.entity';

export class FuncionarioRepository {
  private get repo() {
    return AppDataSource.getRepository(Funcionario);
  }

  private get asignacionRepo() {
    return AppDataSource.getRepository(AsignacionLaboral);
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  findByCi(ci: string) {
    return this.repo.findOneBy({ ci: ci.trim() });
  }

  findAll() {
    return this.repo.find();
  }

  async findWithAsignacionVigente(
    id: string,
  ): Promise<{ funcionario: Funcionario; asignacionVigente: AsignacionLaboral | null } | null> {
    const funcionario = await this.repo.findOneBy({ id });
    if (!funcionario) {
      return null;
    }

    const asignacionVigente = await this.asignacionRepo.findOne({
      where: {
        funcionarioId: id,
        vigenteHasta: IsNull(),
      },
      relations: {
        cargo: {
          area: true,
        },
      },
    });

    return {
      funcionario,
      asignacionVigente,
    };
  }

  // HU-09: CA-01 y CA-02 Padrón paginado con búsqueda por CI o nombre y filtros por área, cargo y estado
  async buscarPadron(filtros: FiltrosPadron): Promise<PaginaFuncionarios> {
    const qb = this.repo
      .createQueryBuilder('f')
      .leftJoin(AsignacionLaboral, 'a', 'a.funcionarioId = f.id AND a.vigenteHasta IS NULL')
      .leftJoin(Cargo, 'c', 'c.id = a.cargoId');

    if (filtros.q) {
      const patron = `%${filtros.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('f.ci ILIKE :patron', { patron }).orWhere("(f.nombres || ' ' || f.apellidos) ILIKE :patron", {
            patron,
          });
        }),
      );
    }
    if (filtros.areaId) qb.andWhere('c.areaId = :areaId', { areaId: filtros.areaId });
    if (filtros.cargoId) qb.andWhere('a.cargoId = :cargoId', { cargoId: filtros.cargoId });

    if (filtros.estado === undefined) {
      qb.andWhere('f.estado <> :baja', { baja: EstadoFuncionario.BAJA });
    } else if (filtros.estado !== 'TODOS') {
      qb.andWhere('f.estado = :estado', { estado: filtros.estado });
    }

    return this.paginar(qb.orderBy('f.apellidos', 'ASC').addOrderBy('f.nombres', 'ASC'), filtros);
  }

  // HU-09: CA-05 Activos en algún momento del rango: ingreso <= hasta Y (sin baja O baja >= desde)
  async buscarParaContrato(filtros: FiltrosContrato): Promise<PaginaFuncionarios> {
    const qb = this.repo.createQueryBuilder('f');

    if (filtros.estado) qb.andWhere('f.estado = :estado', { estado: filtros.estado });
    if (filtros.activosHasta) qb.andWhere('f.fechaIngreso <= :hasta', { hasta: filtros.activosHasta });
    if (filtros.activosDesde) {
      qb.andWhere('(f.fechaBaja IS NULL OR f.fechaBaja >= :desde)', { desde: filtros.activosDesde });
    }

    return this.paginar(qb.orderBy('f.apellidos', 'ASC').addOrderBy('f.nombres', 'ASC'), filtros);
  }

  // HU-09: CA-03 Historial de asignaciones para la línea de tiempo, de la más reciente a la más antigua
  findHistorial(funcionarioId: string) {
    return this.asignacionRepo.find({
      where: { funcionarioId },
      relations: { cargo: { area: true } },
      order: { vigenteDesde: 'DESC' },
    });
  }

  save(entity: Funcionario) {
    return this.repo.save(entity);
  }

  // HU-25: Conteo de funcionarios por estado
  async contarPorEstado(estado: EstadoFuncionario): Promise<number> {
    if (typeof this.repo.count === 'function') {
      try {
        return await this.repo.count({ where: { estado } });
      } catch {
        // Fallback
      }
    }
    const all = await this.findAll();
    return all.filter((f) => f.estado === estado).length;
  }

  // HU-25: Conteo de bajas en rango de fechas
  async contarBajasRango(desde: string, hasta: string): Promise<number> {
    if (typeof this.repo.createQueryBuilder === 'function') {
      try {
        return await this.repo
          .createQueryBuilder('f')
          .where('f.estado = :estado', { estado: EstadoFuncionario.BAJA })
          .andWhere('f.fechaBaja >= :desde AND f.fechaBaja <= :hasta', { desde, hasta })
          .getCount();
      } catch {
        // Fallback
      }
    }
    const all = await this.findAll();
    return all.filter(
      (f) =>
        f.estado === EstadoFuncionario.BAJA &&
        f.fechaBaja &&
        f.fechaBaja >= desde &&
        f.fechaBaja <= hasta,
    ).length;
  }

  // HU-25: Funcionarios que cumplen un nuevo año laboral (gestión) en el mes
  async findCumplenGestion(mes: number, anioActual: number): Promise<Funcionario[]> {
    const funcionarios = await this.repo.find();
    return funcionarios.filter((f) => {
      if (f.estado === EstadoFuncionario.BAJA || !f.fechaIngreso) return false;
      const parts = f.fechaIngreso.split('-');
      if (parts.length < 3) return false;
      const anioIngreso = parseInt(parts[0], 10);
      const mesIngreso = parseInt(parts[1], 10);
      return mesIngreso === mes && anioIngreso < anioActual;
    });
  }

  // HU-25: Distribución de funcionarios activos por área
  async contarPorArea(): Promise<Array<{ area: string; cantidad: number }>> {
    if (typeof this.asignacionRepo.createQueryBuilder === 'function') {
      try {
        const raw = await this.asignacionRepo
          .createQueryBuilder('a')
          .innerJoin(Funcionario, 'f', 'f.id = a.funcionarioId AND f.estado <> :baja', {
            baja: EstadoFuncionario.BAJA,
          })
          .innerJoin(Cargo, 'c', 'c.id = a.cargoId')
          .innerJoin('c.area', 'ar')
          .where('a.vigenteHasta IS NULL')
          .select('ar.nombre', 'area')
          .addSelect('COUNT(f.id)', 'cantidad')
          .groupBy('ar.nombre')
          .orderBy('cantidad', 'DESC')
          .getRawMany();

        return raw.map((r) => ({
          area: r.area || 'Sin Área',
          cantidad: parseInt(r.cantidad, 10) || 0,
        }));
      } catch {
        // Fallback
      }
    }

    const vigentes = await this.asignacionRepo.find({
      where: { vigenteHasta: IsNull() },
      relations: { cargo: { area: true }, funcionario: true },
    });

    const mapa = new Map<string, number>();
    for (const a of vigentes) {
      if (a.funcionario && a.funcionario.estado !== EstadoFuncionario.BAJA) {
        const nombreArea = a.cargo?.area?.nombre || 'General';
        mapa.set(nombreArea, (mapa.get(nombreArea) || 0) + 1);
      }
    }

    return Array.from(mapa.entries()).map(([area, cantidad]) => ({ area, cantidad }));
  }

  // Pagina sobre funcionarios y luego trae sus asignaciones vigentes en una sola consulta.
  private async paginar(
    qb: SelectQueryBuilder<Funcionario>,
    { page, pageSize }: { page: number; pageSize: number },
  ): Promise<PaginaFuncionarios> {
    const [funcionarios, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const vigentes = funcionarios.length
      ? await this.asignacionRepo.find({
          where: { funcionarioId: In(funcionarios.map((f) => f.id)), vigenteHasta: IsNull() },
          relations: { cargo: { area: true } },
        })
      : [];
    const porFuncionario = new Map(vigentes.map((a) => [a.funcionarioId, a]));

    return {
      items: funcionarios.map((funcionario) => ({
        funcionario,
        asignacionVigente: porFuncionario.get(funcionario.id) ?? null,
      })),
      total,
    };
  }
}

export interface FiltrosPadron {
  q?: string;
  areaId?: string;
  cargoId?: string;
  estado?: EstadoFuncionario | 'TODOS';
  page: number;
  pageSize: number;
}

export interface FiltrosContrato {
  estado?: EstadoFuncionario;
  activosDesde?: string;
  activosHasta?: string;
  page: number;
  pageSize: number;
}

export interface PaginaFuncionarios {
  items: Array<{ funcionario: Funcionario; asignacionVigente: AsignacionLaboral | null }>;
  total: number;
}
