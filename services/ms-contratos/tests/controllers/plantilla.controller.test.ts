import { PlantillaController } from '../../src/controllers/plantilla.controller';
import { PlantillaService } from '../../src/services/plantilla.service';

describe('PlantillaController (HU-17)', () => {
  let mockService: jest.Mocked<PlantillaService>;
  let controller: PlantillaController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      obtenerHistorialVersiones: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      preview: jest.fn(),
    } as any;

    controller = new PlantillaController(mockService);

    mockReq = {
      body: {},
      params: {},
      header: jest.fn(),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('crear responde 201 con la plantilla creada', async () => {
    mockReq.header.mockImplementation((name: string) => {
      if (name.toLowerCase() === 'x-user-id') return 'user-admin-id';
      return null;
    });

    const fakePlantilla = { id: 'p-1', codigo: 'CTR-1', versionActiva: { version: 1 } };
    mockService.crear.mockResolvedValue(fakePlantilla as any);

    await controller.crear(mockReq, mockRes, mockNext);

    expect(mockService.crear).toHaveBeenCalledWith(mockReq.body, 'user-admin-id');
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(fakePlantilla);
  });

  it('listar responde 200 con la lista de plantillas', async () => {
    mockService.listar.mockResolvedValue([{ id: 'p-1' }] as any);

    await controller.listar(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith([{ id: 'p-1' }]);
  });

  it('preview responde 200 con el HTML renderizado', async () => {
    mockReq.body = { contenido: 'Hola mundo' };
    mockService.preview.mockReturnValue({ contenidoRenderizado: 'Hola mundo', variables: [] });

    await controller.preview(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ contenidoRenderizado: 'Hola mundo', variables: [] });
  });
});

