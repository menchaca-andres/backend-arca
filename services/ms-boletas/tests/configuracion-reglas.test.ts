import { EstadoPeriodo, FormaCalculo } from '@arca/shared';
import { ConfiguracionRepository } from '../src/repositories/configuracion.repository';
import { Concepto } from '../src/entities/concepto.entity';

const mockInsert = {
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  orIgnore: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({}),
};
const mockManager = {
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  existsBy: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  create: jest.fn((_entity: unknown, data: unknown) => data),
  createQueryBuilder: jest.fn(() => mockInsert),
};
jest.mock('../src/data-source', () => ({
  AppDataSource: {
    transaction: async (callback: (manager: unknown) => Promise<unknown>) => callback(mockManager),
  },
}));
const repo = new ConfiguracionRepository();
const input = {
  nombre: 'Bono',
  tipo: 'HABER' as const,
  formaCalculo: 'MONTO_FIJO' as const,
  valor: 100,
  base: null,
  automatico: false,
  orden: 1,
};
const novelty = { anio: 2026, mes: 11, funcionarioId: 'funcionario', conceptoId: 'concepto', monto: 10 };

describe('HU-20 reglas de protección sin BD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManager.findOne.mockResolvedValue({ id: 'concepto', ...input, activo: true, esSistema: false });
    mockManager.findOneOrFail.mockResolvedValue({ estado: EstadoPeriodo.BORRADOR });
    mockManager.existsBy.mockResolvedValue(false);
    mockManager.save.mockResolvedValue({ id: 'guardado' });
  });
  it.each(['editar', 'estado', 'eliminar'])('protege el concepto de sistema al %s', async (operacion) => {
    mockManager.findOne.mockResolvedValue({ esSistema: true, formaCalculo: FormaCalculo.SISTEMA });
    const action =
      operacion === 'editar'
        ? repo.actualizarConcepto('concepto', input)
        : operacion === 'estado'
          ? repo.cambiarEstado('concepto', false)
          : repo.eliminarConcepto('concepto');
    await expect(action).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockManager.save).not.toHaveBeenCalled();
    expect(mockManager.remove).not.toHaveBeenCalled();
  });
  it('un concepto referenciado solo puede desactivarse, no borrarse', async () => {
    mockManager.existsBy.mockResolvedValue(true);
    await expect(repo.eliminarConcepto('concepto')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mockManager.remove).not.toHaveBeenCalled();
    await repo.cambiarEstado('concepto', false);
    expect(mockManager.save).toHaveBeenCalledWith(Concepto, expect.objectContaining({ activo: false }));
  });
  it('editar un valor solo guarda el concepto y no los detalles de boletas', async () => {
    await repo.actualizarConcepto('concepto', { ...input, valor: 200 });
    expect(mockManager.save).toHaveBeenCalledTimes(1);
    expect(mockManager.save).toHaveBeenCalledWith(Concepto, expect.objectContaining({ valor: 200 }));
  });
  it('rechaza novedades de período emitido', async () => {
    mockManager.findOneOrFail.mockResolvedValue({ estado: EstadoPeriodo.EMITIDO });
    await expect(repo.crearNovedad(novelty, 'autor')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mockManager.save).not.toHaveBeenCalled();
  });
  it.each([
    { activo: false, automatico: false },
    { activo: true, automatico: true },
    { activo: true, automatico: false, esSistema: true },
  ])('rechaza concepto inelegible %j', async (estado) => {
    mockManager.findOne.mockResolvedValue(estado);
    await expect(repo.crearNovedad(novelty, 'autor')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mockManager.save).not.toHaveBeenCalled();
  });
  it('impide convertir a automático un concepto con novedades', async () => {
    mockManager.existsBy.mockResolvedValue(true);
    await expect(repo.actualizarConcepto('concepto', { ...input, automatico: true })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect(mockManager.save).not.toHaveBeenCalled();
  });
  it('un concepto inexistente produce 404', async () => {
    mockManager.findOne.mockResolvedValue(null);
    await expect(repo.cambiarEstado('inexistente', false)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
