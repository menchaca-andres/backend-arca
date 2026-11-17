import { FuncionarioController } from '../../src/controllers/funcionario.controller';
import { FuncionarioService } from '../../src/services/funcionario.service';
import { MotivoBaja } from '@arca/shared';

describe('FuncionarioController (HU-08, HU-11, HU-12)', () => {
  let mockService: jest.Mocked<FuncionarioService>;
  let controller: FuncionarioController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = {
      registrar: jest.fn(),
      obtenerFicha: jest.fn(),
      listarPadron: jest.fn(),
      actualizarContacto: jest.fn(),
      ratificar: jest.fn(),
      darDeBaja: jest.fn(),
      obtenerPruebaPorVencer: jest.fn(),
    } as any;

    controller = new FuncionarioController(mockService);

    mockReq = {
      body: {},
      params: {},
      query: {},
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

    expect(mockService.obtenerFicha).toHaveBeenCalledWith('func-1', { rol: null, funcionarioId: null });
    expect(mockRes.json).toHaveBeenCalledWith(fakeFicha);
  });

  it('HU-11: ratificar responde 200 con la ficha ratificada', async () => {
    mockReq.params = { id: 'func-1' };
    mockReq.body = { fechaRatificacion: '2026-11-09' };
    mockReq.header.mockImplementation((name: string) => {
      if (name.toLowerCase() === 'x-user-id') return 'user-rrhh-id';
      return null;
    });

    const fakeFicha = { id: 'func-1', estado: 'RATIFICADO', fechaRatificacion: '2026-11-09' };
    mockService.ratificar.mockResolvedValue(fakeFicha as any);

    await controller.ratificar(mockReq, mockRes, mockNext);

    expect(mockService.ratificar).toHaveBeenCalledWith('func-1', mockReq.body, 'user-rrhh-id');
    expect(mockRes.json).toHaveBeenCalledWith(fakeFicha);
  });

  it('HU-11: obtenerPruebaPorVencer responde 200 con la lista de funcionarios por vencer', async () => {
    mockReq.query = { dias: '7' };
    const lista = [{ id: 'func-1', diasRestantes: 3 }];
    mockService.obtenerPruebaPorVencer.mockResolvedValue(lista as any);

    await controller.obtenerPruebaPorVencer(mockReq, mockRes, mockNext);

    expect(mockService.obtenerPruebaPorVencer).toHaveBeenCalledWith(7, undefined);
    expect(mockRes.json).toHaveBeenCalledWith(lista);
  });

  it('HU-12: darDeBaja responde 200 con la ficha de baja', async () => {
    mockReq.params = { id: 'func-1' };
    mockReq.body = { fechaBaja: '2026-11-09', motivoBaja: MotivoBaja.RENUNCIA };
    mockReq.header.mockImplementation((name: string) => {
      if (name.toLowerCase() === 'x-user-id') return 'user-rrhh-id';
      return null;
    });

    const fakeFicha = { id: 'func-1', estado: 'BAJA', fechaBaja: '2026-11-09' };
    mockService.darDeBaja.mockResolvedValue(fakeFicha as any);

    await controller.darDeBaja(mockReq, mockRes, mockNext);

    expect(mockService.darDeBaja).toHaveBeenCalledWith('func-1', mockReq.body, 'user-rrhh-id');
    expect(mockRes.json).toHaveBeenCalledWith(fakeFicha);
  });

  it('HU-09: obtenerFicha pasa la identidad para validar CA-04', async () => {
    mockReq.params = { id: 'func-1' };
    mockReq.header.mockImplementation((name: string) => {
      if (name === 'x-user-rol') return 'FUNCIONARIO';
      if (name === 'x-funcionario-id') return 'func-1';
      return undefined;
    });
    mockService.obtenerFicha.mockResolvedValue({ id: 'func-1' } as any);

    await controller.obtenerFicha(mockReq, mockRes, mockNext);

    expect(mockService.obtenerFicha).toHaveBeenCalledWith('func-1', { rol: 'FUNCIONARIO', funcionarioId: 'func-1' });
  });

  it('HU-09: listar usa los filtros validados', async () => {
    const filtros = { estado: 'BAJA', page: 2, pageSize: 20 };
    mockRes.locals = { query: filtros };
    mockService.listarPadron.mockResolvedValue({ data: [], page: 2, pageSize: 20, total: 0 });

    await controller.listar(mockReq, mockRes, mockNext);

    expect(mockService.listarPadron).toHaveBeenCalledWith(filtros);
    expect(mockRes.json).toHaveBeenCalledWith({ data: [], page: 2, pageSize: 20, total: 0 });
  });

  it('HU-10: cambiarAsignacion responde 201 con la ficha actualizada', async () => {
    const mockAsignacionService = { cambiar: jest.fn().mockResolvedValue({ id: 'func-1' }) };
    controller = new FuncionarioController(mockService, mockAsignacionService as any);
    mockReq.params = { id: 'func-1' };
    mockReq.body = { remuneracion: 9000, vigenteDesde: '2026-12-01', motivo: 'INCREMENTO' };
    mockReq.header.mockImplementation((name: string) => (name === 'x-user-id' ? 'user-rrhh-id' : undefined));

    await controller.cambiarAsignacion(mockReq, mockRes, mockNext);

    expect(mockAsignacionService.cambiar).toHaveBeenCalledWith('func-1', mockReq.body, 'user-rrhh-id');
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('HU-10: cambiarAsignacion rechaza sin identidad', async () => {
    mockReq.params = { id: 'func-1' };

    await controller.cambiarAsignacion(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNAUTHORIZED' }));
  });

  it('HU-10: actualizarContacto responde con la ficha', async () => {
    mockReq.params = { id: 'func-1' };
    mockReq.body = { telefono: '70000000' };
    mockService.actualizarContacto.mockResolvedValue({ id: 'func-1' } as any);

    await controller.actualizarContacto(mockReq, mockRes, mockNext);

    expect(mockService.actualizarContacto).toHaveBeenCalledWith('func-1', { telefono: '70000000' });
    expect(mockRes.json).toHaveBeenCalledWith({ id: 'func-1' });
  });
});
