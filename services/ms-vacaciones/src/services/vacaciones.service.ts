import { AppError, EstadoSolicitud } from '@arca/shared';
import { HttpPersonalClient, type PersonalClient } from '../clients/personal.client';
import {
  calcularPeriodoVacacional,
  evaluarElegibilidad,
  type DatosFuncionarioVacaciones,
} from '../domain/calculo-vacaciones';
import { contarDiasHabiles } from '../domain/feriados';
import { SolicitudVacacion } from '../entities/solicitud-vacacion.entity';
import { FeriadoRepository } from '../repositories/feriado.repository';
import { SolicitudVacacionRepository } from '../repositories/solicitud-vacacion.repository';
import type { SolicitudVacacionInput } from '../schemas/vacaciones.schema';

interface SolicitudRepository {
  findAll(): Promise<SolicitudVacacion[]>;
  findByFuncionario(id: string): Promise<SolicitudVacacion[]>;
  findOverlapping(id: string, desde: string, hasta: string): Promise<SolicitudVacacion | null>;
  save(solicitud: SolicitudVacacion): Promise<SolicitudVacacion>;
}

interface FeriadoRepositoryContract {
  findByYear(anio: number): Promise<Array<{ fecha: string; descripcion: string }>>;
}

function hoyIso(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? '';
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

export class VacacionesService {
  constructor(
    private readonly solicitudRepo: SolicitudRepository = new SolicitudVacacionRepository(),
    private readonly personalClient: PersonalClient = new HttpPersonalClient(),
    private readonly feriadoRepo: FeriadoRepositoryContract = new FeriadoRepository(),
    private readonly clock: () => string = hoyIso,
  ) {}

  async obtenerSaldo(funcionarioId: string) {
    const funcionario = await this.obtenerFuncionario(funcionarioId);
    const hoy = this.clock();
    const periodo = calcularPeriodoVacacional(funcionario.fechaIngreso, hoy);
    const elegibilidad = evaluarElegibilidad(funcionario, hoy);
    const solicitudes = await this.solicitudRepo.findByFuncionario(funcionarioId);
    const diasUsados = solicitudes
      .filter((solicitud) => solicitud.estado === EstadoSolicitud.APROBADA)
      .reduce((total, solicitud) => total + solicitud.diasHabiles, 0);
    const diasReservados = solicitudes
      .filter((solicitud) => solicitud.estado === EstadoSolicitud.PENDIENTE)
      .reduce((total, solicitud) => total + solicitud.diasHabiles, 0);

    return {
      funcionarioId,
      funcionario: funcionario.nombreCompleto,
      elegible: elegibilidad.elegible,
      motivo: elegibilidad.motivo,
      gestiones: periodo.gestiones,
      diasGanados: periodo.diasGanados,
      diasUsados,
      diasReservados,
      diasDisponibles: periodo.diasGanados - diasUsados - diasReservados,
      fechaProximaGestion: periodo.fechaProximaGestion,
    };
  }

  contarDiasHabiles(desde: string, hasta: string): number {
    return contarDiasHabiles(desde, hasta);
  }

  listarFeriados(anio: number) {
    return this.feriadoRepo.findByYear(anio);
  }

  async listarSolicitudes(funcionarioId?: string): Promise<SolicitudVacacion[]> {
    return funcionarioId ? this.solicitudRepo.findByFuncionario(funcionarioId) : this.solicitudRepo.findAll();
  }

  async crearSolicitud(
    input: SolicitudVacacionInput,
    funcionarioId: string,
    registradoPor: string,
  ): Promise<SolicitudVacacion> {
    const hoy = this.clock();
    if (input.fechaInicio <= hoy) {
      throw AppError.badRequest('La fecha de inicio debe ser futura');
    }

    const diasHabiles = contarDiasHabiles(input.fechaInicio, input.fechaFin);
    if (diasHabiles < 1) {
      throw AppError.badRequest('El rango debe contener al menos un día hábil');
    }

    const funcionario = await this.obtenerFuncionario(funcionarioId);
    const elegibilidad = evaluarElegibilidad(funcionario, hoy);
    if (!elegibilidad.elegible) {
      throw AppError.badRequest(`El funcionario no es elegible: ${elegibilidad.motivo}`, {
        motivo: elegibilidad.motivo,
      });
    }

    const saldo = await this.obtenerSaldo(funcionarioId);
    if (diasHabiles > saldo.diasDisponibles) {
      throw AppError.badRequest('Los días hábiles solicitados superan el saldo disponible', {
        diasSolicitados: diasHabiles,
        diasDisponibles: saldo.diasDisponibles,
      });
    }

    const existente = await this.solicitudRepo.findOverlapping(funcionarioId, input.fechaInicio, input.fechaFin);
    if (existente) {
      throw AppError.conflict('El rango se cruza con otra solicitud pendiente o aprobada', {
        solicitudId: existente.id,
      });
    }

    const solicitud = Object.assign(new SolicitudVacacion(), {
      funcionarioId,
      funcionarioNombre: funcionario.nombreCompleto,
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      diasHabiles,
      estado: EstadoSolicitud.PENDIENTE,
      motivoRechazo: null,
      registradoPor,
      resueltoPor: null,
      fechaResolucion: null,
    });
    return this.solicitudRepo.save(solicitud);
  }

  private async obtenerFuncionario(id: string): Promise<DatosFuncionarioVacaciones> {
    const funcionario = await this.personalClient.getFuncionario(id);
    if (!funcionario) throw AppError.notFound('Funcionario no encontrado');
    return funcionario;
  }
}
