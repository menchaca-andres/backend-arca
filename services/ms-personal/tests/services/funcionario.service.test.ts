import { EstadoFuncionario, MotivoAsignacion, MotivoBaja, RolUsuario } from '@arca/shared';
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
      findHistorial: jest.fn().mockResolvedValue([]),
      buscarPadron: jest.fn(),
      buscarParaContrato: jest.fn(),
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

  describe('HU-09: Padrón paginado (CA-01, CA-02)', () => {
    it('pasa los filtros al repositorio y arma la página con área y cargo vigentes', async () => {
      mockFuncionarioRepo.buscarPadron.mockResolvedValue({
        items: [
          {
            funcionario: {
              id: '1',
              ci: '123',
              ciExpedido: 'LP',
              nombres: 'Ana',
              apellidos: 'Rojas',
              estado: EstadoFuncionario.RATIFICADO,
              fechaIngreso: '2025-01-02',
              diasPrueba: 90,
            } as any,
            asignacionVigente: {
              cargoId: 'cargo-1',
              cargo: { nombre: 'Contador', areaId: 'area-1', area: { id: 'area-1', nombre: 'Finanzas' } },
            } as any,
          },
        ],
        total: 41,
      });

      const filtros = { q: 'ana', estado: 'RATIFICADO' as const, page: 3, pageSize: 20 };
      const pagina = await service.listarPadron(filtros);

      expect(mockFuncionarioRepo.buscarPadron).toHaveBeenCalledWith(filtros);
      expect(pagina).toEqual({
        data: [
          {
            id: '1',
            ci: '123',
            ciExpedido: 'LP',
            nombreCompleto: 'Ana Rojas',
            estado: EstadoFuncionario.RATIFICADO,
            fechaIngreso: '2025-01-02',
            diasPrueba: 90,
            areaId: 'area-1',
            areaNombre: 'Finanzas',
            cargoId: 'cargo-1',
            cargoNombre: 'Contador',
          },
        ],
        page: 3,
        pageSize: 20,
        total: 41,
      });
    });

    it('deja área y cargo en null si el funcionario no tiene asignación vigente', async () => {
      mockFuncionarioRepo.buscarPadron.mockResolvedValue({
        items: [{ funcionario: { id: '1', nombres: 'A', apellidos: 'B' } as any, asignacionVigente: null }],
        total: 1,
      });

      const pagina = await service.listarPadron({ page: 1, pageSize: 20 });

      expect(pagina.data[0]).toMatchObject({ areaId: null, areaNombre: null, cargoId: null, cargoNombre: null });
    });
  });

  describe('HU-09: Ficha del funcionario (CA-03, CA-04)', () => {
    const funcionario = { id: 'func-1', ci: '123', nombres: 'Ana', apellidos: 'Rojas' } as any;

    it('incluye el historial de asignaciones', async () => {
      mockFuncionarioRepo.findWithAsignacionVigente.mockResolvedValue({ funcionario, asignacionVigente: null });
      mockFuncionarioRepo.findHistorial.mockResolvedValue([
        { id: 'a2', cargoId: 'c2', vigenteDesde: '2026-03-01', vigenteHasta: null, motivo: 'ASCENSO' } as any,
        { id: 'a1', cargoId: 'c1', vigenteDesde: '2025-01-02', vigenteHasta: '2026-02-28', motivo: 'INGRESO' } as any,
      ]);

      const ficha = await service.obtenerFicha('func-1');

      expect(mockFuncionarioRepo.findHistorial).toHaveBeenCalledWith('func-1');
      expect(ficha.historialAsignaciones.map((a) => a.id)).toEqual(['a2', 'a1']);
    });

    it('un FUNCIONARIO puede ver su propia ficha', async () => {
      mockFuncionarioRepo.findWithAsignacionVigente.mockResolvedValue({ funcionario, asignacionVigente: null });

      const ficha = await service.obtenerFicha('func-1', { rol: RolUsuario.FUNCIONARIO, funcionarioId: 'func-1' });

      expect(ficha.id).toBe('func-1');
    });

    it('un FUNCIONARIO recibe 403 si pide la ficha de otro', async () => {
      await expect(
        service.obtenerFicha('func-1', { rol: RolUsuario.FUNCIONARIO, funcionarioId: 'otro' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
      expect(mockFuncionarioRepo.findWithAsignacionVigente).not.toHaveBeenCalled();
    });

    it('RRHH puede ver cualquier ficha', async () => {
      mockFuncionarioRepo.findWithAsignacionVigente.mockResolvedValue({ funcionario, asignacionVigente: null });

      await expect(
        service.obtenerFicha('func-1', { rol: RolUsuario.RRHH, funcionarioId: null }),
      ).resolves.toBeDefined();
    });
  });

  describe('HU-09: Contrato interno (CA-05)', () => {
    it('lista los contratos paginados con la asignación vigente', async () => {
      mockFuncionarioRepo.buscarParaContrato.mockResolvedValue({
        items: [
          {
            funcionario: { id: '1', ci: '123', nombres: 'Ana', apellidos: 'Rojas' } as any,
            asignacionVigente: {
              remuneracion: 7000,
              cargo: { nombre: 'Contador', area: { nombre: 'Finanzas' } },
            } as any,
          },
        ],
        total: 1,
      });

      const filtros = { activosDesde: '2026-11-01', activosHasta: '2026-11-30', page: 1, pageSize: 100 };
      const pagina = await service.listarContratosInterno(filtros);

      expect(mockFuncionarioRepo.buscarParaContrato).toHaveBeenCalledWith(filtros);
      expect(pagina.total).toBe(1);
      expect(pagina.data[0]).toMatchObject({
        documentoIdentidad: '123',
        area: 'Finanzas',
        cargo: 'Contador',
        remuneracion: { monto: 7000, moneda: 'BOB' },
      });
    });
  });

  describe('HU-10: Datos de contacto (CA-05, CA-07)', () => {
    it('actualiza solo los campos enviados y normaliza el correo', async () => {
      const funcionario = {
        id: 'func-1',
        estado: EstadoFuncionario.RATIFICADO,
        correo: 'viejo@arca.bo',
        telefono: '700',
        direccion: 'Calle 1',
      } as any;
      mockFuncionarioRepo.findById.mockResolvedValue(funcionario);
      mockFuncionarioRepo.findWithAsignacionVigente.mockResolvedValue({ funcionario, asignacionVigente: null });

      await service.actualizarContacto('func-1', { correo: 'Nuevo@ARCA.bo', direccion: null });

      expect(mockFuncionarioRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ correo: 'nuevo@arca.bo', telefono: '700', direccion: null }),
      );
    });

    it('rechaza modificar a un funcionario de baja', async () => {
      mockFuncionarioRepo.findById.mockResolvedValue({ id: 'func-1', estado: EstadoFuncionario.BAJA } as any);

      await expect(service.actualizarContacto('func-1', { telefono: '700' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
      expect(mockFuncionarioRepo.save).not.toHaveBeenCalled();
    });

    it('responde 404 si el funcionario no existe', async () => {
      mockFuncionarioRepo.findById.mockResolvedValue(null);

      await expect(service.actualizarContacto('x', { telefono: '700' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });
});
