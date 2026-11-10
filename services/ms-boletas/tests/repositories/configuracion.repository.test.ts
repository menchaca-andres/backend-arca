import { EstadoBoleta, EstadoPeriodo, TipoConcepto } from '@arca/shared';
import { AppDataSource } from '../../src/data-source';
import { ConfiguracionRepository } from '../../src/repositories/configuracion.repository';
import { Concepto } from '../../src/entities/concepto.entity';
import { Periodo } from '../../src/entities/periodo.entity';
import { Novedad } from '../../src/entities/novedad.entity';
import { Boleta } from '../../src/entities/boleta.entity';
import { BoletaDetalle } from '../../src/entities/boleta-detalle.entity';
import { usarBase, limpiar, unico, anioUnico } from '../helpers/db';
import { crearBoleta, crearConcepto, crearPeriodo } from '../helpers/fixtures';

const habilitada = process.env.HU20_LOCAL_DB_TEST === '1';
if (habilitada) {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1', '[::1]', 'db-test'].includes(url.hostname) || url.pathname !== '/arca_hu20_test') {
    throw new Error('HU-20 requiere la base local dedicada arca_hu20_test');
  }
}
const datos = {
  nombre: 'Bono',
  tipo: 'HABER' as const,
  formaCalculo: 'MONTO_FIJO' as const,
  valor: 100,
  base: null,
  automatico: false,
  orden: 1,
};
const autor = '11111111-1111-4111-8111-111111111111';
(habilitada ? describe : describe.skip)('HU-20 persistencia aislada', () => {
  usarBase();
  const repo = new ConfiguracionRepository();
  it('crea, traduce código duplicado y elimina un concepto sin referencias', async () => {
    const codigo = unico();
    const c = await repo.crearConcepto({ codigo, ...datos });
    limpiar(Concepto, { id: c.id });
    await expect(repo.crearConcepto({ codigo, ...datos })).rejects.toMatchObject({ code: 'CONFLICT' });
    await repo.eliminarConcepto(c.id);
    expect(await AppDataSource.getRepository(Concepto).existsBy({ id: c.id })).toBe(false);
  });
  it('semillas idempotentes, Haber básico protegido y aporte editable sin sobrescrituras', async () => {
    await repo.asegurarSemillas();
    await repo.asegurarSemillas();
    const items = await repo.listarConceptos(true);
    const basico = items.find((c) => c.codigo === 'HABER_BASICO')!;
    const aporte = items.find((c) => c.codigo === 'APORTE_LABORAL')!;
    limpiar(Concepto, { id: basico.id });
    limpiar(Concepto, { id: aporte.id });
    expect(items.filter((c) => c.codigo === 'HABER_BASICO')).toHaveLength(1);
    expect(aporte).toMatchObject({ valor: 12.71, base: 'TOTAL_GANADO', tipo: 'DESCUENTO', automatico: true });
    await expect(repo.actualizarConcepto(basico.id, datos)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(repo.cambiarEstado(basico.id, false)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(repo.eliminarConcepto(basico.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await repo.actualizarConcepto(aporte.id, {
      ...datos,
      nombre: aporte.nombre,
      tipo: 'DESCUENTO',
      formaCalculo: 'PORCENTAJE',
      valor: 10,
      base: 'TOTAL_GANADO',
      automatico: true,
    });
    await repo.asegurarSemillas();
    expect((await repo.listarConceptos(true)).find((c) => c.id === aporte.id)?.valor).toBe(10);
  });
  it('un concepto usado en boleta emitida no se elimina y editarlo conserva el snapshot', async () => {
    const boleta = await crearBoleta();
    const c = await crearConcepto();
    await AppDataSource.getRepository(Boleta).update(boleta.id, {
      estado: EstadoBoleta.EMITIDA,
      numero: `BOL-${unico()}`,
      hashSha256: 'a'.repeat(64),
      emitidaEn: new Date(),
    });
    const detalles = AppDataSource.getRepository(BoletaDetalle);
    const detalle = await detalles.save(
      detalles.create({
        boletaId: boleta.id,
        conceptoId: c.id,
        conceptoCodigo: c.codigo,
        conceptoNombre: c.nombre,
        tipo: TipoConcepto.HABER,
        baseMonto: null,
        porcentaje: null,
        monto: 100,
        orden: 1,
      }),
    );
    limpiar(BoletaDetalle, { id: detalle.id });
    await expect(repo.eliminarConcepto(c.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    await repo.actualizarConcepto(c.id, { ...datos, valor: 250 });
    expect(await detalles.findOneByOrFail({ id: detalle.id })).toEqual(detalle);
    expect((await repo.listarConceptos(true)).find((v) => v.id === c.id)?.valor).toBe(250);
    await repo.cambiarEstado(c.id, false);
    expect((await repo.listarConceptos(false)).some((v) => v.id === c.id)).toBe(false);
  });
  it('registra novedad, abre período borrador y evita duplicados', async () => {
    const c = await crearConcepto();
    const anio = anioUnico();
    const input = { anio, mes: 4, conceptoId: c.id, funcionarioId: autor, monto: 123.45 };
    limpiar(Periodo, { anio, mes: 4 });
    const n = await repo.crearNovedad(input, autor);
    limpiar(Novedad, { id: n.id });
    expect(n).toMatchObject({ monto: 123.45, registradoPor: autor });
    expect(await AppDataSource.getRepository(Periodo).findOneBy({ anio, mes: 4 })).toMatchObject({
      estado: 'BORRADOR',
    });
    await expect(repo.crearNovedad(input, autor)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await repo.listarNovedades({ anio, mes: 4, funcionarioId: autor })).toHaveLength(1);
    await expect(repo.eliminarConcepto(c.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(repo.actualizarConcepto(c.id, { ...datos, automatico: true })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });
  it('rechaza conceptos automáticos/inactivos y revierte el período creado', async () => {
    const c = await crearConcepto();
    await repo.actualizarConcepto(c.id, { ...datos, automatico: true });
    const anio = anioUnico();
    const input = { anio, mes: 5, conceptoId: c.id, funcionarioId: autor, monto: 10 };
    await expect(repo.crearNovedad(input, autor)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await AppDataSource.getRepository(Periodo).findOneBy({ anio, mes: 5 })).toBeNull();
    await repo.actualizarConcepto(c.id, { ...datos, automatico: false });
    await repo.cambiarEstado(c.id, false);
    await expect(repo.crearNovedad(input, autor)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  it('rechaza un período emitido sin alterar su estado', async () => {
    const p = await crearPeriodo();
    const c = await crearConcepto();
    await AppDataSource.getRepository(Periodo).update(p.id, { estado: EstadoPeriodo.EMITIDO });
    await expect(
      repo.crearNovedad({ anio: p.anio, mes: p.mes, conceptoId: c.id, funcionarioId: autor, monto: 10 }, autor),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await AppDataSource.getRepository(Periodo).findOneBy({ id: p.id })).toMatchObject({
      estado: EstadoPeriodo.EMITIDO,
    });
  });
  it('dos registros concurrentes del mismo funcionario/concepto producen uno solo', async () => {
    const p = await crearPeriodo();
    const c = await crearConcepto();
    const input = { anio: p.anio, mes: p.mes, conceptoId: c.id, funcionarioId: autor, monto: 10 };
    limpiar(Novedad, { conceptoId: c.id });
    const resultados = await Promise.allSettled([repo.crearNovedad(input, autor), repo.crearNovedad(input, autor)]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const fallo = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(fallo.reason).toMatchObject({ code: 'CONFLICT' });
    expect(await repo.listarNovedades({ anio: p.anio, mes: p.mes })).toHaveLength(1);
  });
});
