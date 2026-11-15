import { BaseCalculo, EstadoBoleta, EstadoPeriodo, FormaCalculo, TipoConcepto, type FuncionarioContrato } from '@arca/shared';
import { PeriodoService } from '../../src/services/periodo.service';
import { PeriodoRepository } from '../../src/repositories/periodo.repository';
import { BoletaRepository } from '../../src/repositories/boleta.repository';
import { BoletaDetalleRepository } from '../../src/repositories/boleta-detalle.repository';
import { ConceptoRepository } from '../../src/repositories/concepto.repository';
import { NovedadRepository } from '../../src/repositories/novedad.repository';
import { PersonalClient } from '../../src/clients/personal.client';
import { Concepto } from '../../src/entities/concepto.entity';
import { Periodo } from '../../src/entities/periodo.entity';
import { Boleta } from '../../src/entities/boleta.entity';
import { Novedad } from '../../src/entities/novedad.entity';
import { PlanillaCalculator } from '../../src/services/planilla-calculator';

// Mock AppDataSource.transaction para ejecutar el callback directamente
jest.mock('../../src/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(async (cb: any) => cb({} as any)),
  },
}));

describe('PeriodoService & PlanillaCalculator (HU-21: Calcular la planilla del período)', () => {
  let mockPeriodoRepo: jest.Mocked<PeriodoRepository>;
  let mockBoletaRepo: jest.Mocked<BoletaRepository>;
  let mockBoletaDetalleRepo: jest.Mocked<BoletaDetalleRepository>;
  let mockConceptoRepo: jest.Mocked<ConceptoRepository>;
  let mockNovedadRepo: jest.Mocked<NovedadRepository>;
  let mockPersonalClient: jest.Mocked<PersonalClient>;
  let service: PeriodoService;

  const conceptoHaberBasico: Concepto = {
    id: 'c-haber-basico',
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
    nombre: 'Aporte laboral AFP (12.71%)',
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
      save: jest.fn(async (p) => ({ ...p, id: p.id ?? 'p-1', createdAt: new Date(), updatedAt: new Date() })),
    } as any;

    mockBoletaRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByPeriodoId: jest.fn(),
      findByPeriodoIdWithDetalles: jest.fn(),
      deleteByPeriodoId: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(async (b) => ({ ...b, id: b.id ?? 'b-1' })),
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

    service = new PeriodoService(
      mockPeriodoRepo,
      mockBoletaRepo,
      mockBoletaDetalleRepo,
      mockConceptoRepo,
      mockNovedadRepo,
      mockPersonalClient,
    );
  });

  describe('CA-01: Apertura de período único', () => {
    it('abre un período nuevo en estado BORRADOR', async () => {
      mockPeriodoRepo.findByAnioMes.mockResolvedValue(null);

      const periodo = await service.abrir({ anio: 2026, mes: 11 });

      expect(periodo.anio).toBe(2026);
      expect(periodo.mes).toBe(11);
      expect(periodo.estado).toBe(EstadoPeriodo.BORRADOR);
      expect(mockPeriodoRepo.save).toHaveBeenCalled();
    });

    it('rechaza abrir un período si ya existe para ese mes y año', async () => {
      mockPeriodoRepo.findByAnioMes.mockResolvedValue({ id: 'p-existente', anio: 2026, mes: 11 } as Periodo);

      await expect(service.abrir({ anio: 2026, mes: 11 })).rejects.toThrow(
        'El período 11/2026 ya se encuentra registrado',
      );
    });
  });

  describe('CA-03: Prorrateo de días trabajados (base 30 días)', () => {
    it('ST6.1: Mes completo otorga 30 días', () => {
      const dias = PlanillaCalculator.calcularDiasTrabajados('2024-01-15', null, 2026, 10);
      expect(dias).toBe(30);
    });

    it('ST6.2: Ingreso a mitad de mes (día 16) otorga 15 días trabajados', () => {
      // Del 16 al 30 de octubre: 30 - 16 + 1 = 15 días
      const dias = PlanillaCalculator.calcularDiasTrabajados('2026-10-16', null, 2026, 10);
      expect(dias).toBe(15);
    });

    it('ST6.3: Baja a mitad de mes (día 15) otorga 15 días trabajados', () => {
      // Del 1 al 15 de octubre: 15 días
      const dias = PlanillaCalculator.calcularDiasTrabajados('2024-01-01', '2026-10-15', 2026, 10);
      expect(dias).toBe(15);
    });
  });

  describe('CA-02, CA-04, CA-05: Cálculo de boletas y detalle línea por línea', () => {
    it('calcula boleta estándar con Haber Básico y Aporte AFP 12.71% a 2 decimales', async () => {
      const periodoMock: Periodo = {
        id: 'p-oct-2026',
        anio: 2026,
        mes: 10,
        estado: EstadoPeriodo.BORRADOR,
        fechaCalculo: null,
        fechaEmision: null,
        emitidoPor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const funcionarioMock: FuncionarioContrato = {
        id: 'func-1',
        usuarioId: null,
        nombres: 'Carlos',
        apellidos: 'Mamani Flores',
        documentoIdentidad: '7492015',
        fechaIngreso: '2024-01-15',
        diasPrueba: 90,
        fechaRatificacion: '2024-04-15',
        fechaBaja: null,
        area: 'Tecnología',
        cargo: 'Desarrollador Senior',
        remuneracion: { monto: 10000, moneda: 'BOB' },
        estado: 'RATIFICADO' as any,
      };

      mockPeriodoRepo.findById.mockResolvedValue(periodoMock);
      mockPersonalClient.getFuncionariosActivos.mockResolvedValue([funcionarioMock]);
      mockBoletaRepo.findByPeriodoIdWithDetalles.mockResolvedValue([
        {
          id: 'b-1',
          periodoId: 'p-oct-2026',
          funcionarioId: 'func-1',
          version: 1,
          estado: EstadoBoleta.BORRADOR,
          diasTrabajados: 30,
          totalGanado: 10000,
          totalDescuentos: 1271,
          liquidoPagable: 8729,
          tieneAlerta: false,
        } as Boleta,
      ]);

      const resultado = await service.calcular('p-oct-2026');

      expect(resultado.resumen.totalGanado).toBe(10000);
      expect(resultado.resumen.totalDescuentos).toBe(1271);
      expect(resultado.resumen.totalLiquido).toBe(8729);
      expect(resultado.resumen.cantidadAlertas).toBe(0);
      expect(mockBoletaRepo.deleteByPeriodoId).toHaveBeenCalledWith('p-oct-2026', expect.anything());
    });

    it('ST6.4: Aplica novedades del período (bono extraordinario)', () => {
      const funcionarioMock: FuncionarioContrato = {
        id: 'func-1',
        usuarioId: null,
        nombres: 'Daniela',
        apellidos: 'Mendoza',
        documentoIdentidad: '4928104',
        fechaIngreso: '2024-01-15',
        diasPrueba: 90,
        fechaRatificacion: '2024-04-15',
        fechaBaja: null,
        area: 'Operaciones',
        cargo: 'Analista',
        remuneracion: { monto: 5000, moneda: 'BOB' },
        estado: 'RATIFICADO' as any,
      };

      const conceptoBono: Concepto = {
        id: 'c-bono',
        codigo: 'BONO_META',
        nombre: 'Bono por meta',
        tipo: TipoConcepto.HABER,
        formaCalculo: FormaCalculo.MONTO_FIJO,
        valor: null,
        base: null,
        automatico: false,
        esSistema: false,
        orden: 10,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const novedadBono: Novedad = {
        id: 'nov-1',
        anio: 2026,
        mes: 10,
        funcionarioId: 'func-1',
        conceptoId: 'c-bono',
        concepto: conceptoBono,
        monto: 1000,
        descripcion: 'Cumplimiento Q3',
        registradoPor: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const calculo = PlanillaCalculator.calcularBoletaFuncionario(
        funcionarioMock,
        [conceptoHaberBasico, conceptoBono, conceptoAfp],
        [novedadBono],
        2026,
        10,
      );

      // Haber basico: 5000, Bono: 1000 -> Total Ganado = 6000
      expect(calculo.totalGanado).toBe(6000);
      // AFP 12.71% sobre 6000 = 762.60
      expect(calculo.totalDescuentos).toBe(762.6);
      expect(calculo.liquidoPagable).toBe(5237.4);
      expect(calculo.tieneAlerta).toBe(false);
      expect(calculo.detalles.length).toBe(3);
    });

    it('ST6.5: Líquido negativo marca tieneAlerta = true', () => {
      const funcionarioMock: FuncionarioContrato = {
        id: 'func-1',
        usuarioId: null,
        nombres: 'Pedro',
        apellidos: 'García',
        documentoIdentidad: '5928172',
        fechaIngreso: '2024-01-15',
        diasPrueba: 90,
        fechaRatificacion: null,
        fechaBaja: null,
        area: 'Ventas',
        cargo: 'Ejecutivo',
        remuneracion: { monto: 3000, moneda: 'BOB' },
        estado: 'RATIFICADO' as any,
      };

      const conceptoAnticipo: Concepto = {
        id: 'c-anticipo',
        codigo: 'ANTICIPO_SUELDO',
        nombre: 'Anticipo de sueldo',
        tipo: TipoConcepto.DESCUENTO,
        formaCalculo: FormaCalculo.MONTO_FIJO,
        valor: null,
        base: null,
        automatico: false,
        esSistema: false,
        orden: 200,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const novedadAnticipo: Novedad = {
        id: 'nov-2',
        anio: 2026,
        mes: 10,
        funcionarioId: 'func-1',
        conceptoId: 'c-anticipo',
        concepto: conceptoAnticipo,
        monto: 3500, // Mayor al salario!
        descripcion: 'Anticipo solicitado',
        registradoPor: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const calculo = PlanillaCalculator.calcularBoletaFuncionario(
        funcionarioMock,
        [conceptoHaberBasico, conceptoAfp, conceptoAnticipo],
        [novedadAnticipo],
        2026,
        10,
      );

      // Total ganado: 3000. Descuentos: 381.30 (AFP) + 3500 (Anticipo) = 3881.30
      // Líquido: 3000 - 3881.30 = -881.30
      expect(calculo.liquidoPagable).toBe(-881.3);
      expect(calculo.tieneAlerta).toBe(true);
    });
  });

  describe('CA-07: Recálculo en BORRADOR y bloqueo en EMITIDO', () => {
    it('rechaza recalcular si el período ya fue emitido', async () => {
      mockPeriodoRepo.findById.mockResolvedValue({
        id: 'p-emitido',
        anio: 2026,
        mes: 10,
        estado: EstadoPeriodo.EMITIDO,
      } as Periodo);

      await expect(service.calcular('p-emitido')).rejects.toThrow(
        'Solo se puede calcular o recalcular un período en estado BORRADOR',
      );
    });
  });
});
