import { ConceptoController } from '../../src/controllers/concepto.controller';
import { ConceptoService } from '../../src/services/concepto.service';

describe('ConceptoController (HU-20)', () => {
  let mockService: jest.Mocked<ConceptoService>;
  let controller: ConceptoController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockService = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      eliminar: jest.fn(),
    } as any;

    controller = new ConceptoController(mockService);

    mockReq = {
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('listar responde con la lista de conceptos', async () => {
    mockService.listar.mockResolvedValue([{ id: 'c-1', codigo: 'HABER_BASICO' } as any]);

    await controller.listar(mockReq, mockRes);

    expect(mockService.listar).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith([{ id: 'c-1', codigo: 'HABER_BASICO' }]);
  });

  it('crear responde 201 con el concepto nuevo', async () => {
    const input = { codigo: 'BONO', nombre: 'Bono', valor: 200 };
    mockReq.body = input;
    const creado = { id: 'c-2', ...input };
    mockService.crear.mockResolvedValue(creado as any);

    await controller.crear(mockReq, mockRes);

    expect(mockService.crear).toHaveBeenCalledWith(input);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(creado);
  });

  it('eliminar responde con el resultado de la eliminacion o desactivacion', async () => {
    mockReq.params.id = 'c-2';
    const resultado = { eliminado: false, desactivado: true, mensaje: 'Desactivado' };
    mockService.eliminar.mockResolvedValue(resultado);

    await controller.eliminar(mockReq, mockRes);

    expect(mockService.eliminar).toHaveBeenCalledWith('c-2');
    expect(mockRes.json).toHaveBeenCalledWith(resultado);
  });
});

