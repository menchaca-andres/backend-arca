import { AppError, EstadoFuncionario, MotivoAsignacion } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Funcionario } from '../entities/funcionario.entity';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';
import { FuncionarioRepository } from '../repositories/funcionario.repository';
import { CargoRepository } from '../repositories/cargo.repository';
import type { RegistrarFuncionarioInput } from '../schemas/funcionario.schema';
import type { EntityManager } from 'typeorm';

export interface FichaFuncionarioResponse {
  id: string;
  ci: string;
  ciExpedido: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: string;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  fechaIngreso: string;
  diasPrueba: number;
  estado: EstadoFuncionario;
  fechaRatificacion: string | null;
  fechaBaja: string | null;
  asignacionVigente: {
    id: string;
    cargoId: string;
    cargoNombre: string;
    areaId: string;
    areaNombre: string;
    remuneracion: number;
    vigenteDesde: string;
    vigenteHasta: string | null;
    motivo: MotivoAsignacion;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FuncionarioResumen {
  id: string;
  ci: string;
  ciExpedido: string;
  nombreCompleto: string;
  estado: EstadoFuncionario;
}

export function validarEdadMinima(fechaNacimiento: string, fechaIngreso: string): boolean {
  const [nacY, nacM, nacD] = fechaNacimiento.split('-').map(Number);
  const [ingY, ingM, ingD] = fechaIngreso.split('-').map(Number);

  let anios = ingY - nacY;
  if (ingM < nacM || (ingM === nacM && ingD < nacD)) {
    anios--;
  }

  return anios >= 18;
}

export class FuncionarioService {
  constructor(
    private readonly funcionarioRepo: FuncionarioRepository = new FuncionarioRepository(),
    private readonly cargoRepo: CargoRepository = new CargoRepository(),
    private readonly runTransaction: <T>(runInTransaction: (entityManager: EntityManager) => Promise<T>) => Promise<T> = (fn) =>
      AppDataSource.transaction(fn),
  ) {}

  async registrar(
    input: RegistrarFuncionarioInput,
    userId: string,
  ): Promise<FichaFuncionarioResponse> {
    // CA-02: El CI es único. Si ya existe, se rechaza con mensaje explícito
    const ciExistente = await this.funcionarioRepo.findByCi(input.ci);
    if (ciExistente) {
      throw AppError.conflict('Ya existe un funcionario con este CI');
    }

    // CA-03: El funcionario debe tener al menos 18 años a la fecha de ingreso
    if (!validarEdadMinima(input.fechaNacimiento, input.fechaIngreso)) {
      throw AppError.badRequest('El funcionario debe tener al menos 18 años a la fecha de ingreso');
    }

    // CA-04: Buscar cargo y validar banda salarial
    const cargo = await this.cargoRepo.findById(input.cargoId);
    if (!cargo || !cargo.activo) {
      throw AppError.notFound('El cargo especificado no existe o está inactivo');
    }

    if (input.remuneracion < cargo.salarioMin || input.remuneracion > cargo.salarioMax) {
      throw AppError.badRequest(
        `La remuneración (Bs. ${input.remuneracion}) debe estar dentro de la banda salarial del cargo (Bs. ${cargo.salarioMin} a Bs. ${cargo.salarioMax})`,
      );
    }

    // CA-05: Los días de prueba valen 90 por defecto y no pueden pasar de 90
    const diasPrueba = input.diasPrueba ?? 90;
    if (diasPrueba < 1 || diasPrueba > 90) {
      throw AppError.badRequest('Los días de prueba deben estar entre 1 y 90');
    }

    // CA-06 y CA-07: Creación en una sola transacción atómica (todo o nada)
    return this.runTransaction(async (manager) => {
      // 1. Crear Funcionario en estado EN_PRUEBA
      const nuevoFuncionario = manager.create(Funcionario, {
        ci: input.ci.trim(),
        ciExpedido: input.ciExpedido,
        nombres: input.nombres.trim(),
        apellidos: input.apellidos.trim(),
        fechaNacimiento: input.fechaNacimiento,
        sexo: input.sexo,
        correo: input.correo ? input.correo.trim().toLowerCase() : null,
        telefono: input.telefono ? input.telefono.trim() : null,
        direccion: input.direccion ? input.direccion.trim() : null,
        fechaIngreso: input.fechaIngreso,
        diasPrueba,
        estado: EstadoFuncionario.EN_PRUEBA,
      });

      const funcionarioGuardado = await manager.save(Funcionario, nuevoFuncionario);

      // 2. Crear primera asignación laboral vigente
      const nuevaAsignacion = manager.create(AsignacionLaboral, {
        funcionarioId: funcionarioGuardado.id,
        cargoId: cargo.id,
        remuneracion: input.remuneracion,
        vigenteDesde: input.fechaIngreso,
        vigenteHasta: null,
        motivo: MotivoAsignacion.INGRESO,
        registradoPor: userId,
      });

      const asignacionGuardada = await manager.save(AsignacionLaboral, nuevaAsignacion);

      // CA-08: Devolver la ficha del nuevo funcionario
      return {
        id: funcionarioGuardado.id,
        ci: funcionarioGuardado.ci,
        ciExpedido: funcionarioGuardado.ciExpedido,
        nombres: funcionarioGuardado.nombres,
        apellidos: funcionarioGuardado.apellidos,
        fechaNacimiento: funcionarioGuardado.fechaNacimiento,
        sexo: funcionarioGuardado.sexo,
        correo: funcionarioGuardado.correo,
        telefono: funcionarioGuardado.telefono,
        direccion: funcionarioGuardado.direccion,
        fechaIngreso: funcionarioGuardado.fechaIngreso,
        diasPrueba: funcionarioGuardado.diasPrueba,
        estado: funcionarioGuardado.estado,
        fechaRatificacion: funcionarioGuardado.fechaRatificacion,
        fechaBaja: funcionarioGuardado.fechaBaja,
        asignacionVigente: {
          id: asignacionGuardada.id,
          cargoId: cargo.id,
          cargoNombre: cargo.nombre,
          areaId: cargo.area?.id ?? cargo.areaId,
          areaNombre: cargo.area?.nombre ?? '',
          remuneracion: asignacionGuardada.remuneracion,
          vigenteDesde: asignacionGuardada.vigenteDesde,
          vigenteHasta: null,
          motivo: asignacionGuardada.motivo,
        },
        createdAt: funcionarioGuardado.createdAt,
        updatedAt: funcionarioGuardado.updatedAt,
      };
    });
  }

  async obtenerFicha(id: string): Promise<FichaFuncionarioResponse> {
    const data = await this.funcionarioRepo.findWithAsignacionVigente(id);
    if (!data) {
      throw AppError.notFound('Funcionario no encontrado');
    }

    const { funcionario, asignacionVigente } = data;
    return {
      id: funcionario.id,
      ci: funcionario.ci,
      ciExpedido: funcionario.ciExpedido,
      nombres: funcionario.nombres,
      apellidos: funcionario.apellidos,
      fechaNacimiento: funcionario.fechaNacimiento,
      sexo: funcionario.sexo,
      correo: funcionario.correo,
      telefono: funcionario.telefono,
      direccion: funcionario.direccion,
      fechaIngreso: funcionario.fechaIngreso,
      diasPrueba: funcionario.diasPrueba,
      estado: funcionario.estado,
      fechaRatificacion: funcionario.fechaRatificacion,
      fechaBaja: funcionario.fechaBaja,
      asignacionVigente: asignacionVigente
        ? {
            id: asignacionVigente.id,
            cargoId: asignacionVigente.cargoId,
            cargoNombre: asignacionVigente.cargo?.nombre ?? '',
            areaId: asignacionVigente.cargo?.area?.id ?? asignacionVigente.cargo?.areaId,
            areaNombre: asignacionVigente.cargo?.area?.nombre ?? '',
            remuneracion: asignacionVigente.remuneracion,
            vigenteDesde: asignacionVigente.vigenteDesde,
            vigenteHasta: asignacionVigente.vigenteHasta,
            motivo: asignacionVigente.motivo,
          }
        : null,
      createdAt: funcionario.createdAt,
      updatedAt: funcionario.updatedAt,
    };
  }

  async listarResumen(): Promise<FuncionarioResumen[]> {
    const funcionarios = await this.funcionarioRepo.findAll();
    return funcionarios
      .filter((f) => f.estado !== EstadoFuncionario.BAJA)
      .map((f) => ({
        id: f.id,
        ci: f.ci,
        ciExpedido: f.ciExpedido,
        nombreCompleto: `${f.nombres} ${f.apellidos}`,
        estado: f.estado,
      }));
  }
}

