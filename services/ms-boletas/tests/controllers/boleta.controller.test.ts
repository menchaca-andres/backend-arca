import { RolUsuario } from '@arca/shared';
import { BoletaController } from '../../src/controllers/boleta.controller';
import { BoletaService } from '../../src/services/boleta.service';

describe('BoletaController (HU-23)', () => {
  let mockService: jest.Mocked<BoletaService>;
  let controller: BoletaController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockService = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      obtenerPdf: jest.fn(),
      rectificar: jest.fn(),
    } as any;

    controller = new BoletaController(mockService);

    const headers: Record<string, string> = {
      'x-user-id': 'u-1',
      'x-user-email': 'admin@arca.gob.bo',
      'x-user-rol': RolUsuario.ADMIN,
    };

    mockReq = {
      body: {},
      params: {},
      query: {},
      headers,
      header: jest.fn((name: string) => headers[name.toLowerCase()] || null),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      locals: {},
    };

    mockNext = jest.fn();
  });

  it('listar responde 200 con la lista de boletas y resumen', async () => {
    const dataEsperada = {
      boletas: [{ id: 'b-1', numero: 'BP-202610-0001' } as any],
      resumen: {
        totalGanado: 8000,
        totalDescuentos: 1000,
        totalLiquido: 7000,
        cantidadBoletas: 1,
      },
    };
    mockService.listar.mockResolvedValue(dataEsperada);

    mockReq.query = { periodoId: 'per-1' };
    await controller.listar(mockReq, mockRes, mockNext);

    expect(mockService.listar).toHaveBeenCalledWith(
      expect.objectContaining({ periodoId: 'per-1' }),
      expect.objectContaining({ userId: 'u-1', rol: RolUsuario.ADMIN }),
    );
    expect(mockRes.json).toHaveBeenCalledWith(dataEsperada);
  });

  it('obtenerPorId responde 200 con el detalle de la boleta', async () => {
    const boletaDetalle = {
      id: 'b-1',
      numero: 'BP-202610-0001',
      version: 1,
      detalles: [],
    } as any;
    mockService.obtenerPorId.mockResolvedValue(boletaDetalle);

    mockReq.params = { id: 'b-1' };
    await controller.obtenerPorId(mockReq, mockRes, mockNext);

    expect(mockService.obtenerPorId).toHaveBeenCalledWith('b-1', expect.anything());
    expect(mockRes.json).toHaveBeenCalledWith(boletaDetalle);
  });

  it('descargarPdf entrega el buffer y cabeceras de Content-Type, Content-Disposition y X-Boleta-SHA256', async () => {
    const buffer = Buffer.from('%PDF-1.4 Boleta oficial');
    const boleta = {
      id: 'b-1',
      numero: 'BP-202610-0001',
      hashSha256: 'a1b2c3d4e5f6',
    } as any;

    mockService.obtenerPdf.mockResolvedValue({ buffer, boleta });

    mockReq.params = { id: 'b-1' };
    await controller.descargarPdf(mockReq, mockRes, mockNext);

    expect(mockService.obtenerPdf).toHaveBeenCalledWith('b-1', expect.anything());
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="Boleta-BP-202610-0001.pdf"',
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', buffer.length);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Boleta-SHA256', 'a1b2c3d4e5f6');
    expect(mockRes.send).toHaveBeenCalledWith(buffer);
  });

  it('si ocurre un error en descargarPdf, invoca next(error)', async () => {
    const error = new Error('Integrity failed');
    mockService.obtenerPdf.mockRejectedValue(error);

    mockReq.params = { id: 'b-1' };
    await controller.descargarPdf(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  describe('rectificar (HU-22 CA-05 y CA-06)', () => {
    it('responde 201 con la nueva boleta rectificada', async () => {
      const boletaNueva = {
        id: 'b-2',
        version: 2,
        boletaOriginalId: 'b-1',
        numero: 'BP-202610-0002',
        motivoRectificacion: 'Ajuste salarial retroactivo acordado',
      } as any;

      mockService.rectificar.mockResolvedValue(boletaNueva);

      mockReq.params = { id: 'b-1' };
      mockReq.body = { motivo: 'Ajuste salarial retroactivo acordado' };

      await controller.rectificar(mockReq, mockRes, mockNext);

      expect(mockService.rectificar).toHaveBeenCalledWith('b-1', {
        motivo: 'Ajuste salarial retroactivo acordado',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(boletaNueva);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('si el servicio falla al rectificar, invoca next(error)', async () => {
      const error = new Error('Solo se puede rectificar una boleta en estado EMITIDA');
      mockService.rectificar.mockRejectedValue(error);

      mockReq.params = { id: 'b-1' };
      mockReq.body = { motivo: 'Ajuste salarial retroactivo acordado' };

      await controller.rectificar(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
