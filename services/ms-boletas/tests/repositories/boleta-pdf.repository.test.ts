import { randomUUID } from 'node:crypto';
import { BoletaPdf } from '../../src/entities/boleta-pdf.entity';
import { BoletaPdfRepository } from '../../src/repositories/boleta-pdf.repository';
import { limpiar, usarBase } from '../helpers/db';
import { crearBoleta } from '../helpers/fixtures';

const nuevo = (boletaId: string) =>
  Object.assign(new BoletaPdf(), { boletaId, contenido: Buffer.from('%PDF-prueba'), tamanoBytes: 11 });

describe('BoletaPdfRepository', () => {
  usarBase();
  const repo = new BoletaPdfRepository();

  it('guarda y lee por id sin cargar el contenido', async () => {
    const boleta = await crearBoleta();
    await repo.save(nuevo(boleta.id));
    limpiar(BoletaPdf, { boletaId: boleta.id });

    const leido = await repo.findById(boleta.id);
    expect(leido?.tamanoBytes).toBe(11);
    expect(leido?.contenido).toBeUndefined();
  });

  it('rechaza un PDF de una boleta que no existe', async () => {
    await expect(repo.save(nuevo(randomUUID()))).rejects.toMatchObject({ driverError: { code: '23503' } });
  });
});
