import { AppError } from '@arca/shared';
import { Concepto } from '../entities/concepto.entity';
import { ConceptoRepository } from '../repositories/concepto.repository';
import { BoletaDetalleRepository } from '../repositories/boleta-detalle.repository';
import { ActualizarConceptoInput, CrearConceptoInput } from '../schemas/concepto.schema';

export class ConceptoService {
  constructor(
    private conceptoRepo: ConceptoRepository = new ConceptoRepository(),
    private boletaDetalleRepo: BoletaDetalleRepository = new BoletaDetalleRepository(),
  ) {}

  async listar(options?: { activo?: boolean }): Promise<Concepto[]> {
    return this.conceptoRepo.findAll(options);
  }

  async obtenerPorId(id: string): Promise<Concepto> {
    const concepto = await this.conceptoRepo.findById(id);
    if (!concepto) {
      throw AppError.notFound(`Concepto con ID '${id}' no encontrado`);
    }
    return concepto;
  }

  async crear(input: CrearConceptoInput): Promise<Concepto> {
    const existente = await this.conceptoRepo.findByCodigo(input.codigo);
    if (existente) {
      throw AppError.conflict(`El concepto con código '${input.codigo}' ya existe`);
    }

    const concepto = new Concepto();
    concepto.codigo = input.codigo;
    concepto.nombre = input.nombre;
    concepto.tipo = input.tipo;
    concepto.formaCalculo = input.formaCalculo;
    concepto.valor = input.valor ?? null;
    concepto.base = input.base ?? null;
    concepto.automatico = input.automatico;
    concepto.esSistema = false;
    concepto.orden = input.orden;
    concepto.activo = true;

    return this.conceptoRepo.save(concepto);
  }

  async actualizar(id: string, input: ActualizarConceptoInput): Promise<Concepto> {
    const concepto = await this.obtenerPorId(id);

    if (concepto.esSistema) {
      if (input.activo === false) {
        throw AppError.badRequest('No se puede desactivar un concepto del sistema');
      }
      if (input.formaCalculo !== undefined && input.formaCalculo !== concepto.formaCalculo) {
        throw AppError.badRequest('No se puede cambiar la forma de cálculo de un concepto del sistema');
      }
    }

    if (input.nombre !== undefined) concepto.nombre = input.nombre;
    if (input.formaCalculo !== undefined) concepto.formaCalculo = input.formaCalculo;
    if (input.valor !== undefined) concepto.valor = input.valor;
    if (input.base !== undefined) concepto.base = input.base;
    if (input.automatico !== undefined) concepto.automatico = input.automatico;
    if (input.orden !== undefined) concepto.orden = input.orden;
    if (input.activo !== undefined) concepto.activo = input.activo;

    return this.conceptoRepo.save(concepto);
  }

  async eliminar(id: string): Promise<{ eliminado: boolean; desactivado: boolean; mensaje: string }> {
    const concepto = await this.obtenerPorId(id);

    if (concepto.esSistema) {
      throw AppError.badRequest('Los conceptos del sistema no se pueden eliminar ni desactivar');
    }

    const tieneBoletas = await this.boletaDetalleRepo.hasBoletasWithConcepto(id);
    if (tieneBoletas) {
      concepto.activo = false;
      await this.conceptoRepo.save(concepto);
      return {
        eliminado: false,
        desactivado: true,
        mensaje:
          'El concepto tiene boletas emitidas asociadas; fue desactivado en lugar de eliminado para preservar el histórico',
      };
    }

    await this.conceptoRepo.remove(concepto);
    return {
      eliminado: true,
      desactivado: false,
      mensaje: 'Concepto eliminado exitosamente',
    };
  }
}
