import { AppError, EstadoFuncionario } from '@arca/shared';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';
import { AsignacionLaboralRepository } from '../repositories/asignacion-laboral.repository';
import { CargoRepository } from '../repositories/cargo.repository';
import { FuncionarioRepository } from '../repositories/funcionario.repository';
import type { CambiarAsignacionInput } from '../schemas/funcionario.schema';
import { FuncionarioService, type FichaFuncionarioResponse } from './funcionario.service';

export function diaAnterior(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  return date.toISOString().split('T')[0];
}

export class AsignacionService {
  constructor(
    private readonly funcionarioRepo: FuncionarioRepository = new FuncionarioRepository(),
    private readonly cargoRepo: CargoRepository = new CargoRepository(),
    private readonly asignacionRepo: AsignacionLaboralRepository = new AsignacionLaboralRepository(),
    private readonly funcionarioService: FuncionarioService = new FuncionarioService(),
  ) {}

  // HU-10: Cambio de área, cargo o remuneración guardando el historial
  async cambiar(
    funcionarioId: string,
    input: CambiarAsignacionInput,
    userId: string,
  ): Promise<FichaFuncionarioResponse> {
    const data = await this.funcionarioRepo.findWithAsignacionVigente(funcionarioId);
    if (!data) {
      throw AppError.notFound('Funcionario no encontrado');
    }
    const { funcionario, asignacionVigente: actual } = data;

    // CA-05: No se puede modificar a un funcionario de baja
    if (funcionario.estado === EstadoFuncionario.BAJA) {
      throw AppError.badRequest('No se puede modificar a un funcionario dado de baja');
    }
    if (!actual) {
      throw AppError.conflict('El funcionario no tiene una asignación vigente');
    }

    // CA-03: La nueva vigencia debe ser posterior a la actual (el mismo día no basta)
    if (input.vigenteDesde <= actual.vigenteDesde) {
      throw AppError.badRequest(
        `La nueva asignación debe regir después del ${actual.vigenteDesde}, fecha desde la que rige la actual`,
      );
    }

    const cargoId = input.cargoId ?? actual.cargoId;
    const remuneracion = input.remuneracion ?? actual.remuneracion;
    if (cargoId === actual.cargoId && remuneracion === actual.remuneracion) {
      throw AppError.badRequest('El cambio no modifica el cargo ni la remuneración actuales');
    }

    const cargo = await this.cargoRepo.findById(cargoId);
    if (!cargo || !cargo.activo) {
      throw AppError.notFound('El cargo especificado no existe o está inactivo');
    }

    // CA-04: La remuneración resultante debe estar en la banda del cargo
    if (remuneracion < cargo.salarioMin || remuneracion > cargo.salarioMax) {
      throw AppError.badRequest(
        `La remuneración (Bs. ${remuneracion}) debe estar dentro de la banda salarial del cargo (Bs. ${cargo.salarioMin} a Bs. ${cargo.salarioMax})`,
      );
    }

    // CA-02 y CA-06: Se cierra la actual el día anterior y se crea la nueva vigente
    const nueva = Object.assign(new AsignacionLaboral(), {
      funcionarioId,
      cargoId,
      remuneracion,
      vigenteDesde: input.vigenteDesde,
      vigenteHasta: null,
      motivo: input.motivo,
      registradoPor: userId,
    });
    await this.asignacionRepo.reemplazarVigente(actual.id, diaAnterior(input.vigenteDesde), nueva);

    return this.funcionarioService.obtenerFicha(funcionarioId);
  }
}
