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
  findById(id: string): Promise<SolicitudVacacion | null>;
  findPendientes(): Promise<SolicitudVacacion[]>;
  findByFuncionario(id: string): Promise<SolicitudVacacion[]>;
  findOverlapping(id: string, desde: string, hasta: string): Promise<SolicitudVacacion | null>;
  save(solicitud: SolicitudVacacion): Promise<SolicitudVacacion>;
}

export interface ResolutorSolicitud {
  userId: string;
  funcionarioId: string | null;
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

  async listarPendientes() {
    const pendientes = await this.solicitudRepo.findPendientes();
    return Promise.all(
      pendientes.map(async (solicitud) => {
        let saldo: Awaited<ReturnType<VacacionesService['obtenerSaldo']>> | null = null;
        try {
          saldo = await this.obtenerSaldo(solicitud.funcionarioId);
        } catch {
          // Si ms-personal no responde o el funcionario ya no existe, la bandeja sigue funcionando.
          saldo = null;
        }
        return { ...solicitud, saldo };
      }),
    );
  }

  async aprobarSolicitud(id: string, resolutor: ResolutorSolicitud): Promise<SolicitudVacacion> {
    const solicitud = await this.obtenerResoluble(id, resolutor);

    // CA-06: la elegibilidad y el saldo pudieron cambiar desde que se solicitó (p. ej. una baja).
    const funcionario = await this.obtenerFuncionario(solicitud.funcionarioId);
    const elegibilidad = evaluarElegibilidad(funcionario, this.clock());
    if (!elegibilidad.elegible) {
      throw AppError.badRequest(`El funcionario ya no es elegible: ${elegibilidad.motivo}`, {
        motivo: elegibilidad.motivo,
      });
    }

    // Los días de esta solicitud ya figuran como reservados; se compara contra lo ganado menos lo usado.
    const saldo = await this.obtenerSaldo(solicitud.funcionarioId);
    const disponibleParaAprobar = saldo.diasGanados - saldo.diasUsados;
    if (solicitud.diasHabiles > disponibleParaAprobar) {
      throw AppError.badRequest('Los días solicitados superan el saldo disponible actual', {
        diasSolicitados: solicitud.diasHabiles,
        diasDisponibles: disponibleParaAprobar,
      });
    }

    solicitud.estado = EstadoSolicitud.APROBADA;
    solicitud.motivoRechazo = null;
    solicitud.resueltoPor = resolutor.userId;
    solicitud.fechaResolucion = new Date();
    return this.solicitudRepo.save(solicitud);
  }

  async rechazarSolicitud(
    id: string,
    motivo: string,
    resolutor: ResolutorSolicitud,
  ): Promise<SolicitudVacacion> {
    const solicitud = await this.obtenerResoluble(id, resolutor);

    solicitud.estado = EstadoSolicitud.RECHAZADA;
    solicitud.motivoRechazo = motivo.trim();
    solicitud.resueltoPor = resolutor.userId;
    solicitud.fechaResolucion = new Date();
    return this.solicitudRepo.save(solicitud);
  }

  private async obtenerResoluble(id: string, resolutor: ResolutorSolicitud): Promise<SolicitudVacacion> {
    const solicitud = await this.solicitudRepo.findById(id);
    if (!solicitud) throw AppError.notFound('Solicitud de vacaciones no encontrada');

    if (resolutor.funcionarioId && resolutor.funcionarioId === solicitud.funcionarioId) {
      throw AppError.forbidden('No puedes resolver tu propia solicitud de vacaciones');
    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw AppError.conflict(`La solicitud ya fue resuelta (${solicitud.estado})`, {
        estado: solicitud.estado,
      });
    }
    return solicitud;
  }

  private async obtenerFuncionario(id: string): Promise<DatosFuncionarioVacaciones> {
    const funcionario = await this.personalClient.getFuncionario(id);
    if (!funcionario) throw AppError.notFound('Funcionario no encontrado');
    return funcionario;
  }
}
