import { randomUUID } from 'node:crypto';
import { ContratoPdf } from '../../src/entities/contrato-pdf.entity';
import { ContratoPdfRepository } from '../../src/repositories/contrato-pdf.repository';
import { limpiar, usarBase } from '../helpers/db';
import { crearContrato } from '../helpers/fixtures';

const nuevo = (contratoId: string) =>
  Object.assign(new ContratoPdf(), { contratoId, contenido: Buffer.from('%PDF-prueba'), tamanoBytes: 11 });

describe('ContratoPdfRepository', () => {
  usarBase();
  const repo = new ContratoPdfRepository();

  it('guarda y lee por id sin cargar el contenido', async () => {
    const contrato = await crearContrato();
    await repo.save(nuevo(contrato.id));
    limpiar(ContratoPdf, { contratoId: contrato.id });

    const leido = await repo.findById(contrato.id);
    expect(leido?.tamanoBytes).toBe(11);
    expect(leido?.contenido).toBeUndefined();
  });

  it('rechaza un PDF de un contrato que no existe', async () => {
    await expect(repo.save(nuevo(randomUUID()))).rejects.toMatchObject({ driverError: { code: '23503' } });
  });
});
