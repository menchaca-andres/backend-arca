import { DashboardService } from '../../src/services/dashboard.service';

describe('DashboardService (HU-25 CA-04)', () => {
  const mockPersonalStats = {
    activos: 15,
    enPrueba: 3,
    bajasMes: 1,
    funcionariosPorArea: [{ area: 'Tecnología', cantidad: 8 }],
    periodosPruebaPorVencer: [],
    cumplenGestionMes: [],
  };

  const mockVacacionesStats = {
    solicitudesPendientes: 2,
    alertas: [],
  };

  const mockBoletasStats = {
    masaSalarialUltimoPeriodo: {
      periodoId: 'p-1',
      anio: 2026,
      mes: 11,
      periodoNombre: '11/2026',
      monto: 85000,
      moneda: 'BOB',
      totalBoletas: 18,
    },
    historialMasaSalarial: [],
  };

  it('agrega los datos de los 3 microservicios cuando todos responden exitosamente', async () => {
    const service = new DashboardService({
      personalClient: { get: jest.fn().mockResolvedValue(mockPersonalStats) },
      vacacionesClient: { get: jest.fn().mockResolvedValue(mockVacacionesStats) },
      boletasClient: { get: jest.fn().mockResolvedValue(mockBoletasStats) },
    });

    const result = await service.obtenerDashboard();

    expect(result.personal).toEqual(mockPersonalStats);
    expect(result.vacaciones).toEqual(mockVacacionesStats);
    expect(result.boletas).toEqual(mockBoletasStats);
    expect(result.servicios).toEqual({
      personal: 'OK',
      vacaciones: 'OK',
      boletas: 'OK',
    });
    expect(result.timestamp).toBeDefined();
  });

  it('CA-04: tolera la caída de ms-personal sin interrumpir los demás servicios', async () => {
    const service = new DashboardService({
      personalClient: { get: jest.fn().mockRejectedValue(new Error('Conexión rehusada: ms-personal')) },
      vacacionesClient: { get: jest.fn().mockResolvedValue(mockVacacionesStats) },
      boletasClient: { get: jest.fn().mockResolvedValue(mockBoletasStats) },
    });

    const result = await service.obtenerDashboard();

    expect(result.personal).toBeNull();
    expect(result.servicios.personal).toBe('ERROR');
    expect(result.vacaciones).toEqual(mockVacacionesStats);
    expect(result.servicios.vacaciones).toBe('OK');
    expect(result.boletas).toEqual(mockBoletasStats);
    expect(result.servicios.boletas).toBe('OK');
  });

  it('CA-04: tolera la caída simultánea de múltiples servicios y retorna degradado', async () => {
    const service = new DashboardService({
      personalClient: { get: jest.fn().mockResolvedValue(mockPersonalStats) },
      vacacionesClient: { get: jest.fn().mockRejectedValue(new Error('ms-vacaciones timeout')) },
      boletasClient: { get: jest.fn().mockRejectedValue(new Error('ms-boletas 503')) },
    });

    const result = await service.obtenerDashboard();

    expect(result.personal).toEqual(mockPersonalStats);
    expect(result.servicios.personal).toBe('OK');
    expect(result.vacaciones).toBeNull();
    expect(result.servicios.vacaciones).toBe('ERROR');
    expect(result.boletas).toBeNull();
    expect(result.servicios.boletas).toBe('ERROR');
  });
});
