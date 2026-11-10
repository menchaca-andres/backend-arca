import { AppError, BaseCalculo, EstadoPeriodo, FormaCalculo, TipoConcepto } from '@arca/shared';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Concepto } from '../entities/concepto.entity';
import { Novedad } from '../entities/novedad.entity';
import { BoletaDetalle } from '../entities/boleta-detalle.entity';
import { Periodo } from '../entities/periodo.entity';
import type {
  CrearConceptoInput,
  CrearNovedadInput,
  EditarConceptoInput,
  FiltroNovedades,
} from '../schemas/configuracion.schema';

function datosConcepto(input: EditarConceptoInput) {
  return {
    ...input,
    tipo: input.tipo as TipoConcepto,
    formaCalculo: input.formaCalculo as FormaCalculo,
    base: input.base as BaseCalculo | null,
  };
}
function traducir(error: unknown): never {
  const code = (error as { driverError?: { code?: string } })?.driverError?.code;
  if (code === '23505') throw AppError.conflict('Ya existe ese código o esa novedad para el funcionario y período');
  if (code === '23503') throw AppError.conflict('El concepto tiene referencias; puede desactivarlo');
  throw error;
}
async function bloquearConcepto(manager: EntityManager, id: string) {
  const concepto = await manager.findOne(Concepto, { where: { id }, lock: { mode: 'pessimistic_write' } });
  if (!concepto) throw AppError.notFound('Concepto no encontrado');
  return concepto;
}
function editable(concepto: Concepto) {
  if (concepto.esSistema || concepto.formaCalculo === FormaCalculo.SISTEMA) {
    throw AppError.forbidden('El Haber básico de sistema no se puede modificar, desactivar ni borrar');
  }
}

export class ConfiguracionRepository {
  listarConceptos(incluirInactivos: boolean) {
    return AppDataSource.getRepository(Concepto).find({
      where: incluirInactivos ? {} : { activo: true },
      order: { orden: 'ASC', codigo: 'ASC' },
    });
  }
  async crearConcepto(input: CrearConceptoInput) {
    try {
      const repo = AppDataSource.getRepository(Concepto);
      const { codigo, ...datos } = input;
      return await repo.save(repo.create({ codigo, ...datosConcepto(datos), esSistema: false, activo: true }));
    } catch (error) {
      return traducir(error);
    }
  }
  actualizarConcepto(id: string, input: EditarConceptoInput) {
    return AppDataSource.transaction(async (manager) => {
      const concepto = await bloquearConcepto(manager, id);
      editable(concepto);
      if (input.automatico && !concepto.automatico && (await manager.existsBy(Novedad, { conceptoId: id }))) {
        throw AppError.conflict('Un concepto con novedades no puede convertirse en automático');
      }
      Object.assign(concepto, datosConcepto(input));
      // Nunca modificar boleta_detalle: conserva los valores históricos emitidos.
      return manager.save(Concepto, concepto);
    });
  }
  cambiarEstado(id: string, activo: boolean) {
    return AppDataSource.transaction(async (manager) => {
      const concepto = await bloquearConcepto(manager, id);
      editable(concepto);
      concepto.activo = activo;
      return manager.save(Concepto, concepto);
    });
  }
  async eliminarConcepto(id: string) {
    try {
      await AppDataSource.transaction(async (manager) => {
        const concepto = await bloquearConcepto(manager, id);
        editable(concepto);
        if (
          (await manager.existsBy(BoletaDetalle, { conceptoId: id })) ||
          (await manager.existsBy(Novedad, { conceptoId: id }))
        ) {
          throw AppError.conflict('El concepto tiene referencias en boletas o novedades; puede desactivarlo');
        }
        await manager.remove(Concepto, concepto);
      });
    } catch (error) {
      traducir(error);
    }
  }
  listarNovedades(filtro: FiltroNovedades) {
    return AppDataSource.getRepository(Novedad).find({
      where: filtro,
      relations: { concepto: true },
      order: { createdAt: 'DESC' },
    });
  }
  async crearNovedad(input: CrearNovedadInput, autor: string) {
    try {
      return await AppDataSource.transaction(async (manager) => {
        // Solo se abre el registro del período en BORRADOR; no se calcula ni se emite planilla.
        await manager
          .createQueryBuilder()
          .insert()
          .into(Periodo)
          .values({ anio: input.anio, mes: input.mes })
          .orIgnore()
          .execute();
        const periodo = await manager.findOneOrFail(Periodo, {
          where: { anio: input.anio, mes: input.mes },
          lock: { mode: 'pessimistic_write' },
        });
        if (periodo.estado === EstadoPeriodo.EMITIDO)
          throw AppError.conflict('El período está emitido y no admite novedades');
        const concepto = await bloquearConcepto(manager, input.conceptoId);
        if (!concepto.activo || concepto.automatico || concepto.esSistema) {
          throw AppError.conflict('Seleccione un concepto activo, no automático y que no sea de sistema');
        }
        return manager.save(
          Novedad,
          manager.create(Novedad, {
            ...input,
            descripcion: input.descripcion || null,
            registradoPor: autor,
          }),
        );
      });
    } catch (error) {
      return traducir(error);
    }
  }
  async asegurarSemillas() {
    const repo = AppDataSource.getRepository(Concepto);
    // DO NOTHING ante código existente: no sobrescribir políticas editadas por RRHH.
    await repo
      .createQueryBuilder()
      .insert()
      .values([
        {
          codigo: 'HABER_BASICO',
          nombre: 'Haber básico',
          tipo: TipoConcepto.HABER,
          formaCalculo: FormaCalculo.SISTEMA,
          valor: null,
          base: null,
          automatico: true,
          esSistema: true,
          orden: 0,
          activo: true,
        },
        {
          codigo: 'APORTE_LABORAL',
          nombre: 'Aporte laboral',
          tipo: TipoConcepto.DESCUENTO,
          formaCalculo: FormaCalculo.PORCENTAJE,
          valor: 12.71,
          base: BaseCalculo.TOTAL_GANADO,
          automatico: true,
          esSistema: false,
          orden: 100,
          activo: true,
        },
      ])
      .orIgnore()
      .execute();
  }
}
