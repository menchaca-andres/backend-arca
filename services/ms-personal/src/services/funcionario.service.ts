import { AppError, EstadoFuncionario, MotivoAsignacion, MotivoBaja, type FuncionarioContrato } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Funcionario } from '../entities/funcionario.entity';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';
import { FuncionarioRepository } from '../repositories/funcionario.repository';
import { CargoRepository } from '../repositories/cargo.repository';
import { AuthClient, type IAuthClient } from '../clients/auth.client';
import type {
  RegistrarFuncionarioInput,
  RatificarFuncionarioInput,
  DarDeBajaInput,
} from '../schemas/funcionario.schema';
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
  motivoBaja: MotivoBaja | null;
  detalleBaja: string | null;
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
  fechaIngreso?: string;
  diasPrueba?: number;
}

export interface PruebaPorVencerItem extends FuncionarioResumen {
  fechaIngreso: string;
  diasPrueba: number;
  fechaFinPrueba: string;
  diasRestantes: number;
  listoParaRatificar: boolean;
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

export function calcularFinPrueba(fechaIngreso: string, diasPrueba: number): string {
  const [y, m, d] = fechaIngreso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + diasPrueba);
  return date.toISOString().split('T')[0];
}

export function diasDiferencia(fechaA: string, fechaB: string): number {
  const [yA, mA, dA] = fechaA.split('-').map(Number);
  const [yB, mB, dB] = fechaB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utcA - utcB) / msPerDay);
}

export class FuncionarioService {
  constructor(
    private readonly funcionarioRepo: FuncionarioRepository = new FuncionarioRepository(),
    private readonly cargoRepo: CargoRepository = new CargoRepository(),
    private readonly runTransaction: <T>(
      runInTransaction: (entityManager: EntityManager) => Promise<T>,
    ) => Promise<T> = (fn) => AppDataSource.transaction(fn),
    private readonly authClient: IAuthClient = new AuthClient(),
  ) {}

  async registrar(input: RegistrarFuncionarioInput, userId: string): Promise<FichaFuncionarioResponse> {
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
        motivoBaja: funcionarioGuardado.motivoBaja,
        detalleBaja: funcionarioGuardado.detalleBaja,
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

  // HU-11: Ratificar funcionario
  async ratificar(id: string, input?: RatificarFuncionarioInput, _userId?: string): Promise<FichaFuncionarioResponse> {
    const funcionario = await this.funcionarioRepo.findById(id);
    if (!funcionario) {
      throw AppError.notFound('Funcionario no encontrado');
    }

    // CA-01: Solo se puede ratificar a un funcionario en estado EN_PRUEBA
    if (funcionario.estado !== EstadoFuncionario.EN_PRUEBA) {
      throw AppError.badRequest('Solo se puede ratificar a un funcionario en estado EN_PRUEBA');
    }

    // CA-02: Solo se puede ratificar cuando ya pasaron sus días de prueba desde la fecha de ingreso
    const finPrueba = calcularFinPrueba(funcionario.fechaIngreso, funcionario.diasPrueba);
    const fechaRatificacion = input?.fechaRatificacion ?? new Date().toISOString().split('T')[0];

    if (fechaRatificacion < finPrueba) {
      throw AppError.badRequest(
        `Solo se puede ratificar cuando ya pasaron sus días de prueba (${funcionario.diasPrueba} días desde el ingreso: ${finPrueba})`,
      );
    }

    // CA-03: Al ratificar, el estado pasa a RATIFICADO y se guarda fecha_ratificacion
    return this.runTransaction(async (manager) => {
      funcionario.estado = EstadoFuncionario.RATIFICADO;
      funcionario.fechaRatificacion = fechaRatificacion;

      await manager.save(Funcionario, funcionario);

      return this.obtenerFicha(id);
    });
  }

  // HU-11: CA-04 Aviso con funcionarios cuyo periodo de prueba termina en los próximos 7 días
  async obtenerPruebaPorVencer(diasLimite: number = 7, fechaReferencia?: string): Promise<PruebaPorVencerItem[]> {
    const funcionarios = await this.funcionarioRepo.findAll();
    const hoy = fechaReferencia ?? new Date().toISOString().split('T')[0];

    const enPrueba = funcionarios.filter((f) => f.estado === EstadoFuncionario.EN_PRUEBA);

    const resultados: PruebaPorVencerItem[] = [];

    for (const f of enPrueba) {
      const fechaFinPrueba = calcularFinPrueba(f.fechaIngreso, f.diasPrueba);
      const diasRestantes = diasDiferencia(fechaFinPrueba, hoy);

      // Incluye aquellos cuyo periodo termina en los próximos 7 días (o ya concluyó y está listo para ratificar)
      if (diasRestantes <= diasLimite) {
        resultados.push({
          id: f.id,
          ci: f.ci,
          ciExpedido: f.ciExpedido,
          nombreCompleto: `${f.nombres} ${f.apellidos}`,
          estado: f.estado,
          fechaIngreso: f.fechaIngreso,
          diasPrueba: f.diasPrueba,
          fechaFinPrueba,
          diasRestantes,
          listoParaRatificar: diasRestantes <= 0,
        });
      }
    }

    // Ordenar por proximidad al vencimiento
    return resultados.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }

  // HU-12: Dar de baja a un funcionario
  async darDeBaja(id: string, input: DarDeBajaInput, _userId?: string): Promise<FichaFuncionarioResponse> {
    const data = await this.funcionarioRepo.findWithAsignacionVigente(id);
    if (!data) {
      throw AppError.notFound('Funcionario no encontrado');
    }

    const { funcionario, asignacionVigente } = data;

    // CA-02: Es una baja lógica; no se puede dar de baja a alguien ya dado de baja
    if (funcionario.estado === EstadoFuncionario.BAJA) {
      throw AppError.badRequest('El funcionario ya se encuentra dado de baja');
    }

    // CA-04: La fecha de baja no puede ser anterior a la fecha de ingreso
    if (input.fechaBaja < funcionario.fechaIngreso) {
      throw AppError.badRequest('La fecha de baja no puede ser anterior a la fecha de ingreso');
    }

    // CA-01, CA-02, CA-03: Transacción atómica para baja de funcionario y cierre de asignación
    await this.runTransaction(async (manager) => {
      // CA-02: Estado pasa a BAJA, se guarda fecha, motivo y detalle
      funcionario.estado = EstadoFuncionario.BAJA;
      funcionario.fechaBaja = input.fechaBaja;
      funcionario.motivoBaja = input.motivoBaja;
      funcionario.detalleBaja = input.detalleBaja?.trim() || null;

      await manager.save(Funcionario, funcionario);

      // CA-03: La asignación vigente se cierra con vigente_hasta = fecha de baja
      if (asignacionVigente) {
        asignacionVigente.vigenteHasta = input.fechaBaja;
        await manager.save(AsignacionLaboral, asignacionVigente);
      }
    });

    // CA-05: Si el funcionario tiene cuenta de usuario, se desactiva con el endpoint interno de HU-06
    await this.authClient.desactivarUsuarioPorFuncionario(funcionario.id, `Baja de funcionario: ${input.motivoBaja}`);

    return this.obtenerFicha(id);
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
      motivoBaja: funcionario.motivoBaja,
      detalleBaja: funcionario.detalleBaja,
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

  // CA-07: Un funcionario de baja sigue apareciendo en el padrón con el filtro de estado BAJA
  async listarResumen(estado?: string): Promise<FuncionarioResumen[]> {
    const funcionarios = await this.funcionarioRepo.findAll();

    let filtrados = funcionarios;

    if (estado && estado !== 'TODOS') {
      filtrados = funcionarios.filter((f) => f.estado === estado);
    } else if (!estado) {
      // Por defecto, listar activos si no se envía filtro
      filtrados = funcionarios.filter((f) => f.estado !== EstadoFuncionario.BAJA);
    }

    return filtrados.map((f) => ({
      id: f.id,
      ci: f.ci,
      ciExpedido: f.ciExpedido,
      nombreCompleto: `${f.nombres} ${f.apellidos}`,
      estado: f.estado,
      fechaIngreso: f.fechaIngreso,
      diasPrueba: f.diasPrueba,
    }));
  }

  // Soporte para contrato interno GET /internal/funcionarios/:id
  async obtenerContrato(id: string): Promise<FuncionarioContrato | null> {
    const data = await this.funcionarioRepo.findWithAsignacionVigente(id);
    if (!data) return null;

    const { funcionario, asignacionVigente } = data;
    return {
      id: funcionario.id,
      usuarioId: null,
      nombres: funcionario.nombres,
      apellidos: funcionario.apellidos,
      documentoIdentidad: `${funcionario.ci} ${funcionario.ciExpedido}`,
      fechaIngreso: funcionario.fechaIngreso,
      diasPrueba: funcionario.diasPrueba,
      fechaRatificacion: funcionario.fechaRatificacion,
      fechaBaja: funcionario.fechaBaja,
      area: asignacionVigente?.cargo?.area?.nombre ?? 'Sin área',
      cargo: asignacionVigente?.cargo?.nombre ?? 'Sin cargo',
      remuneracion: {
        monto: asignacionVigente?.remuneracion ?? 0,
        moneda: 'BOB',
      },
      estado: funcionario.estado,
    };
  }
}
