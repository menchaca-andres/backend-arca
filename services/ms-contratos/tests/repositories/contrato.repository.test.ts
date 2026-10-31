import { EstadoContrato } from '@arca/shared';
import { Contrato } from '../../src/entities/contrato.entity';
import { ContratoRepository } from '../../src/repositories/contrato.repository';
import { limpiar, usarBase } from '../helpers/db';
import { crearContrato, crearVersion, nuevoContrato } from '../helpers/fixtures';

describe('ContratoRepository', () => {
  usarBase();
  const repo = new ContratoRepository();

  it('guarda y lee por id', async () => {
    const contrato = await crearContrato();
    const leido = await repo.findById(contrato.id);
    expect(leido?.datos).toEqual({ nombre: 'Prueba' });
    expect(leido?.hashSha256).toHaveLength(64);
  });

  it('rechaza dos contratos vigentes para el mismo funcionario', async () => {
    const contrato = await crearContrato();
    await expect(
      repo.save(nuevoContrato(contrato.plantillaVersionId, { funcionarioId: contrato.funcionarioId, version: 2 })),
    ).rejects.toMatchObject({ driverError: { constraint: 'ux_contrato_vigente' } });
  });

  it('permite un contrato nuevo si el anterior fue reemplazado', async () => {
    const version = await crearVersion();
    const anterior = await repo.save(nuevoContrato(version.id, { estado: EstadoContrato.REEMPLAZADO }));
    limpiar(Contrato, { id: anterior.id });
    const vigente = await repo.save(nuevoContrato(version.id, { funcionarioId: anterior.funcionarioId, version: 2 }));
    limpiar(Contrato, { id: vigente.id });

    expect(vigente.estado).toBe(EstadoContrato.VIGENTE);
  });
});
