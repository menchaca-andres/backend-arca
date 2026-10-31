import { randomUUID } from 'node:crypto';
import { Evento } from '../../src/entities/evento.entity';
import { EventoRepository } from '../../src/repositories/evento.repository';
import { limpiar, usarBase } from '../helpers/db';

const datos = () => ({ ruta: '/api/prueba', servicio: 'ms-prueba', statusCode: 200, requestId: randomUUID() });

describe('EventoRepository', () => {
  usarBase();
  const repo = new EventoRepository();

  it('guarda y lee por id con la fecha por defecto', async () => {
    const evento = await repo.save(Object.assign(new Evento(), { ...datos(), metodo: 'GET', ip: '127.0.0.1' }));
    limpiar(Evento, { id: evento.id });

    const leido = await repo.findById(evento.id);
    expect(leido?.ip).toBe('127.0.0.1');
    expect(leido?.fecha).toBeInstanceOf(Date);
    expect(leido?.usuarioId).toBeNull();
  });

  it('rechaza un evento sin metodo', async () => {
    await expect(repo.save(Object.assign(new Evento(), datos()))).rejects.toMatchObject({
      driverError: { code: '23502' },
    });
  });
});
