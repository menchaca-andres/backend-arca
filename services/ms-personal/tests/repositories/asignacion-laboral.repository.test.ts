import { AsignacionLaboral } from '../../src/entities/asignacion-laboral.entity';
import { AsignacionLaboralRepository } from '../../src/repositories/asignacion-laboral.repository';
import { limpiar, usarBase } from '../helpers/db';
import { crearCargo, crearFuncionario, nuevaAsignacion } from '../helpers/fixtures';

describe('AsignacionLaboralRepository', () => {
  usarBase();
  const repo = new AsignacionLaboralRepository();

  it('guarda y lee por id', async () => {
    const [funcionario, cargo] = await Promise.all([crearFuncionario(), crearCargo()]);
    const asignacion = await repo.save(nuevaAsignacion(funcionario.id, cargo.id));
    limpiar(AsignacionLaboral, { id: asignacion.id });

    const leida = await repo.findById(asignacion.id);
    expect(leida?.remuneracion).toBe(4500.5);
    expect(leida?.vigenteHasta).toBeNull();
  });

  it('rechaza dos asignaciones vigentes para el mismo funcionario', async () => {
    const [funcionario, cargo] = await Promise.all([crearFuncionario(), crearCargo()]);
    const asignacion = await repo.save(nuevaAsignacion(funcionario.id, cargo.id));
    limpiar(AsignacionLaboral, { id: asignacion.id });

    await expect(repo.save(nuevaAsignacion(funcionario.id, cargo.id))).rejects.toMatchObject({
      driverError: { constraint: 'ux_asignacion_vigente' },
    });
  });

  it('permite una nueva si la anterior esta cerrada', async () => {
    const [funcionario, cargo] = await Promise.all([crearFuncionario(), crearCargo()]);
    const cerrada = await repo.save(nuevaAsignacion(funcionario.id, cargo.id, { vigenteHasta: '2026-03-31' }));
    limpiar(AsignacionLaboral, { id: cerrada.id });
    const vigente = await repo.save(nuevaAsignacion(funcionario.id, cargo.id, { vigenteDesde: '2026-04-01' }));
    limpiar(AsignacionLaboral, { id: vigente.id });

    expect(vigente.id).not.toBe(cerrada.id);
  });

  it('rechaza una vigencia invertida', async () => {
    const [funcionario, cargo] = await Promise.all([crearFuncionario(), crearCargo()]);
    await expect(
      repo.save(nuevaAsignacion(funcionario.id, cargo.id, { vigenteHasta: '2025-01-01' })),
    ).rejects.toMatchObject({ driverError: { constraint: 'ck_asignacion_vigencia' } });
  });
});
