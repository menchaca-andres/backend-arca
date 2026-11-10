import { TipoContrato } from '@arca/shared';
import { PlantillaService } from '../../src/services/plantilla.service';
import { PlantillaRepository } from '../../src/repositories/plantilla.repository';
import { PlantillaVersionRepository } from '../../src/repositories/plantilla-version.repository';
import { Plantilla } from '../../src/entities/plantilla.entity';
import { PlantillaVersion } from '../../src/entities/plantilla-version.entity';

describe('PlantillaService (HU-17)', () => {
  let mockPlantillaRepo: jest.Mocked<PlantillaRepository>;
  let mockVersionRepo: jest.Mocked<PlantillaVersionRepository>;
  let mockTransaction: jest.Mock;
  let mockEntityManager: any;
  let service: PlantillaService;

  const contenidoValido = `
    Contrato con {{funcionario.nombre_completo}}.
    Ingreso: {{funcionario.fecha_ingreso}}.
    Prueba: {{funcionario.dias_prueba}} dias.
    Remuneracion: {{asignacion.remuneracion}}.
  `;

  beforeEach(() => {
    mockPlantillaRepo = {
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    } as any;

    mockVersionRepo = {
      findById: jest.fn(),
      findActiveByPlantillaId: jest.fn(),
      findAllByPlantillaId: jest.fn(),
      getLatestVersionNumber: jest.fn(),
      save: jest.fn(),
    } as any;

    mockEntityManager = {
      create: jest.fn((_cls, data) => ({ ...data, id: 'mock-uuid' })),
      save: jest.fn(async (_cls, entity) => ({
        ...entity,
        id: entity.id ?? 'mock-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findOne: jest.fn(),
    };

    mockTransaction = jest.fn(async (callback) => callback(mockEntityManager));

    service = new PlantillaService(mockPlantillaRepo, mockVersionRepo, mockTransaction);
  });

  describe('Creación de Plantilla (CA-01, CA-04)', () => {
    it('crea exitosamente una plantilla y su versión 1 activa', async () => {
      mockPlantillaRepo.findByCodigo.mockResolvedValue(null);

      const res = await service.crear(
        {
          codigo: 'CTR-INDEF',
          nombre: 'Contrato Indefinido',
          tipo: TipoContrato.INDEFINIDO,
          contenido: contenidoValido,
        },
        'user-admin-uuid',
      );

      expect(res.codigo).toBe('CTR-INDEF');
      expect(res.versionActiva?.version).toBe(1);
      expect(res.versionActiva?.activa).toBe(true);
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
    });

    it('rechaza si el código de plantilla ya existe', async () => {
      mockPlantillaRepo.findByCodigo.mockResolvedValue({ id: 'p-existente' } as Plantilla);

      await expect(
        service.crear(
          {
            codigo: 'CTR-INDEF',
            nombre: 'Contrato',
            tipo: TipoContrato.INDEFINIDO,
            contenido: contenidoValido,
          },
          'user-uuid',
        ),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rechaza si faltan variables obligatorias del kata (CA-04)', async () => {
      mockPlantillaRepo.findByCodigo.mockResolvedValue(null);

      const sinObligatorias = 'Contrato de prueba sin variables requeridas';

      await expect(
        service.crear(
          {
            codigo: 'CTR-NUEVO',
            nombre: 'Incompleto',
            tipo: TipoContrato.PLAZO_FIJO,
            contenido: sinObligatorias,
          },
          'user-uuid',
        ),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });
  });

  describe('Actualización y Versionado (CA-05, CA-06)', () => {
    it('crea una nueva versión inmutable v2 e inactiva la v1', async () => {
      const plantillaExistente: Plantilla = {
        id: 'plantilla-1',
        codigo: 'CTR-INDEF',
        nombre: 'Contrato Indefinido',
        tipo: TipoContrato.INDEFINIDO,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const version1Existente: PlantillaVersion = {
        id: 'v1-id',
        plantillaId: 'plantilla-1',
        plantilla: plantillaExistente,
        version: 1,
        contenido: contenidoValido,
        variables: [],
        activa: true,
        creadoPor: 'user-anterior',
        createdAt: new Date(),
      };

      mockPlantillaRepo.findById.mockResolvedValue(plantillaExistente);
      mockEntityManager.findOne.mockResolvedValue(version1Existente);
      mockVersionRepo.getLatestVersionNumber.mockResolvedValue(1);

      const contenidoModificado = `${contenidoValido} Cláusula adicional de confidencialidad.`;

      const res = await service.actualizar(
        'plantilla-1',
        {
          contenido: contenidoModificado,
        },
        'user-editor-uuid',
      );

      // Debe inactivar v1
      expect(version1Existente.activa).toBe(false);

      // Debe generar v2 activa
      expect(res.versionActiva?.version).toBe(2);
      expect(res.versionActiva?.activa).toBe(true);
      expect(res.versionActiva?.contenido).toContain('confidencialidad');
    });

    it('devuelve 404 si la plantilla no existe al intentar actualizar', async () => {
      mockPlantillaRepo.findById.mockResolvedValue(null);

      await expect(
        service.actualizar('inexistente', { contenido: contenidoValido }, 'user-uuid'),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('Vista Previa (CA-07)', () => {
    it('genera la vista previa con datos de ejemplo', () => {
      const res = service.preview({
        contenido: `Contrato con {{funcionario.nombre_completo}} por {{montoBs asignacion.remuneracion}} desde {{funcionario.fecha_ingreso}} con {{funcionario.dias_prueba}} dias.`,
      });

      expect(res.contenidoRenderizado).toContain('CARLOS ALBERTO MAMANI FLORES');
      expect(res.contenidoRenderizado).toContain('Bs. 8.500,00');
    });
  });
});

