import crypto from 'node:crypto';
import { EstadoBoleta, RolUsuario, TipoConcepto, type Identity } from '@arca/shared';
import { BoletaService } from '../../src/services/boleta.service';
import { BoletaRepository } from '../../src/repositories/boleta.repository';
import { BoletaDetalleRepository } from '../../src/repositories/boleta-detalle.repository';
import { BoletaPdfRepository } from '../../src/repositories/boleta-pdf.repository';
import { PeriodoRepository } from '../../src/repositories/periodo.repository';
import { CorrelativoRepository } from '../../src/repositories/correlativo.repository';
import { ConceptoRepository } from '../../src/repositories/concepto.repository';
import { NovedadRepository } from '../../src/repositories/novedad.repository';
import { GotenbergClient } from '../../src/clients/gotenberg.client';
import { Boleta } from '../../src/entities/boleta.entity';
import { BoletaPdf } from '../../src/entities/boleta-pdf.entity';

describe('HU-23: Consultar y descargar boletas en PDF', () => {
  let mockBoletaRepo: jest.Mocked<BoletaRepository>;
  let mockBoletaDetalleRepo: jest.Mocked<BoletaDetalleRepository>;
  let mockBoletaPdfRepo: jest.Mocked<BoletaPdfRepository>;
  let mockPeriodoRepo: jest.Mocked<PeriodoRepository>;
  let mockCorrelativoRepo: jest.Mocked<CorrelativoRepository>;
  let mockConceptoRepo: jest.Mocked<ConceptoRepository>;
  let mockNovedadRepo: jest.Mocked<NovedadRepository>;
  let mockPdfClient: jest.Mocked<GotenbergClient>;

  let service: BoletaService;

  const pdfContent = Buffer.from('%PDF-1.4 Boleta oficial de pago generada');
  const validHash = crypto.createHash('sha256').update(pdfContent).digest('hex');

  const boletaEmitida1: Boleta = {
    id: 'b-1',
    periodoId: 'p-1',
    funcionarioId: 'func-1',
    numero: 'BP-202610-0001',
    version: 1,
    estado: EstadoBoleta.EMITIDA,
    boletaOriginalId: null,
    boletaOriginal: null,
    motivoRectificacion: null,
    datosFuncionario: { nombres: 'Juan', apellidos: 'Perez', ci: '1234567' },
    diasTrabajados: 30,
    totalGanado: 8000,
    totalDescuentos: 1016.8,
    liquidoPagable: 6983.2,
    tieneAlerta: false,
    hashSha256: validHash,
    emitidaEn: new Date('2026-10-31T18:00:00Z'),
    createdAt: new Date('2026-10-31T18:00:00Z'),
    periodo: { anio: 2026, mes: 10 } as any,
    detalles: [
      {
        id: 'd-1',
        boletaId: 'b-1',
        conceptoId: 'c-1',
        conceptoCodigo: 'HABER_BASICO',
        conceptoNombre: 'Haber básico',
        tipo: TipoConcepto.HABER,
        monto: 8000,
        orden: 1,
      } as any,
      {
        id: 'd-2',
        boletaId: 'b-1',
        conceptoId: 'c-2',
        conceptoCodigo: 'APORTE_LABORAL',
        conceptoNombre: 'Aporte laboral',
        tipo: TipoConcepto.DESCUENTO,
        monto: 1016.8,
        orden: 100,
      } as any,
    ],
  };

  const boletaRectificada1: Boleta = {
    ...boletaEmitida1,
    id: 'b-orig',
    version: 1,
    estado: EstadoBoleta.RECTIFICADA,
    boletaOriginalId: null,
  };

  const boletaVigente2: Boleta = {
    ...boletaEmitida1,
    id: 'b-vigente',
    version: 2,
    numero: 'BP-202610-0010',
    estado: EstadoBoleta.EMITIDA,
    boletaOriginalId: 'b-orig',
    motivoRectificacion: 'Ajuste de días trabajados',
  };

  const boletaBorrador: Boleta = {
    id: 'b-draft',
    periodoId: 'p-1',
    funcionarioId: 'func-1',
    numero: null,
    version: 1,
    estado: EstadoBoleta.BORRADOR,
    boletaOriginalId: null,
    boletaOriginal: null,
    motivoRectificacion: null,
    datosFuncionario: { nombres: 'Juan', apellidos: 'Perez' },
    diasTrabajados: 30,
    totalGanado: 8000,
    totalDescuentos: 1016.8,
    liquidoPagable: 6983.2,
    tieneAlerta: false,
    hashSha256: null,
    emitidaEn: null,
    createdAt: new Date(),
    periodo: { anio: 2026, mes: 10 } as any,
    detalles: [],
  };

  beforeEach(() => {
    mockBoletaRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findConFiltros: jest.fn(),
      findVersionVigente: jest.fn(),
      findHistorialVersiones: jest.fn(),
      findByPeriodoId: jest.fn(),
      findByPeriodoIdWithDetalles: jest.fn(),
      deleteByPeriodoId: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
    } as any;

    mockBoletaDetalleRepo = {} as any;
    mockBoletaPdfRepo = {
      findById: jest.fn(),
      findByIdConContenido: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    } as any;
    mockPeriodoRepo = {} as any;
    mockCorrelativoRepo = {} as any;
    mockConceptoRepo = {} as any;
    mockNovedadRepo = {} as any;
    mockPdfClient = {} as any;

    service = new BoletaService(
      mockBoletaRepo,
      mockBoletaDetalleRepo,
      mockBoletaPdfRepo,
      mockPeriodoRepo,
      mockCorrelativoRepo,
      mockConceptoRepo,
      mockNovedadRepo,
      mockPdfClient,
    );
  });

  describe('CA-01: RRHH lista boletas por período y por funcionario con totales', () => {
    it('calcula totales de masa salarial, descuentos y líquido para el conjunto consultado', async () => {
      const rrhhIdentity: Identity = {
        userId: 'u-admin',
        rol: RolUsuario.RRHH,
        funcionarioId: null,
      };

      const boleta2: Boleta = {
        ...boletaEmitida1,
        id: 'b-2',
        funcionarioId: 'func-2',
        numero: 'BP-202610-0002',
        totalGanado: 6000,
        totalDescuentos: 762.6,
        liquidoPagable: 5237.4,
      };

      mockBoletaRepo.findConFiltros.mockResolvedValue([boletaEmitida1, boleta2]);

      const resultado = await service.listar({ periodoId: 'p-1' }, rrhhIdentity);

      expect(mockBoletaRepo.findConFiltros).toHaveBeenCalledWith(
        expect.objectContaining({ periodoId: 'p-1' }),
      );
      expect(resultado.boletas).toHaveLength(2);
      expect(resultado.resumen).toEqual({
        totalGanado: 14000,
        totalDescuentos: 1779.4,
        totalLiquido: 12220.6,
        cantidadBoletas: 2,
      });
    });
  });

  describe('CA-02 y CA-05: Reglas de visibilidad para FUNCIONARIO', () => {
    it('un FUNCIONARIO ve solo sus boletas emitidas/rectificadas y no ve borradores', async () => {
      const funcionarioIdentity: Identity = {
        userId: 'u-func1',
        rol: RolUsuario.FUNCIONARIO,
        funcionarioId: 'func-1',
      };

      mockBoletaRepo.findConFiltros.mockResolvedValue([boletaEmitida1]);

      const resultado = await service.listar({}, funcionarioIdentity);

      // Debe forzar funcionarioId al de la identidad y estados a EMITIDA/RECTIFICADA (sin borradores)
      expect(mockBoletaRepo.findConFiltros).toHaveBeenCalledWith({
        funcionarioId: 'func-1',
        estados: [EstadoBoleta.EMITIDA, EstadoBoleta.RECTIFICADA],
      });
      expect(resultado.boletas).toHaveLength(1);
      expect(resultado.boletas[0].id).toBe('b-1');
    });

    it('un FUNCIONARIO sin funcionarioId asociado recibe 403 Forbidden', async () => {
      const invalidIdentity: Identity = {
        userId: 'u-anon',
        rol: RolUsuario.FUNCIONARIO,
        funcionarioId: null,
      };

      await expect(service.listar({}, invalidIdentity)).rejects.toThrow(
        'El usuario no tiene un funcionario asociado',
      );
    });

    it('un FUNCIONARIO no puede acceder al detalle de una boleta ajena (403 Forbidden)', async () => {
      const funcionarioIdentity: Identity = {
        userId: 'u-func2',
        rol: RolUsuario.FUNCIONARIO,
        funcionarioId: 'func-2',
      };

      mockBoletaRepo.findById.mockResolvedValue(boletaEmitida1); // pertenece a func-1

      await expect(service.obtenerPorId('b-1', funcionarioIdentity)).rejects.toThrow(
        'No tiene permiso para acceder a esta boleta',
      );
    });

    it('un FUNCIONARIO no puede acceder al detalle de una boleta en BORRADOR (403 Forbidden - CA-05)', async () => {
      const funcionarioIdentity: Identity = {
        userId: 'u-func1',
        rol: RolUsuario.FUNCIONARIO,
        funcionarioId: 'func-1',
      };

      mockBoletaRepo.findById.mockResolvedValue(boletaBorrador);

      await expect(service.obtenerPorId('b-draft', funcionarioIdentity)).rejects.toThrow(
        'Las boletas en borrador no son visibles para el funcionario',
      );
    });
  });

  describe('CA-03: Detalle de boleta y enlace a versión vigente', () => {
    it('si la boleta fue rectificada, incluye el enlace a la versión vigente y su historial', async () => {
      mockBoletaRepo.findById.mockResolvedValue(boletaRectificada1);
      mockBoletaRepo.findVersionVigente.mockResolvedValue(boletaVigente2);
      mockBoletaRepo.findHistorialVersiones.mockResolvedValue([boletaRectificada1, boletaVigente2]);

      const detalle = await service.obtenerPorId('b-orig', null);

      expect(detalle.id).toBe('b-orig');
      expect(detalle.estado).toBe(EstadoBoleta.RECTIFICADA);
      expect(detalle.versionVigente).toEqual({
        id: 'b-vigente',
        numero: 'BP-202610-0010',
        version: 2,
        estado: EstadoBoleta.EMITIDA,
        liquidoPagable: 6983.2,
      });
      expect(detalle.historialVersiones).toHaveLength(2);
    });
  });

  describe('CA-04: Descarga de PDF y verificación de hash SHA-256', () => {
    it('entrega el buffer del PDF cuando el hash SHA-256 coincide exactamente', async () => {
      mockBoletaRepo.findById.mockResolvedValue(boletaEmitida1);
      mockBoletaRepo.findHistorialVersiones.mockResolvedValue([boletaEmitida1]);
      mockBoletaPdfRepo.findByIdConContenido.mockResolvedValue({
        boletaId: 'b-1',
        contenido: pdfContent,
        tamanoBytes: pdfContent.length,
      } as BoletaPdf);

      const { buffer, boleta } = await service.obtenerPdf('b-1', null);

      expect(buffer).toEqual(pdfContent);
      expect(boleta.hashSha256).toBe(validHash);
    });

    it('lanza 500 error de integridad si el hash del PDF recuperado no coincide con el registro original', async () => {
      mockBoletaRepo.findById.mockResolvedValue(boletaEmitida1);
      mockBoletaRepo.findHistorialVersiones.mockResolvedValue([boletaEmitida1]);

      const tamperedContent = Buffer.from('%PDF-1.4 PDF alterado maliciosamente');
      mockBoletaPdfRepo.findByIdConContenido.mockResolvedValue({
        boletaId: 'b-1',
        contenido: tamperedContent,
        tamanoBytes: tamperedContent.length,
      } as BoletaPdf);

      await expect(service.obtenerPdf('b-1', null)).rejects.toThrow(
        'Error de integridad: el hash SHA-256 del PDF no coincide con el registro original',
      );
    });

    it('lanza 404 si el archivo PDF no está registrado en la base de datos', async () => {
      mockBoletaRepo.findById.mockResolvedValue(boletaEmitida1);
      mockBoletaRepo.findHistorialVersiones.mockResolvedValue([boletaEmitida1]);
      mockBoletaPdfRepo.findByIdConContenido.mockResolvedValue(null);

      await expect(service.obtenerPdf('b-1', null)).rejects.toThrow(
        'El archivo PDF de la boleta no está disponible',
      );
    });
  });
});
