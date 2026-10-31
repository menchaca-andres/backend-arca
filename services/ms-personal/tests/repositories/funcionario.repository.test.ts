import { EstadoFuncionario, MotivoBaja } from '@arca/shared';
import { FuncionarioRepository } from '../../src/repositories/funcionario.repository';
import { usarBase } from '../helpers/db';
import { crearFuncionario, nuevoFuncionario } from '../helpers/fixtures';

describe('FuncionarioRepository', () => {
  usarBase();
  const repo = new FuncionarioRepository();

  it('guarda y lee por id con la fecha como string', async () => {
    const funcionario = await crearFuncionario();
    const leido = await repo.findById(funcionario.id);
    expect(leido?.fechaIngreso).toBe('2026-01-15');
    expect(leido?.estado).toBe(EstadoFuncionario.EN_PRUEBA);
    expect(leido?.diasPrueba).toBe(90);
  });

  it('rechaza un ci repetido', async () => {
    const funcionario = await crearFuncionario();
    await expect(repo.save(nuevoFuncionario({ ci: funcionario.ci }))).rejects.toMatchObject({
      driverError: { code: '23505' },
    });
  });

  it.each([
    ['ck_funcionario_sexo', { sexo: 'X' }],
    ['ck_funcionario_ci_expedido', { ciExpedido: 'XX' }],
    ['ck_funcionario_dias_prueba', { diasPrueba: 91 }],
    ['ck_funcionario_ratificado', { estado: EstadoFuncionario.RATIFICADO }],
    ['ck_funcionario_baja', { estado: EstadoFuncionario.BAJA }],
    ['ck_funcionario_fecha_baja', { fechaBaja: '2025-12-31' }],
    ['ck_funcionario_detalle_baja', { motivoBaja: MotivoBaja.OTRO }],
  ])('rechaza datos que violan %s', async (constraint, datos) => {
    await expect(repo.save(nuevoFuncionario(datos))).rejects.toMatchObject({ driverError: { constraint } });
  });
});
