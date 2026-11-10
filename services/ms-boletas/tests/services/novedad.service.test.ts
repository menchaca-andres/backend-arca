import { FormaCalculo, TipoConcepto } from '@arca/shared';
import { NovedadService } from '../../src/services/novedad.service';
import { NovedadRepository } from '../../src/repositories/novedad.repository';
import { ConceptoRepository } from '../../src/repositories/concepto.repository';
import { Concepto } from '../../src/entities/concepto.entity';
import { Novedad } from '../../src/entities/novedad.entity';

describe('NovedadService (HU-20 - CA-05)', () => {
  let mockNovedadRepo: jest.Mocked<NovedadRepository>;
  let mockConceptoRepo: jest.Mocked<ConceptoRepository>;
  let service: NovedadService;

  beforeEach(() => {
    mockNovedadRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByPeriodo: jest.fn(),
      findByPeriodoFuncionarioAndConcepto: jest.fn(),
      save: jest.fn(async (n) => ({
        ...n,
        id: n.id ?? 'uuid-n-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      delete: jest.fn(),
    } as any;

    mockConceptoRepo = {
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as any;

    service = new NovedadService(mockNovedadRepo, mockConceptoRepo);
  });

  it('registra una novedad exitosamente con concepto no automático', async () => {
    const conceptoNoAutomatico = {
      id: 'uuid-concepto-bono',
      codigo: 'BONO_PRODUCCION',
      nombre: 'Bono de Producción',
      tipo: TipoConcepto.HABER,
      formaCalculo: FormaCalculo.MONTO_FIJO,
      automatico: false,
      esSistema: false,
      activo: true,
    } as Concepto;

    mockConceptoRepo.findById.mockResolvedValue(conceptoNoAutomatico);
    mockNovedadRepo.findByPeriodoFuncionarioAndConcepto.mockResolvedValue(null);
    mockNovedadRepo.findById.mockImplementation(
      async (id) =>
        ({
          id,
          anio: 2026,
          mes: 10,
          funcionarioId: 'uuid-func-1',
          conceptoId: 'uuid-concepto-bono',
          concepto: conceptoNoAutomatico,
          monto: 800,
          descripcion: 'Cumplimiento excepcional de metas',
          registradoPor: 'uuid-user-admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as Novedad,
    );

    const resultado = await service.registrar(
      {
        anio: 2026,
        mes: 10,
        funcionarioId: 'uuid-func-1',
        conceptoId: 'uuid-concepto-bono',
        monto: 800,
        descripcion: 'Cumplimiento excepcional de metas',
      },
      'uuid-user-admin',
    );

    expect(resultado.monto).toBe(800);
    expect(mockNovedadRepo.save).toHaveBeenCalled();
  });

  it('rechaza registrar novedad si el concepto es automático', async () => {
    const conceptoAutomatico = {
      id: 'uuid-concepto-auto',
      codigo: 'APORTE_LABORAL',
      automatico: true,
      esSistema: false,
      activo: true,
    } as Concepto;

    mockConceptoRepo.findById.mockResolvedValue(conceptoAutomatico);

    await expect(
      service.registrar(
        {
          anio: 2026,
          mes: 10,
          funcionarioId: 'uuid-func-1',
          conceptoId: 'uuid-concepto-auto',
          monto: 100,
        },
        'uuid-user-admin',
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rechaza registrar novedad si el concepto está inactivo', async () => {
    const conceptoInactivo = {
      id: 'uuid-concepto-inactivo',
      codigo: 'BONO_OBSOLETO',
      automatico: false,
      esSistema: false,
      activo: false,
    } as Concepto;

    mockConceptoRepo.findById.mockResolvedValue(conceptoInactivo);

    await expect(
      service.registrar(
        {
          anio: 2026,
          mes: 10,
          funcionarioId: 'uuid-func-1',
          conceptoId: 'uuid-concepto-inactivo',
          monto: 100,
        },
        'uuid-user-admin',
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rechaza registrar novedad si el concepto es del sistema', async () => {
    const conceptoSistema = {
      id: 'uuid-concepto-sistema',
      codigo: 'HABER_BASICO',
      automatico: true,
      esSistema: true,
      activo: true,
    } as Concepto;

    mockConceptoRepo.findById.mockResolvedValue(conceptoSistema);

    await expect(
      service.registrar(
        {
          anio: 2026,
          mes: 10,
          funcionarioId: 'uuid-func-1',
          conceptoId: 'uuid-concepto-sistema',
          monto: 100,
        },
        'uuid-user-admin',
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('actualiza el monto y descripcion si ya existia una novedad para el mismo periodo y funcionario', async () => {
    const concepto = {
      id: 'uuid-concepto-bono',
      automatico: false,
      esSistema: false,
      activo: true,
    } as Concepto;

    const novedadExistente = {
      id: 'uuid-n-existente',
      anio: 2026,
      mes: 10,
      funcionarioId: 'uuid-func-1',
      conceptoId: 'uuid-concepto-bono',
      monto: 400,
      descripcion: 'Original',
    } as Novedad;

    mockConceptoRepo.findById.mockResolvedValue(concepto);
    mockNovedadRepo.findByPeriodoFuncionarioAndConcepto.mockResolvedValue(novedadExistente);
    mockNovedadRepo.findById.mockResolvedValue({
      ...novedadExistente,
      monto: 650,
      descripcion: 'Actualizado',
    } as Novedad);

    const res = await service.registrar(
      {
        anio: 2026,
        mes: 10,
        funcionarioId: 'uuid-func-1',
        conceptoId: 'uuid-concepto-bono',
        monto: 650,
        descripcion: 'Actualizado',
      },
      'uuid-user-admin',
    );

    expect(res.monto).toBe(650);
    expect(mockNovedadRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'uuid-n-existente',
        monto: 650,
      }),
    );
  });
});
