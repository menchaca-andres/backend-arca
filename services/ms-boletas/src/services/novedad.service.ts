import { AppError } from '@arca/shared';
import { Novedad } from '../entities/novedad.entity';
import { NovedadRepository } from '../repositories/novedad.repository';
import { ConceptoRepository } from '../repositories/concepto.repository';
import { ListarNovedadesQuery, RegistrarNovedadInput } from '../schemas/novedad.schema';

export class NovedadService {
  constructor(
    private novedadRepo: NovedadRepository = new NovedadRepository(),
    private conceptoRepo: ConceptoRepository = new ConceptoRepository(),
  ) {}

  async listar(query: ListarNovedadesQuery = {}): Promise<Novedad[]> {
    if (query.anio && query.mes) {
      return this.novedadRepo.findByPeriodo(query.anio, query.mes, query.funcionarioId);
    }
    return this.novedadRepo.findAll();
  }

  async obtenerPorId(id: string): Promise<Novedad> {
    const novedad = await this.novedadRepo.findById(id);
    if (!novedad) {
      throw AppError.notFound(`Novedad con ID '${id}' no encontrada`);
    }
    return novedad;
  }

  async registrar(input: RegistrarNovedadInput, registradoPor: string): Promise<Novedad> {
    const concepto = await this.conceptoRepo.findById(input.conceptoId);
    if (!concepto) {
      throw AppError.notFound(`Concepto con ID '${input.conceptoId}' no encontrado`);
    }

    if (!concepto.activo) {
      throw AppError.badRequest('No se pueden registrar novedades para un concepto inactivo');
    }

    if (concepto.automatico) {
      throw AppError.badRequest(
        'Las novedades solo pueden registrarse sobre conceptos no automáticos (ej. bonos extraordinarios o anticipos)',
      );
    }

    if (concepto.esSistema) {
      throw AppError.badRequest('No se pueden registrar novedades sobre conceptos del sistema');
    }

    // Si ya existe una novedad para el mismo periodo, funcionario y concepto, se actualiza
    let novedad = await this.novedadRepo.findByPeriodoFuncionarioAndConcepto(
      input.anio,
      input.mes,
      input.funcionarioId,
      input.conceptoId,
    );

    if (novedad) {
      novedad.monto = input.monto;
      novedad.descripcion = input.descripcion ?? null;
      novedad.registradoPor = registradoPor;
    } else {
      novedad = new Novedad();
      novedad.anio = input.anio;
      novedad.mes = input.mes;
      novedad.funcionarioId = input.funcionarioId;
      novedad.conceptoId = input.conceptoId;
      novedad.monto = input.monto;
      novedad.descripcion = input.descripcion ?? null;
      novedad.registradoPor = registradoPor;
    }

    const guardada = await this.novedadRepo.save(novedad);
    return this.obtenerPorId(guardada.id);
  }

  async eliminar(id: string): Promise<void> {
    const novedad = await this.obtenerPorId(id);
    await this.novedadRepo.delete(novedad.id);
  }
}

