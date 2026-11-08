import { FuncionarioController } from '../../src/controllers/funcionario.controller';
import { FuncionarioService } from '../../src/services/funcionario.service';

describe('FuncionarioController (HU-08)', () => {
  let mockService: jest.Mocked<FuncionarioService>;
  let controller: FuncionarioController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = {
      registrar: jest.fn(),
      obtenerFicha: jest.fn(),
    } as any;

    controller = new FuncionarioController(mockService);

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

  it('registrar responde 201 con la ficha del funcionario', async () => {
    mockReq.header.mockImplementation((name: string) => {
      if (name.toLowerCase() === 'x-user-id') return 'user-rrhh-id';
      return null;
    });

    const fakeFicha = {
      id: 'func-1',
      ci: '1234567',
      nombres: 'Carlos',
      apellidos: 'Mamani',
      asignacionVigente: { id: 'asig-1', remuneracion: 8000 },
    };
    mockService.registrar.mockResolvedValue(fakeFicha as any);

    await controller.registrar(mockReq, mockRes, mockNext);

    expect(mockService.registrar).toHaveBeenCalledWith(mockReq.body, 'user-rrhh-id');
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(fakeFicha);
  });

  it('obtenerFicha responde 200 con la ficha por id', async () => {
    mockReq.params = { id: 'func-1' };
    const fakeFicha = { id: 'func-1', ci: '1234567' };
    mockService.obtenerFicha.mockResolvedValue(fakeFicha as any);

    await controller.obtenerFicha(mockReq, mockRes, mockNext);

    expect(mockService.obtenerFicha).toHaveBeenCalledWith('func-1');
    expect(mockRes.json).toHaveBeenCalledWith(fakeFicha);
  });
});

