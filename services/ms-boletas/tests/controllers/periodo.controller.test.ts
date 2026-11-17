import { PeriodoController } from '../../src/controllers/periodo.controller';
import { PeriodoService } from '../../src/services/periodo.service';
import { EstadoPeriodo } from '@arca/shared';

describe('PeriodoController (HU-21: Calcular la planilla del período)', () => {
  let mockService: jest.Mocked<PeriodoService>;
  let controller: PeriodoController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockService = {
      abrir: jest.fn(),
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      calcular: jest.fn(),
      emitir: jest.fn(),
    } as any;

    controller = new PeriodoController(mockService);

    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {
        'x-user-id': 'u-admin-1',
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('abrir (CA-01)', () => {
    it('responde 201 con el período creado', async () => {
      const input = { anio: 2026, mes: 11 };
      const periodoCreado = {
        id: 'p-1',
        anio: 2026,
        mes: 11,
        estado: EstadoPeriodo.BORRADOR,
        fechaCalculo: null,
        fechaEmision: null,
        emitidoPor: null,
      } as any;

      mockService.abrir.mockResolvedValue(periodoCreado);
      mockReq.body = input;

      await controller.abrir(mockReq, mockRes, mockNext);

      expect(mockService.abrir).toHaveBeenCalledWith(input);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(periodoCreado);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('llama a next(error) si el servicio falla', async () => {
      const error = new Error('El período 11/2026 ya se encuentra registrado');
      mockService.abrir.mockRejectedValue(error);
      mockReq.body = { anio: 2026, mes: 11 };

      await controller.abrir(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listar', () => {
    it('responde 200 con la lista de períodos y sus resúmenes', async () => {
      const periodos = [
        {
          id: 'p-1',
          anio: 2026,
          mes: 10,
          estado: EstadoPeriodo.BORRADOR,
          resumen: {
            totalGanado: 10000,
            totalDescuentos: 1271,
            totalLiquido: 8729,
            cantidadBoletas: 1,
            cantidadAlertas: 0,
          },
        } as any,
      ];

      mockService.listar.mockResolvedValue(periodos);

      await controller.listar(mockReq, mockRes, mockNext);

      expect(mockService.listar).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(periodos);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('llama a next(error) si listar falla', async () => {
      const error = new Error('Database error');
      mockService.listar.mockRejectedValue(error);

      await controller.listar(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('obtenerPorId (CA-08)', () => {
    it('responde 200 con el detalle del período y boletas', async () => {
      const detalle = {
        periodo: { id: 'p-1', anio: 2026, mes: 10, estado: EstadoPeriodo.BORRADOR } as any,
        resumen: {
          totalGanado: 10000,
          totalDescuentos: 1271,
          totalLiquido: 8729,
          cantidadBoletas: 1,
          cantidadAlertas: 0,
        },
        boletas: [],
      };

      mockService.obtenerPorId.mockResolvedValue(detalle);
      mockReq.params = { id: 'p-1' };

      await controller.obtenerPorId(mockReq, mockRes, mockNext);

      expect(mockService.obtenerPorId).toHaveBeenCalledWith('p-1');
      expect(mockRes.json).toHaveBeenCalledWith(detalle);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('llama a next(error) si obtenerPorId falla', async () => {
      const error = new Error('Período no encontrado');
      mockService.obtenerPorId.mockRejectedValue(error);
      mockReq.params = { id: 'p-999' };

      await controller.obtenerPorId(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('calcular (CA-02 a CA-07)', () => {
    it('responde 200 con la planilla calculada', async () => {
      const calculo = {
        periodo: { id: 'p-1', anio: 2026, mes: 10, estado: EstadoPeriodo.BORRADOR } as any,
        resumen: {
          totalGanado: 24700,
          totalDescuentos: 3139.37,
          totalLiquido: 21560.63,
          cantidadBoletas: 3,
          cantidadAlertas: 0,
        },
        boletas: [],
      };

      mockService.calcular.mockResolvedValue(calculo);
      mockReq.params = { id: 'p-1' };

      await controller.calcular(mockReq, mockRes, mockNext);

      expect(mockService.calcular).toHaveBeenCalledWith('p-1');
      expect(mockRes.json).toHaveBeenCalledWith(calculo);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('llama a next(error) si el cálculo falla o está en EMITIDO', async () => {
      const error = new Error('Solo se puede calcular o recalcular un período en estado BORRADOR');
      mockService.calcular.mockRejectedValue(error);
      mockReq.params = { id: 'p-1' };

      await controller.calcular(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('emitir (HU-22)', () => {
    it('responde 200 con el período emitido', async () => {
      const resultado = {
        periodo: { id: 'p-1', anio: 2026, mes: 10, estado: EstadoPeriodo.EMITIDO } as any,
        resumen: {
          totalGanado: 24700,
          totalDescuentos: 3139.37,
          totalLiquido: 21560.63,
          cantidadBoletas: 3,
          cantidadAlertas: 0,
        },
        boletas: [],
      };

      mockService.emitir.mockResolvedValue(resultado);
      mockReq.params = { id: 'p-1' };
      mockReq.headers['x-user-id'] = 'user-123';

      await controller.emitir(mockReq, mockRes, mockNext);

      expect(mockService.emitir).toHaveBeenCalledWith('p-1', 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith(resultado);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('llama a next(error) si la emisión falla por alertas activas', async () => {
      const error = new Error('No se puede emitir el período porque contiene boletas con alertas');
      mockService.emitir.mockRejectedValue(error);
      mockReq.params = { id: 'p-1' };

      await controller.emitir(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
