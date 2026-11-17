import { EstadoFuncionario, MotivoAsignacion } from '@arca/shared';
import { AsignacionService, diaAnterior } from '../../src/services/asignacion.service';

describe('AsignacionService (HU-10: Modificar área, cargo y remuneración)', () => {
  let funcionarioRepo: any;
  let cargoRepo: any;
  let asignacionRepo: any;
  let funcionarioService: any;
  let service: AsignacionService;

  const actual = {
    id: 'asig-actual',
    funcionarioId: 'func-1',
    cargoId: 'cargo-1',
    remuneracion: 6000,
    vigenteDesde: '2026-01-15',
    vigenteHasta: null,
  };
  const cargoActual = { id: 'cargo-1', activo: true, salarioMin: 5000, salarioMax: 8000 };
  const cargoNuevo = { id: 'cargo-2', activo: true, salarioMin: 7000, salarioMax: 12000 };

  beforeEach(() => {
    funcionarioRepo = {
      findWithAsignacionVigente: jest.fn().mockResolvedValue({
        funcionario: { id: 'func-1', estado: EstadoFuncionario.RATIFICADO },
        asignacionVigente: { ...actual },
      }),
    };
    cargoRepo = {
      findById: jest.fn(async (id: string) => (id === 'cargo-2' ? cargoNuevo : id === 'cargo-1' ? cargoActual : null)),
    };
    asignacionRepo = { reemplazarVigente: jest.fn().mockResolvedValue({}) };
    funcionarioService = { obtenerFicha: jest.fn().mockResolvedValue({ id: 'func-1' }) };

    service = new AsignacionService(funcionarioRepo, cargoRepo, asignacionRepo, funcionarioService);
  });

  it('diaAnterior cruza meses y años', () => {
    expect(diaAnterior('2026-03-01')).toBe('2026-02-28');
    expect(diaAnterior('2027-01-01')).toBe('2026-12-31');
  });

  describe('CA-02: no edita la asignación actual', () => {
    it('cierra la actual el día anterior y crea una nueva vigente con cargo y remuneración', async () => {
      const ficha = await service.cambiar(
        'func-1',
        { cargoId: 'cargo-2', remuneracion: 9000, vigenteDesde: '2026-12-01', motivo: MotivoAsignacion.ASCENSO },
        'user-rrhh',
      );

      expect(asignacionRepo.reemplazarVigente).toHaveBeenCalledWith(
        'asig-actual',
        '2026-11-30',
        expect.objectContaining({
          funcionarioId: 'func-1',
          cargoId: 'cargo-2',
          remuneracion: 9000,
          vigenteDesde: '2026-12-01',
          vigenteHasta: null,
          motivo: MotivoAsignacion.ASCENSO,
          registradoPor: 'user-rrhh',
        }),
      );
      expect(ficha).toEqual({ id: 'func-1' });
    });

    it('solo con remuneración conserva el cargo actual', async () => {
      await service.cambiar(
        'func-1',
        { remuneracion: 7000, vigenteDesde: '2026-12-01', motivo: MotivoAsignacion.INCREMENTO },
        'user-rrhh',
      );

      const nueva = asignacionRepo.reemplazarVigente.mock.calls[0][2];
      expect(nueva).toMatchObject({ cargoId: 'cargo-1', remuneracion: 7000 });
    });

    it('rechaza un cambio que no modifica nada', async () => {
      await expect(
        service.cambiar(
          'func-1',
          { cargoId: 'cargo-1', remuneracion: 6000, vigenteDesde: '2026-12-01', motivo: MotivoAsignacion.CORRECCION },
          'user-rrhh',
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(asignacionRepo.reemplazarVigente).not.toHaveBeenCalled();
    });
  });

  describe('CA-03: la nueva vigencia es posterior a la actual', () => {
    it.each([
      ['el mismo día', '2026-01-15'],
      ['un día antes', '2026-01-14'],
    ])('rechaza si rige %s', async (_caso, vigenteDesde) => {
      await expect(
        service.cambiar(
          'func-1',
          { remuneracion: 7000, vigenteDesde, motivo: MotivoAsignacion.INCREMENTO },
          'user-rrhh',
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(asignacionRepo.reemplazarVigente).not.toHaveBeenCalled();
    });

    it('acepta el día siguiente y cierra la actual ese mismo día', async () => {
      await service.cambiar(
        'func-1',
        { remuneracion: 7000, vigenteDesde: '2026-01-16', motivo: MotivoAsignacion.INCREMENTO },
        'user-rrhh',
      );

      expect(asignacionRepo.reemplazarVigente).toHaveBeenCalledWith('asig-actual', '2026-01-15', expect.anything());
    });
  });

  describe('CA-04: banda salarial del cargo', () => {
    it('rechaza una remuneración fuera de la banda del cargo nuevo', async () => {
      await expect(
        service.cambiar(
          'func-1',
          { cargoId: 'cargo-2', vigenteDesde: '2026-12-01', motivo: MotivoAsignacion.TRASLADO },
          'user-rrhh',
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('rechaza una remuneración sobre el máximo del cargo actual', async () => {
      await expect(
        service.cambiar(
          'func-1',
          { remuneracion: 8500, vigenteDesde: '2026-12-01', motivo: MotivoAsignacion.INCREMENTO },
          'user-rrhh',
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('rechaza un cargo inexistente o inactivo', async () => {
      await expect(
        service.cambiar(
          'func-1',
          { cargoId: 'cargo-x', vigenteDesde: '2026-12-01', motivo: MotivoAsignacion.TRASLADO },
          'user-rrhh',
        ),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('CA-05: funcionario de baja', () => {
    it('no permite modificar a un funcionario dado de baja', async () => {
      funcionarioRepo.findWithAsignacionVigente.mockResolvedValue({
        funcionario: { id: 'func-1', estado: EstadoFuncionario.BAJA },
        asignacionVigente: null,
      });

      await expect(
        service.cambiar(
          'func-1',
          { remuneracion: 7000, vigenteDesde: '2026-12-01', motivo: MotivoAsignacion.INCREMENTO },
          'user-rrhh',
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(asignacionRepo.reemplazarVigente).not.toHaveBeenCalled();
    });
  });

  it('responde 404 si el funcionario no existe', async () => {
    funcionarioRepo.findWithAsignacionVigente.mockResolvedValue(null);

    await expect(
      service.cambiar(
        'x',
        { remuneracion: 7000, vigenteDesde: '2026-12-01', motivo: MotivoAsignacion.INCREMENTO },
        'user-rrhh',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
