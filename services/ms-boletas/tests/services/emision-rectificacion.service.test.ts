import { BaseCalculo, EstadoBoleta, EstadoPeriodo, FormaCalculo, TipoConcepto } from '@arca/shared';
import { PeriodoService } from '../../src/services/periodo.service';
import { BoletaService } from '../../src/services/boleta.service';
import { PeriodoRepository } from '../../src/repositories/periodo.repository';
import { BoletaRepository } from '../../src/repositories/boleta.repository';
import { BoletaDetalleRepository } from '../../src/repositories/boleta-detalle.repository';
import { BoletaPdfRepository } from '../../src/repositories/boleta-pdf.repository';
import { CorrelativoRepository } from '../../src/repositories/correlativo.repository';
import { ConceptoRepository } from '../../src/repositories/concepto.repository';
import { NovedadRepository } from '../../src/repositories/novedad.repository';
import { PersonalClient } from '../../src/clients/personal.client';
import { PdfClient } from '../../src/clients/gotenberg.client';
import { Periodo } from '../../src/entities/periodo.entity';
import { Boleta } from '../../src/entities/boleta.entity';
import { BoletaDetalle } from '../../src/entities/boleta-detalle.entity';
import { Concepto } from '../../src/entities/concepto.entity';

// Mock de AppDataSource.transaction para ejecutar el callback atómicamente
jest.mock('../../src/data-source', () => ({
  AppDataSource: {
    manager: {},
    getRepository: jest.fn(),
    transaction: jest.fn(async (cb: any) => cb({} as any)),
  },
}));

describe('HU-22: Emitir boletas inmutables y rectificarlas', () => {
  let mockPeriodoRepo: jest.Mocked<PeriodoRepository>;
  let mockBoletaRepo: jest.Mocked<BoletaRepository>;
  let mockBoletaDetalleRepo: jest.Mocked<BoletaDetalleRepository>;
  let mockBoletaPdfRepo: jest.Mocked<BoletaPdfRepository>;
  let mockCorrelativoRepo: jest.Mocked<CorrelativoRepository>;
  let mockConceptoRepo: jest.Mocked<ConceptoRepository>;
  let mockNovedadRepo: jest.Mocked<NovedadRepository>;
  let mockPersonalClient: jest.Mocked<PersonalClient>;
  let mockPdfClient: jest.Mocked<PdfClient>;

  let periodoService: PeriodoService;
  let boletaService: BoletaService;

  const conceptoHaberBasico: Concepto = {
    id: 'c-haber',
    codigo: 'HABER_BASICO',
    nombre: 'Haber básico',
    tipo: TipoConcepto.HABER,
    formaCalculo: FormaCalculo.SISTEMA,
    valor: null,
    base: null,
    automatico: true,
    esSistema: true,
    orden: 1,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conceptoAfp: Concepto = {
    id: 'c-afp',
    codigo: 'APORTE_LABORAL',
    nombre: 'Aporte AFP (12.71%)',
    tipo: TipoConcepto.DESCUENTO,
    formaCalculo: FormaCalculo.PORCENTAJE,
    valor: 12.71,
    base: BaseCalculo.TOTAL_GANADO,
    automatico: true,
    esSistema: false,
    orden: 100,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPeriodoRepo = {
      findById: jest.fn(),
      findByAnioMes: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(async (p) => p),
    } as any;

    mockBoletaRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByPeriodoId: jest.fn(),
      findByPeriodoIdWithDetalles: jest.fn(),
      deleteByPeriodoId: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(async (b) => ({ ...b, id: b.id ?? 'uuid-b-saved' })),
      saveMany: jest.fn(async (bs) => bs),
    } as any;

    mockBoletaDetalleRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByBoletaId: jest.fn(),
      hasBoletasWithConcepto: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(async (ds) => ds),
    } as any;

    mockBoletaPdfRepo = {
      findById: jest.fn(),
      findByIdConContenido: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(async (p) => p),
    } as any;

    let contadorCorrelativo = 0;
    mockCorrelativoRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      obtenerSiguiente: jest.fn(async () => ++contadorCorrelativo),
    } as any;

    mockConceptoRepo = {
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findAll: jest.fn().mockResolvedValue([conceptoHaberBasico, conceptoAfp]),
      save: jest.fn(),
      remove: jest.fn(),
    } as any;

    mockNovedadRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByPeriodo: jest.fn().mockResolvedValue([]),
      findByPeriodoFuncionarioAndConcepto: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockPersonalClient = {
      getFuncionariosActivos: jest.fn(),
    };

    mockPdfClient = {
      generarPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock binary content')),
    };

    periodoService = new PeriodoService(
      mockPeriodoRepo,
      mockBoletaRepo,
      mockBoletaDetalleRepo,
      mockBoletaPdfRepo,
      mockCorrelativoRepo,
      mockConceptoRepo,
      mockNovedadRepo,
      mockPersonalClient,
      mockPdfClient,
    );

    boletaService = new BoletaService(
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

  describe('CA-01, CA-03 (ST7.1: Emisión válida)', () => {
    it('emite el período y boletas asignando correlativo BP-AAAAMM-NNNN, PDF y hash SHA-256', async () => {
      const periodoMock: Periodo = {
        id: 'periodo-oct-2026',
        anio: 2026,
        mes: 10,
        estado: EstadoPeriodo.BORRADOR,
        fechaCalculo: new Date(),
        fechaEmision: null,
        emitidoPor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const boletaMock: Boleta = {
        id: 'boleta-1',
        periodoId: 'periodo-oct-2026',
        periodo: periodoMock,
        funcionarioId: 'func-1',
        numero: null,
        version: 1,
        estado: EstadoBoleta.BORRADOR,
        boletaOriginalId: null,
        boletaOriginal: null,
        motivoRectificacion: null,
        datosFuncionario: {
          nombres: 'Carlos',
          apellidos: 'Mamani',
          documentoIdentidad: '7492015',
          cargo: 'Ingeniero de Software',
          area: 'Tecnología',
          remuneracion: 10000,
        },
        diasTrabajados: 30,
        totalGanado: 10000,
        totalDescuentos: 1271,
        liquidoPagable: 8729,
        tieneAlerta: false,
        hashSha256: null,
        emitidaEn: null,
        createdAt: new Date(),
        detalles: [
          {
            id: 'd-1',
            boletaId: 'boleta-1',
            conceptoId: 'c-haber',
            conceptoCodigo: 'HABER_BASICO',
            conceptoNombre: 'Haber básico',
            tipo: TipoConcepto.HABER,
            baseMonto: 10000,
            porcentaje: null,
            monto: 10000,
            orden: 1,
          } as BoletaDetalle,
          {
            id: 'd-2',
            boletaId: 'boleta-1',
            conceptoId: 'c-afp',
            conceptoCodigo: 'APORTE_LABORAL',
            conceptoNombre: 'Aporte AFP',
            tipo: TipoConcepto.DESCUENTO,
            baseMonto: 10000,
            porcentaje: 12.71,
            monto: 1271,
            orden: 100,
          } as BoletaDetalle,
        ],
      };

      mockPeriodoRepo.findById.mockResolvedValue(periodoMock);
      mockBoletaRepo.findByPeriodoIdWithDetalles.mockResolvedValue([boletaMock]);

      const resultado = await periodoService.emitir('periodo-oct-2026', 'user-rrhh-1');

      expect(resultado.periodo.estado).toBe(EstadoPeriodo.EMITIDO);
      expect(mockCorrelativoRepo.obtenerSiguiente).toHaveBeenCalledWith('BOLETA', 2026, expect.anything());
      expect(boletaMock.numero).toBe('BP-202610-0001');
      expect(boletaMock.estado).toBe(EstadoBoleta.EMITIDA);
      expect(boletaMock.hashSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(mockPdfClient.generarPdf).toHaveBeenCalled();
      expect(mockBoletaPdfRepo.save).toHaveBeenCalled();
    });
  });

  describe('CA-02 (ST7.2: Emisión bloqueada por alerta)', () => {
    it('bloquea la emisión si alguna boleta tiene alerta activa o líquido negativo', async () => {
      const periodoMock: Periodo = {
        id: 'periodo-oct-2026',
        anio: 2026,
        mes: 10,
        estado: EstadoPeriodo.BORRADOR,
        fechaCalculo: new Date(),
        fechaEmision: null,
        emitidoPor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const boletaConAlerta: Boleta = {
        id: 'boleta-alerta',
        periodoId: 'periodo-oct-2026',
        periodo: periodoMock,
        funcionarioId: 'func-2',
        numero: null,
        version: 1,
        estado: EstadoBoleta.BORRADOR,
        boletaOriginalId: null,
        boletaOriginal: null,
        motivoRectificacion: null,
        datosFuncionario: {},
        diasTrabajados: 30,
        totalGanado: 3000,
        totalDescuentos: 3500,
        liquidoPagable: -500,
        tieneAlerta: true, // CA-02 alerta activa!
        hashSha256: null,
        emitidaEn: null,
        createdAt: new Date(),
      };

      mockPeriodoRepo.findById.mockResolvedValue(periodoMock);
      mockBoletaRepo.findByPeriodoIdWithDetalles.mockResolvedValue([boletaConAlerta]);

      await expect(periodoService.emitir('periodo-oct-2026', 'user-rrhh-1')).rejects.toThrow(
        /No se puede emitir el período: existen 1 boleta\(s\) con alertas o líquido pagable negativo/,
      );

      expect(mockBoletaPdfRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('CA-05, CA-06 (ST7.4: Rectificación trazable)', () => {
    it('rectifica una boleta emitida creando versión 2 y pasando original a RECTIFICADA', async () => {
      const periodoMock: Periodo = {
        id: 'periodo-oct-2026',
        anio: 2026,
        mes: 10,
        estado: EstadoPeriodo.EMITIDO,
        fechaCalculo: new Date(),
        fechaEmision: new Date(),
        emitidoPor: 'user-admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const boletaOriginalEmitida: Boleta = {
        id: 'boleta-v1',
        periodoId: 'periodo-oct-2026',
        periodo: periodoMock,
        funcionarioId: 'func-1',
        numero: 'BP-202610-0001',
        version: 1,
        estado: EstadoBoleta.EMITIDA,
        boletaOriginalId: null,
        boletaOriginal: null,
        motivoRectificacion: null,
        datosFuncionario: {
          nombres: 'Carlos',
          apellidos: 'Mamani',
          documentoIdentidad: '7492015',
          cargo: 'Ingeniero',
          area: 'Tecnología',
          remuneracion: 8000,
        },
        diasTrabajados: 30,
        totalGanado: 8000,
        totalDescuentos: 1016.8,
        liquidoPagable: 6983.2,
        tieneAlerta: false,
        hashSha256: 'a'.repeat(64),
        emitidaEn: new Date(),
        createdAt: new Date(),
      };

      mockBoletaRepo.findById.mockImplementation(async (id) => {
        if (id === 'boleta-v1') return boletaOriginalEmitida;
        return {
          id: 'boleta-v2',
          version: 2,
          boletaOriginalId: 'boleta-v1',
          numero: 'BP-202610-0002',
          estado: EstadoBoleta.EMITIDA,
          motivoRectificacion: 'Ajuste salarial retroactivo acordado',
          liquidoPagable: 7856.1,
        } as Boleta;
      });

      mockPeriodoRepo.findById.mockResolvedValue(periodoMock);

      const resultado = await boletaService.rectificar('boleta-v1', {
        motivo: 'Ajuste salarial retroactivo acordado',
      });

      expect(boletaOriginalEmitida.estado).toBe(EstadoBoleta.RECTIFICADA);
      expect(resultado.version).toBe(2);
      expect(resultado.boletaOriginalId).toBe('boleta-v1');
      expect(resultado.motivoRectificacion).toBe('Ajuste salarial retroactivo acordado');
      expect(mockPdfClient.generarPdf).toHaveBeenCalled();
    });

    it('rechaza rectificar una boleta que no se encuentra en estado EMITIDA', async () => {
      const boletaBorrador = {
        id: 'boleta-draft',
        estado: EstadoBoleta.BORRADOR,
      } as Boleta;

      mockBoletaRepo.findById.mockResolvedValue(boletaBorrador);

      await expect(boletaService.rectificar('boleta-draft', { motivo: 'Corrección temprana' })).rejects.toThrow(
        /Solo se puede rectificar una boleta en estado EMITIDA/,
      );
    });
  });
});
