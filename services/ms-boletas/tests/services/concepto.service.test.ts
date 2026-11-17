import { FormaCalculo, TipoConcepto } from '@arca/shared';
import { ConceptoService } from '../../src/services/concepto.service';
import { ConceptoRepository } from '../../src/repositories/concepto.repository';
import { BoletaDetalleRepository } from '../../src/repositories/boleta-detalle.repository';
import { Concepto } from '../../src/entities/concepto.entity';

describe('ConceptoService (HU-20)', () => {
  let mockConceptoRepo: jest.Mocked<ConceptoRepository>;
  let mockBoletaDetalleRepo: jest.Mocked<BoletaDetalleRepository>;
  let service: ConceptoService;

  beforeEach(() => {
    mockConceptoRepo = {
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(async (c) => ({
        ...c,
        id: c.id ?? 'uuid-c-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      remove: jest.fn(),
    } as any;

    mockBoletaDetalleRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByBoletaId: jest.fn(),
      hasBoletasWithConcepto: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new ConceptoService(mockConceptoRepo, mockBoletaDetalleRepo);
  });

  describe('Creación de Conceptos (CA-01, CA-02)', () => {
    it('crea un concepto de tipo MONTO_FIJO exitosamente', async () => {
      mockConceptoRepo.findByCodigo.mockResolvedValue(null);

      const resultado = await service.crear({
        codigo: 'BONO_ANTIGUEDAD',
        nombre: 'Bono de Antigüedad',
        tipo: TipoConcepto.HABER,
        formaCalculo: FormaCalculo.MONTO_FIJO,
        valor: 500,
        base: null,
        automatico: true,
        orden: 10,
      });

      expect(resultado.codigo).toBe('BONO_ANTIGUEDAD');
      expect(resultado.esSistema).toBe(false);
      expect(resultado.activo).toBe(true);
      expect(mockConceptoRepo.save).toHaveBeenCalled();
    });

    it('rechaza si el código de concepto ya existe', async () => {
      mockConceptoRepo.findByCodigo.mockResolvedValue({
        id: 'uuid-1',
        codigo: 'HABER_BASICO',
      } as Concepto);

      await expect(
        service.crear({
          codigo: 'HABER_BASICO',
          nombre: 'Otro Haber',
          tipo: TipoConcepto.HABER,
          formaCalculo: FormaCalculo.SISTEMA,
          automatico: true,
          orden: 1,
        }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
  });

  describe('Actualización de Conceptos', () => {
    it('actualiza campos permitidos de un concepto', async () => {
      const conceptoExistente = {
        id: 'uuid-1',
        codigo: 'BONO_PROD',
        nombre: 'Bono Prod',
        tipo: TipoConcepto.HABER,
        formaCalculo: FormaCalculo.MONTO_FIJO,
        valor: 300,
        base: null,
        automatico: false,
        esSistema: false,
        orden: 20,
        activo: true,
      } as Concepto;

      mockConceptoRepo.findById.mockResolvedValue(conceptoExistente);

      const resultado = await service.actualizar('uuid-1', {
        nombre: 'Bono Producción Actualizado',
        valor: 450,
      });

      expect(resultado.nombre).toBe('Bono Producción Actualizado');
      expect(resultado.valor).toBe(450);
    });

    it('rechaza desactivar o alterar forma de cálculo de un concepto del sistema', async () => {
      const sistemaConcepto = {
        id: 'uuid-sys',
        codigo: 'HABER_BASICO',
        nombre: 'Haber básico',
        esSistema: true,
        formaCalculo: FormaCalculo.SISTEMA,
        activo: true,
      } as Concepto;

      mockConceptoRepo.findById.mockResolvedValue(sistemaConcepto);

      await expect(
        service.actualizar('uuid-sys', {
          activo: false,
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });

      await expect(
        service.actualizar('uuid-sys', {
          formaCalculo: FormaCalculo.MONTO_FIJO,
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    });
  });

  describe('Eliminación y Desactivación (CA-04)', () => {
    it('elimina físicamente un concepto que NO tiene boletas emitidas', async () => {
      const concepto = {
        id: 'uuid-sin-boletas',
        codigo: 'BONO_NUEVO',
        esSistema: false,
        activo: true,
      } as Concepto;

      mockConceptoRepo.findById.mockResolvedValue(concepto);
      mockBoletaDetalleRepo.hasBoletasWithConcepto.mockResolvedValue(false);

      const res = await service.eliminar('uuid-sin-boletas');

      expect(res.eliminado).toBe(true);
      expect(res.desactivado).toBe(false);
      expect(mockConceptoRepo.remove).toHaveBeenCalledWith(concepto);
    });

    it('desactiva lógicamente un concepto si ya está usado en boletas emitidas', async () => {
      const concepto = {
        id: 'uuid-con-boletas',
        codigo: 'REFRIGERIO',
        esSistema: false,
        activo: true,
      } as Concepto;

      mockConceptoRepo.findById.mockResolvedValue(concepto);
      mockBoletaDetalleRepo.hasBoletasWithConcepto.mockResolvedValue(true);

      const res = await service.eliminar('uuid-con-boletas');

      expect(res.eliminado).toBe(false);
      expect(res.desactivado).toBe(true);
      expect(mockConceptoRepo.remove).not.toHaveBeenCalled();
      expect(mockConceptoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'uuid-con-boletas',
          activo: false,
        }),
      );
    });

    it('rechaza eliminar un concepto del sistema', async () => {
      const sistemaConcepto = {
        id: 'uuid-sys',
        codigo: 'HABER_BASICO',
        esSistema: true,
      } as Concepto;

      mockConceptoRepo.findById.mockResolvedValue(sistemaConcepto);

      await expect(service.eliminar('uuid-sys')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    });
  });
});
