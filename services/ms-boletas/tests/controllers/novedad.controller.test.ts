import { NovedadController } from '../../src/controllers/novedad.controller';
import { NovedadService } from '../../src/services/novedad.service';

describe('NovedadController (HU-20)', () => {
  let mockService: jest.Mocked<NovedadService>;
  let controller: NovedadController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockService = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      registrar: jest.fn(),
      eliminar: jest.fn(),
    } as any;

    controller = new NovedadController(mockService);

    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {
        'x-user-id': 'uuid-user-rrhh',
      },
    };

    mockRes = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it('listar responde con las novedades filtradas', async () => {
    mockRes.locals.query = { anio: 2026, mes: 10 };
    mockService.listar.mockResolvedValue([{ id: 'nov-1', monto: 500 } as any]);

    await controller.listar(mockReq, mockRes);

    expect(mockService.listar).toHaveBeenCalledWith({ anio: 2026, mes: 10 });
    expect(mockRes.json).toHaveBeenCalledWith([{ id: 'nov-1', monto: 500 }]);
  });

  it('registrar responde 201 con la novedad registrada', async () => {
    const input = { anio: 2026, mes: 10, funcionarioId: 'f-1', conceptoId: 'c-1', monto: 350 };
    mockReq.body = input;
    const guardada = { id: 'nov-1', ...input };
    mockService.registrar.mockResolvedValue(guardada as any);

    await controller.registrar(mockReq, mockRes);

    expect(mockService.registrar).toHaveBeenCalledWith(input, 'uuid-user-rrhh');
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(guardada);
  });

  it('eliminar responde 204', async () => {
    mockReq.params.id = 'nov-1';

    await controller.eliminar(mockReq, mockRes);

    expect(mockService.eliminar).toHaveBeenCalledWith('nov-1');
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });
});

