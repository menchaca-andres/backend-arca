import { AuditoriaService } from '../../src/services/auditoria.service';
import type { EventoRepository } from '../../src/repositories/evento.repository';
import { Evento } from '../../src/entities/evento.entity';

describe('AuditoriaService (HU-24 CA-01, CA-02, CA-03, CA-06)', () => {
  let mockRepo: Partial<EventoRepository>;
  let service: AuditoriaService;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: '1', ...entity })),
      findConFiltros: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 }),
      findById: jest.fn().mockResolvedValue(null),
    };
    service = new AuditoriaService(mockRepo as EventoRepository);
  });

  it('guarda un evento con los campos requeridos', async () => {
    const evento = await service.registrar({
      usuarioId: 'usr-1',
      rol: 'ADMIN',
      metodo: 'POST',
      ruta: '/api/usuarios',
      servicio: 'auth',
      recursoId: 'usr-2',
      statusCode: 201,
      ip: '192.168.1.1',
      requestId: 'req-1',
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(evento.metodo).toBe('POST');
    expect(evento.ruta).toBe('/api/usuarios');
    expect(evento.servicio).toBe('auth');
    expect(evento.statusCode).toBe(201);
  });

  it('consulta eventos pasando los filtros al repositorio', async () => {
    const filtros = { servicio: 'personal', page: 2, pageSize: 10 };
    await service.consultar(filtros);

    expect(mockRepo.findConFiltros).toHaveBeenCalledWith(filtros);
  });

  it('obtiene un evento por id o lanza error si no existe', async () => {
    (mockRepo.findById as jest.Mock).mockResolvedValueOnce({ id: 'evt-1' } as Evento);
    const result = await service.obtenerPorId('evt-1');
    expect(result.id).toBe('evt-1');

    (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.obtenerPorId('inexistente')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
