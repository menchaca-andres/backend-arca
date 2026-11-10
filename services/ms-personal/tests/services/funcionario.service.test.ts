import { EstadoFuncionario, MotivoAsignacion, MotivoBaja } from '@arca/shared';
import {
  FuncionarioService,
  validarEdadMinima,
  calcularFinPrueba,
  diasDiferencia,
} from '../../src/services/funcionario.service';
import { FuncionarioRepository } from '../../src/repositories/funcionario.repository';
import { CargoRepository } from '../../src/repositories/cargo.repository';
import { Cargo } from '../../src/entities/cargo.entity';
import { Funcionario } from '../../src/entities/funcionario.entity';
import type { RegistrarFuncionarioInput } from '../../src/schemas/funcionario.schema';

describe('FuncionarioService (HU-08, HU-11, HU-12)', () => {
  let mockFuncionarioRepo: jest.Mocked<FuncionarioRepository>;
  let mockCargoRepo: jest.Mocked<CargoRepository>;
  let mockTransaction: jest.Mock;
  let mockEntityManager: any;
  let mockAuthClient: any;
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
    mockAuthClient = {
      desactivarUsuarioPorFuncionario: jest.fn().mockResolvedValue({ id: 'user-1', desactivado: true }),
    };

    service = new FuncionarioService(mockFuncionarioRepo, mockCargoRepo, mockTransaction, mockAuthClient);
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

  describe('Date helpers (calcularFinPrueba, diasDiferencia)', () => {
    it('calcula la fecha de fin de prueba sumando diasPrueba a fechaIngreso', () => {
      expect(calcularFinPrueba('2026-01-01', 90)).toBe('2026-04-01');
      expect(calcularFinPrueba('2026-09-01', 60)).toBe('2026-10-31');
    });

    it('calcula la diferencia en días entre dos fechas correctamente', () => {
      expect(diasDiferencia('2026-04-01', '2026-04-01')).toBe(0);
      expect(diasDiferencia('2026-04-08', '2026-04-01')).toBe(7);
      expect(diasDiferencia('2026-03-25', '2026-04-01')).toBe(-7);
    });
  });

  describe('HU-08: Registro de funcionario', () => {
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

    it('CA-02: rechaza si ya existe un funcionario con el mismo CI', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue({ id: 'f-existente' } as Funcionario);

      await expect(service.registrar(inputValido, 'user-id')).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
        message: 'Ya existe un funcionario con este CI',
      });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('CA-03: rechaza si el funcionario tiene menos de 18 años al ingresar', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);

      const menorDeEdad = {
        ...inputValido,
        fechaNacimiento: '2010-01-01',
        fechaIngreso: '2026-11-01',
      };

      await expect(service.registrar(menorDeEdad, 'user-id')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('CA-04: rechaza si la remuneración está fuera de banda salarial', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);
      mockCargoRepo.findById.mockResolvedValue(cargoValido);

      await expect(service.registrar({ ...inputValido, remuneracion: 4000 }, 'user-id')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
      await expect(service.registrar({ ...inputValido, remuneracion: 15000 }, 'user-id')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });

    it('CA-05: rechaza si los días de prueba superan 90', async () => {
      mockFuncionarioRepo.findByCi.mockResolvedValue(null);
      mockCargoRepo.findById.mockResolvedValue(cargoValido);

      await expect(service.registrar({ ...inputValido, diasPrueba: 120 }, 'user-id')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });
  });

  describe('HU-11: Ratificar funcionario', () => {
    const funcionarioEnPrueba = {
      id: 'func-en-prueba-1',
      ci: '9000001',
      ciExpedido: 'CB',
      nombres: 'Lucía',
      apellidos: 'Vargas Rojas',
      fechaIngreso: '2026-06-01',
      diasPrueba: 90, // Fin prueba: 2026-08-30
      estado: EstadoFuncionario.EN_PRUEBA,
      fechaRatificacion: null,
      fechaBaja: null,
      motivoBaja: null,
      detalleBaja: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Funcionario;

    it('rechaza si el funcionario no existe', async () => {
      mockFuncionarioRepo.findById.mockResolvedValue(null);

      await expect(service.ratificar('inexistente')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
    });

    it('CA-01: rechaza ratificar si el funcionario no está en estado EN_PRUEBA', async () => {
      mockFuncionarioRepo.findById.mockResolvedValue({
        ...funcionarioEnPrueba,
        estado: EstadoFuncionario.RATIFICADO,
        fechaRatificacion: '2026-08-30',
      });

      await expect(service.ratificar(funcionarioEnPrueba.id)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'Solo se puede ratificar a un funcionario en estado EN_PRUEBA',
      });
    });

    it('CA-02: rechaza si aún no han pasado sus días de prueba', async () => {
      mockFuncionarioRepo.findById.mockResolvedValue({
        ...funcionarioEnPrueba,
        fechaIngreso: '2026-11-01',
        diasPrueba: 90, // Fin prueba: 2027-01-30
      });

      // Intenta ratificar el 2026-11-15 (aún no concluyó)
      await expect(
        service.ratificar(funcionarioEnPrueba.id, { fechaRatificacion: '2026-11-15' }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });

    it('CA-03: ratifica exitosamente pasando a RATIFICADO y guardando fecha_ratificacion', async () => {
      mockFuncionarioRepo.findById.mockResolvedValue({ ...funcionarioEnPrueba });
      mockFuncionarioRepo.findWithAsignacionVigente.mockResolvedValue({
        funcionario: {
          ...funcionarioEnPrueba,
          estado: EstadoFuncionario.RATIFICADO,
          fechaRatificacion: '2026-09-05',
        },
        asignacionVigente: null,
      });

      const resultado = await service.ratificar(funcionarioEnPrueba.id, {
        fechaRatificacion: '2026-09-05',
      });

      expect(resultado.estado).toBe(EstadoFuncionario.RATIFICADO);
      expect(resultado.fechaRatificacion).toBe('2026-09-05');
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('CA-04: obtenerPruebaPorVencer retorna funcionarios cuyo periodo de prueba termina en los próximos 7 días', async () => {
      // Supongamos fecha hoy: 2026-11-09
      mockFuncionarioRepo.findAll.mockResolvedValue([
        // Vence en 3 días (2026-11-12)
        {
          id: 'f-1',
          ci: '101',
          ciExpedido: 'LP',
          nombres: 'Ana',
          apellidos: 'Pérez',
          fechaIngreso: '2026-08-14',
          diasPrueba: 90, // Fin: 2026-11-12 (+3 días)
          estado: EstadoFuncionario.EN_PRUEBA,
        } as Funcionario,
        // Ya venció hace 5 días (2026-11-04) -> listo para ratificar
        {
          id: 'f-2',
          ci: '102',
          ciExpedido: 'CB',
          nombres: 'Luis',
          apellidos: 'Gómez',
          fechaIngreso: '2026-08-06',
          diasPrueba: 90, // Fin: 2026-11-04 (-5 días)
          estado: EstadoFuncionario.EN_PRUEBA,
        } as Funcionario,
        // Vence dentro de 30 días (no debe figurar)
        {
          id: 'f-3',
          ci: '103',
          ciExpedido: 'SC',
          nombres: 'Elena',
          apellidos: 'Sosa',
          fechaIngreso: '2026-10-15',
          diasPrueba: 60, // Fin: 2026-12-14 (+35 días)
          estado: EstadoFuncionario.EN_PRUEBA,
        } as Funcionario,
        // Ya ratificado (no debe figurar)
        {
          id: 'f-4',
          ci: '104',
          ciExpedido: 'OR',
          nombres: 'Pedro',
          apellidos: 'Ríos',
          fechaIngreso: '2026-08-14',
          diasPrueba: 90,
          estado: EstadoFuncionario.RATIFICADO,
        } as Funcionario,
      ]);

      const lista = await service.obtenerPruebaPorVencer(7, '2026-11-09');

      expect(lista).toHaveLength(2);
      expect(lista[0].id).toBe('f-2'); // Primero el más vencido
      expect(lista[0].listoParaRatificar).toBe(true);
      expect(lista[1].id).toBe('f-1');
      expect(lista[1].listoParaRatificar).toBe(false);
      expect(lista[1].diasRestantes).toBe(3);
    });
  });

  describe('HU-12: Dar de baja a un funcionario', () => {
    const funcionarioActivo = {
      id: 'func-activo-1',
      ci: '9000002',
      ciExpedido: 'LP',
      nombres: 'Marco',
      apellidos: 'Quispe Flores',
      fechaIngreso: '2026-05-01',
      diasPrueba: 60,
      estado: EstadoFuncionario.RATIFICADO,
      fechaBaja: null,
      motivoBaja: null,
      detalleBaja: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Funcionario;

    const asignacionVigente = {
      id: 'asig-vigente-1',
      funcionarioId: 'func-activo-1',
      cargoId: 'cargo-1',
      remuneracion: 3800,
      vigenteDesde: '2026-05-01',
      vigenteHasta: null,
      motivo: MotivoAsignacion.INGRESO,
      cargo: {
        id: 'cargo-1',
        nombre: 'Asistente',
        area: { id: 'area-1', nombre: 'Administración' },
      },
    } as any;

    it('rechaza si el funcionario no existe', async () => {
      mockFuncionarioRepo.findWithAsignacionVigente.mockResolvedValue(null);

      await expect(
        service.darDeBaja('inexistente', {
          fechaBaja: '2026-11-09',
          motivoBaja: MotivoBaja.RENUNCIA,
        }),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
    });

    it('CA-02: rechaza si el funcionario ya se encuentra dado de baja (doble baja)', async () => {
      mockFuncionarioRepo.findWithAsignacionVigente.mockResolvedValue({
        funcionario: { ...funcionarioActivo, estado: EstadoFuncionario.BAJA, fechaBaja: '2026-10-01' },
        asignacionVigente: null,
      });

      await expect(
        service.darDeBaja(funcionarioActivo.id, {
          fechaBaja: '2026-11-09',
          motivoBaja: MotivoBaja.DESPIDO,
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'El funcionario ya se encuentra dado de baja',
      });
    });

    it('CA-04: rechaza si la fecha de baja es anterior a la fecha de ingreso', async () => {
      mockFuncionarioRepo.findWithAsignacionVigente.mockResolvedValue({
        funcionario: { ...funcionarioActivo, fechaIngreso: '2026-05-01' },
        asignacionVigente,
      });

      await expect(
        service.darDeBaja(funcionarioActivo.id, {
          fechaBaja: '2026-04-15', // Anterior a mayo
          motivoBaja: MotivoBaja.RENUNCIA,
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
        message: 'La fecha de baja no puede ser anterior a la fecha de ingreso',
      });
    });

    it('CA-01, CA-02, CA-03: pasa a BAJA lógicamente y cierra la asignación vigente con fecha de baja', async () => {
      mockFuncionarioRepo.findWithAsignacionVigente
        .mockResolvedValueOnce({
          funcionario: { ...funcionarioActivo },
          asignacionVigente: { ...asignacionVigente },
        })
        .mockResolvedValueOnce({
          funcionario: {
            ...funcionarioActivo,
            estado: EstadoFuncionario.BAJA,
            fechaBaja: '2026-11-09',
            motivoBaja: MotivoBaja.RENUNCIA,
          },
          asignacionVigente: {
            ...asignacionVigente,
            vigenteHasta: '2026-11-09',
          },
        });

      const resultado = await service.darDeBaja(funcionarioActivo.id, {
        fechaBaja: '2026-11-09',
        motivoBaja: MotivoBaja.RENUNCIA,
      });

      expect(resultado.estado).toBe(EstadoFuncionario.BAJA);
      expect(resultado.fechaBaja).toBe('2026-11-09');
      expect(resultado.motivoBaja).toBe(MotivoBaja.RENUNCIA);
      expect(mockTransaction).toHaveBeenCalledTimes(1);

      // CA-05: Se invocó la desactivación de cuenta de usuario en ms-auth
      expect(mockAuthClient.desactivarUsuarioPorFuncionario).toHaveBeenCalledWith(
        funcionarioActivo.id,
        'Baja de funcionario: RENUNCIA',
      );
    });

    it('CA-05: si ms-auth falla o no tiene cuenta, la baja en personal igualmente se procesa', async () => {
      mockFuncionarioRepo.findWithAsignacionVigente
        .mockResolvedValueOnce({
          funcionario: { ...funcionarioActivo },
          asignacionVigente: { ...asignacionVigente },
        })
        .mockResolvedValueOnce({
          funcionario: {
            ...funcionarioActivo,
            estado: EstadoFuncionario.BAJA,
            fechaBaja: '2026-11-09',
            motivoBaja: MotivoBaja.FIN_CONTRATO,
          },
          asignacionVigente: { ...asignacionVigente, vigenteHasta: '2026-11-09' },
        });

      mockAuthClient.desactivarUsuarioPorFuncionario.mockResolvedValueOnce({
        id: null,
        desactivado: false,
      });

      const resultado = await service.darDeBaja(funcionarioActivo.id, {
        fechaBaja: '2026-11-09',
        motivoBaja: MotivoBaja.FIN_CONTRATO,
      });

      expect(resultado.estado).toBe(EstadoFuncionario.BAJA);
    });
  });

  describe('CA-07: Listado de padrón con filtro de estado', () => {
    it('devuelve todos los estados si se pide TODOS', async () => {
      mockFuncionarioRepo.findAll.mockResolvedValue([
        { id: '1', nombres: 'A', apellidos: 'A', ci: '1', estado: EstadoFuncionario.EN_PRUEBA } as any,
        { id: '2', nombres: 'B', apellidos: 'B', ci: '2', estado: EstadoFuncionario.RATIFICADO } as any,
        { id: '3', nombres: 'C', apellidos: 'C', ci: '3', estado: EstadoFuncionario.BAJA } as any,
      ]);

      const lista = await service.listarResumen('TODOS');
      expect(lista).toHaveLength(3);
    });

    it('devuelve únicamente funcionarios dados de baja cuando se filtra por BAJA', async () => {
      mockFuncionarioRepo.findAll.mockResolvedValue([
        { id: '1', nombres: 'A', apellidos: 'A', ci: '1', estado: EstadoFuncionario.EN_PRUEBA } as any,
        { id: '2', nombres: 'B', apellidos: 'B', ci: '2', estado: EstadoFuncionario.RATIFICADO } as any,
        { id: '3', nombres: 'C', apellidos: 'C', ci: '3', estado: EstadoFuncionario.BAJA } as any,
      ]);

      const lista = await service.listarResumen('BAJA');
      expect(lista).toHaveLength(1);
      expect(lista[0].id).toBe('3');
      expect(lista[0].estado).toBe(EstadoFuncionario.BAJA);
    });

    it('por defecto excluye las bajas si no se pasa parámetro', async () => {
      mockFuncionarioRepo.findAll.mockResolvedValue([
        { id: '1', nombres: 'A', apellidos: 'A', ci: '1', estado: EstadoFuncionario.EN_PRUEBA } as any,
        { id: '2', nombres: 'B', apellidos: 'B', ci: '2', estado: EstadoFuncionario.RATIFICADO } as any,
        { id: '3', nombres: 'C', apellidos: 'C', ci: '3', estado: EstadoFuncionario.BAJA } as any,
      ]);

      const lista = await service.listarResumen();
      expect(lista).toHaveLength(2);
      expect(lista.find((f) => f.estado === EstadoFuncionario.BAJA)).toBeUndefined();
    });
  });
});
