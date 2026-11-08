import { RolUsuario } from '@arca/shared';
import { UsuarioController } from '../../src/controllers/usuario.controller';
import { UsuarioService } from '../../src/services/usuario.service';

describe('UsuarioController (HU-06)', () => {
  let mockService: jest.Mocked<UsuarioService>;
  let controller: UsuarioController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = {
      crear: jest.fn(),
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      cambiarRol: jest.fn(),
      cambiarEstado: jest.fn(),
      cambiarEstadoInterno: jest.fn(),
    } as any;

    controller = new UsuarioController(mockService);

    mockReq = {
      body: {},
      params: {},
      query: {},
      header: jest.fn(),
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('crear responde 201 con el resultado del servicio', async () => {
    mockReq.body = { email: 'test@arca.test', rol: RolUsuario.ADMIN };
    const fakeResult = {
      usuario: { id: 'usr-1', email: 'test@arca.test', rol: RolUsuario.ADMIN },
      passwordTemporal: 'Temp#123456!',
    };
    mockService.crear.mockResolvedValue(fakeResult as any);

    await controller.crear(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(fakeResult);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('listar pasa filtros y responde 200', async () => {
    mockReq.query = { rol: RolUsuario.RRHH, activo: 'true' };
    mockService.listar.mockResolvedValue([]);

    await controller.listar(mockReq, mockRes, mockNext);

    expect(mockService.listar).toHaveBeenCalledWith({
      rol: RolUsuario.RRHH,
      activo: true,
    });
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  it('cambiarEstado extrae userId de la cabecera y llama al servicio', async () => {
    mockReq.params = { id: 'target-id' };
    mockReq.body = { activo: false };
    mockReq.header.mockImplementation((name: string) => {
      if (name.toLowerCase() === 'x-user-id') return 'admin-operator-id';
      return null;
    });

    const fakeUpdated = { id: 'target-id', activo: false };
    mockService.cambiarEstado.mockResolvedValue(fakeUpdated as any);

    await controller.cambiarEstado(mockReq, mockRes, mockNext);

    expect(mockService.cambiarEstado).toHaveBeenCalledWith('target-id', { activo: false }, 'admin-operator-id');
    expect(mockRes.json).toHaveBeenCalledWith(fakeUpdated);
  });

  it('cambiarEstadoInterno responde 200 con el resultado', async () => {
    mockReq.params = { id: 'func-id' };
    mockReq.body = { estado: 'INACTIVO' };
    const fakeResult = { id: 'usr-id', estado: 'INACTIVO' as const };
    mockService.cambiarEstadoInterno.mockResolvedValue(fakeResult);

    await controller.cambiarEstadoInterno(mockReq, mockRes, mockNext);

    expect(mockService.cambiarEstadoInterno).toHaveBeenCalledWith('func-id', { estado: 'INACTIVO' });
    expect(mockRes.json).toHaveBeenCalledWith(fakeResult);
  });
});

