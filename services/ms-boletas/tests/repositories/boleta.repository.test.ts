import { EstadoBoleta } from '@arca/shared';
import { Boleta } from '../../src/entities/boleta.entity';
import { BoletaRepository } from '../../src/repositories/boleta.repository';
import { limpiar, unico, usarBase } from '../helpers/db';
import { crearBoleta, crearPeriodo, nuevaBoleta } from '../helpers/fixtures';

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
    const periodo = await crearPeriodo();
    const original = await repo.save(nuevaBoleta(periodo.id, { estado: EstadoBoleta.RECTIFICADA, ...emision() }));
    limpiar(Boleta, { id: original.id });
    const rectificada = await repo.save(
      nuevaBoleta(periodo.id, {
        funcionarioId: original.funcionarioId,
        estado: EstadoBoleta.EMITIDA,
        version: 2,
        boletaOriginalId: original.id,
        motivoRectificacion: 'Prueba',
        ...emision(),
      }),
    );
    limpiar(Boleta, { id: rectificada.id });

    expect((await repo.findById(rectificada.id))?.boletaOriginalId).toBe(original.id);
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
