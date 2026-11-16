import { EstadoBoleta } from '@arca/shared';
import { Boleta } from '../../src/entities/boleta.entity';
import { AppDataSource } from '../../src/data-source';
import { BoletaRepository } from '../../src/repositories/boleta.repository';
import { unico, usarBase } from '../helpers/db';
import { crearBoleta, crearPeriodo, nuevaBoleta, nuevoPeriodo } from '../helpers/fixtures';

const emision = () => ({ numero: `BP-${unico()}`, hashSha256: 'b'.repeat(64), emitidaEn: new Date() });

describe('BoletaRepository', () => {
  usarBase();
  const repo = new BoletaRepository();

  it('guarda y lee por id', async () => {
    const boleta = await crearBoleta();
    const leida = await repo.findById(boleta.id);
    expect(leida?.liquidoPagable).toBe(4364.5);
    expect(leida?.version).toBe(1);
  });

  it('rechaza dos boletas vigentes por periodo y funcionario', async () => {
    const boleta = await crearBoleta();
    await expect(
      repo.save(nuevaBoleta(boleta.periodoId, { funcionarioId: boleta.funcionarioId })),
    ).rejects.toMatchObject({ driverError: { constraint: 'ux_boleta_vigente' } });
  });

  it('permite la rectificacion y enlaza a la boleta original', async () => {
    // Las boletas emitidas o rectificadas no se pueden borrar (trigger de HU-22),
    // así que la prueba corre en una transacción que se revierte al final.
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const manager = queryRunner.manager;
      const periodo = await manager.save(nuevoPeriodo());
      const original = await manager.save(nuevaBoleta(periodo.id, { estado: EstadoBoleta.RECTIFICADA, ...emision() }));
      const rectificada = await manager.save(
        nuevaBoleta(periodo.id, {
          funcionarioId: original.funcionarioId,
          estado: EstadoBoleta.EMITIDA,
          version: 2,
          boletaOriginalId: original.id,
          motivoRectificacion: 'Prueba',
          ...emision(),
        }),
      );

      const leida = await manager.findOneBy(Boleta, { id: rectificada.id });
      expect(leida?.boletaOriginalId).toBe(original.id);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });

  it.each([
    ['ck_boleta_emision', { estado: EstadoBoleta.EMITIDA }],
    ['ck_boleta_liquido', { estado: EstadoBoleta.EMITIDA, liquidoPagable: -1, ...emision() }],
    ['ck_boleta_rectificacion', { version: 2 }],
    ['ck_boleta_dias_trabajados', { diasTrabajados: 31 }],
  ])('rechaza datos que violan %s', async (constraint, datos) => {
    const periodo = await crearPeriodo();
    await expect(repo.save(nuevaBoleta(periodo.id, datos))).rejects.toMatchObject({ driverError: { constraint } });
  });
});
