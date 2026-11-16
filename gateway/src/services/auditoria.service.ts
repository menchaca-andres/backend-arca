import { AppError, type Paginated } from '@arca/shared';
import { Evento } from '../entities/evento.entity';
import { EventoRepository } from '../repositories/evento.repository';
import type { FiltrosAuditoria, RegistrarEventoDto } from '../schemas/auditoria.schema';

export class AuditoriaService {
  constructor(private readonly eventoRepo: EventoRepository = new EventoRepository()) {}

  /**
   * CA-01 y CA-02: Registra un evento de auditoría en la base de datos de forma inmutable.
   * CA-03: No se persiguen tokens, contraseñas ni el cuerpo completo de la petición.
   */
  async registrar(dto: RegistrarEventoDto): Promise<Evento> {
    const evento = new Evento();
    evento.fecha = new Date();
    evento.usuarioId = dto.usuarioId || null;
    evento.rol = dto.rol || null;
    evento.metodo = dto.metodo.toUpperCase();
    evento.ruta = dto.ruta;
    evento.servicio = dto.servicio;
    evento.recursoId = dto.recursoId || null;
    evento.statusCode = dto.statusCode;
    evento.ip = dto.ip || null;
    evento.requestId = dto.requestId;

    return this.eventoRepo.save(evento);
  }

  /**
   * CA-06: Consulta la auditoría con filtros por usuario, servicio, fecha y resultado, más paginación.
   */
  async consultar(filtros: FiltrosAuditoria): Promise<Paginated<Evento>> {
    return this.eventoRepo.findConFiltros(filtros);
  }

  /**
   * Obtiene un evento de auditoría por ID.
   */
  async obtenerPorId(id: string): Promise<Evento> {
    const evento = await this.eventoRepo.findById(id);
    if (!evento) {
      throw AppError.notFound('Evento de auditoría no encontrado');
    }
    return evento;
  }
}
