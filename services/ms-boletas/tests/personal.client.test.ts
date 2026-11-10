import { AppError } from '@arca/shared';
import { HttpPersonalClient } from '../src/clients/personal.client';

const id = '11111111-1111-4111-8111-111111111111';
describe('HU-20 cliente de Personal', () => {
  afterEach(() => jest.restoreAllMocks());
  it('consulta el contrato interno enviando la clave sin acceder a otro schema', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id, nombres: 'Ejemplo' }), { status: 200 }));
    await new HttpPersonalClient().verificarFuncionario(id);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/internal/funcionarios/${id}`);
    expect(new Headers(options?.headers).get('X-Internal-Key')).toBe(process.env.INTERNAL_API_KEY);
  });
  it.each([{}, { id: '22222222-2222-4222-8222-222222222222' }])('rechaza respuesta incoherente', async (data) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
    await expect(new HttpPersonalClient().verificarFuncionario(id)).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
  });
  it('conserva el 404 de funcionario inexistente', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ code: 'NOT_FOUND' }), { status: 404 }));
    await expect(new HttpPersonalClient().verificarFuncionario(id)).rejects.toBeInstanceOf(AppError);
  });
  it.each([401, 403])(
    'un fallo interno %s se devuelve como dependencia 503, sin cerrar la sesión del usuario',
    async (status) => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify({ code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }), { status }),
        );
      await expect(new HttpPersonalClient().verificarFuncionario(id)).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
      });
    },
  );
});
