import { EstadoFuncionario, MotivoAsignacion } from '@arca/shared';
import { FuncionarioService, validarEdadMinima } from '../../src/services/funcionario.service';
import { FuncionarioRepository } from '../../src/repositories/funcionario.repository';
import { CargoRepository } from '../../src/repositories/cargo.repository';
import { Cargo } from '../../src/entities/cargo.entity';
import { Funcionario } from '../../src/entities/funcionario.entity';
import type { RegistrarFuncionarioInput } from '../../src/schemas/funcionario.schema';

describe('FuncionarioService (HU-08: Registrar funcionario)', () => {
  let mockFuncionarioRepo: jest.Mocked<FuncionarioRepository>;
  let mockCargoRepo: jest.Mocked<CargoRepository>;
  let mockTransaction: jest.Mock;
  let mockEntityManager: any;
  let service: FuncionarioService;

  const cargoValido: Cargo = {
    id: 'cargo-uuid-1',
    areaId: 'area-uuid-1',
    nombre: 'Desarrollador Backend',
    salarioMin: 5000,
    salarioMax: 12000,
    activo: true,
    area: { id: 'area-uuid-1', codigo: 'TEC', nombre: 'Tecnología', activo: true, cargos: [] } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const inputValido: RegistrarFuncionarioInput = {
    ci: '1234567',
    ciExpedido: 'LP',
    nombres: 'Carlos',
    apellidos: 'Mamani',
    fechaNacimiento: '1995-05-15',
    sexo: 'M',
    correo: 'carlos@arca.bo',
    telefono: '70012345',
    direccion: 'Av. 6 de Agosto',
    cargoId: 'cargo-uuid-1',
    remuneracion: 8000,
    fechaIngreso: '2026-11-01',
    diasPrueba: 90,
  };

  beforeEach(() => {
    mockFuncionarioRepo = {
      findById: jest.fn(),
      findByCi: jest.fn(),
      findAll: jest.fn(),
      findWithAsignacionVigente: jest.fn(),
      save: jest.fn(),
    } as any;

    mockCargoRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByAreaAndNombre: jest.fn(),
      save: jest.fn(),
    } as any;

    mockEntityManager = {
      create: jest.fn((_cls, data) => ({ ...data, id: 'nuevo-uuid' })),
      save: jest.fn(async (_cls, entity) => ({
        ...entity,
        id: entity.id ?? 'nuevo-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    mockTransaction = jest.fn(async (callback) => callback(mockEntityManager));

    service = new FuncionarioService(mockFuncionarioRepo, mockCargoRepo, mockTransaction);
  });

  describe('validarEdadMinima helper', () => {
    it('acepta exactamente 18 años cumplidos', () => {
      expect(validarEdadMinima('2000-05-10', '2018-05-10')).toBe(true);
    });

    it('rechaza un día antes de cumplir 18 años', () => {
      expect(validarEdadMinima('2000-05-10', '2018-05-09')).toBe(false);
    });

    it('acepta más de 18 años', () => {
      expect(validarEdadMinima('1990-01-01', '2026-11-01')).toBe(true);
    });
  });

  describe('Registro exitoso (CA-01, CA-06, CA-08)', () => {
    it('crea el funcionario y su asignacion laboral en estado EN_PRUEBA', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);
      mockCargoRepo.findById.mockResolvedValue(cargoValido);

      const userId = 'operador-rrhh-uuid';
      const ficha = await service.registrar(inputValido, userId);

      expect(ficha.ci).toBe('1234567');
      expect(ficha.estado).toBe(EstadoFuncionario.EN_PRUEBA);
      expect(ficha.diasPrueba).toBe(90);
      expect(ficha.asignacionVigente).toMatchObject({
        cargoId: 'cargo-uuid-1',
        cargoNombre: 'Desarrollador Backend',
        areaNombre: 'Tecnología',
        remuneracion: 8000,
        vigenteDesde: '2026-11-01',
        vigenteHasta: null,
        motivo: MotivoAsignacion.INGRESO,
      });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('CA-02: CI duplicado', () => {
    it('rechaza si ya existe un funcionario con el mismo CI', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue({ id: 'f-existente' } as Funcionario);

      await expect(service.registrar(inputValido, 'user-id')).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
        message: 'Ya existe un funcionario con este CI',
      });

      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('CA-03: Edad mínima', () => {
    it('rechaza si el funcionario tiene menos de 18 años al ingresar', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);

      const menorDeEdad = {
        ...inputValido,
        fechaNacimiento: '2010-01-01',
        fechaIngreso: '2026-11-01', // 16 años
      };

      await expect(service.registrar(menorDeEdad, 'user-id')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'El funcionario debe tener al menos 18 años a la fecha de ingreso',
      });

      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('CA-04: Validación de banda salarial', () => {
    it('rechaza si la remuneración es inferior al salario mínimo del cargo', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);
      mockCargoRepo.findById.mockResolvedValue(cargoValido); // 5000 - 12000

      const bajoSueldo = { ...inputValido, remuneracion: 4500 };

      await expect(service.registrar(bajoSueldo, 'user-id')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rechaza si la remuneración es superior al salario máximo del cargo', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);
      mockCargoRepo.findById.mockResolvedValue(cargoValido); // 5000 - 12000

      const altoSueldo = { ...inputValido, remuneracion: 13000 };

      await expect(service.registrar(altoSueldo, 'user-id')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rechaza si el cargo no existe o está inactivo', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);
      mockCargoRepo.findById.mockResolvedValue({ ...cargoValido, activo: false });

      await expect(service.registrar(inputValido, 'user-id')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('CA-05: Días de prueba', () => {
    it('rechaza si los días de prueba superan 90', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);
      mockCargoRepo.findById.mockResolvedValue(cargoValido);

      const excesoDias = { ...inputValido, diasPrueba: 120 };

      await expect(service.registrar(excesoDias, 'user-id')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });
  });

  describe('CA-07: Transaccionalidad / Rollback', () => {
    it('propaga el error y revierte todo si falla el guardado dentro de la transacción', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);
      mockCargoRepo.findById.mockResolvedValue(cargoValido);

      mockEntityManager.save.mockRejectedValueOnce(new Error('Falla de conexión a base de datos'));

      await expect(service.registrar(inputValido, 'user-id')).rejects.toThrow(
        'Falla de conexión a base de datos',
      );
    });
  });
});

