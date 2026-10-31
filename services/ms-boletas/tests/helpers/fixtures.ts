import { randomUUID } from 'node:crypto';
import { EstadoBoleta, FormaCalculo, TipoConcepto } from '@arca/shared';
import { Boleta } from '../../src/entities/boleta.entity';
import { Concepto } from '../../src/entities/concepto.entity';
import { Periodo } from '../../src/entities/periodo.entity';
import { BoletaRepository } from '../../src/repositories/boleta.repository';
import { ConceptoRepository } from '../../src/repositories/concepto.repository';
import { PeriodoRepository } from '../../src/repositories/periodo.repository';
import { anioUnico, limpiar, unico } from './db';

export const nuevoConcepto = (datos: Partial<Concepto> = {}) =>
  Object.assign(new Concepto(), {
    codigo: unico(),
    nombre: 'Prueba',
    tipo: TipoConcepto.HABER,
    formaCalculo: FormaCalculo.MONTO_FIJO,
    valor: 100,
    automatico: false,
    esSistema: false,
    orden: 1,
    ...datos,
  });

export const nuevoPeriodo = (datos: Partial<Periodo> = {}) =>
  Object.assign(new Periodo(), { anio: anioUnico(), mes: 11, ...datos });

export const nuevaBoleta = (periodoId: string, datos: Partial<Boleta> = {}) =>
  Object.assign(new Boleta(), {
    periodoId,
    funcionarioId: randomUUID(),
    estado: EstadoBoleta.BORRADOR,
    datosFuncionario: { nombre: 'Prueba' },
    diasTrabajados: 30,
    totalGanado: 5000,
    totalDescuentos: 635.5,
    liquidoPagable: 4364.5,
    tieneAlerta: false,
    ...datos,
  });

export async function crearConcepto() {
  const concepto = await new ConceptoRepository().save(nuevoConcepto());
  limpiar(Concepto, { id: concepto.id });
  return concepto;
}

export async function crearPeriodo() {
  const periodo = await new PeriodoRepository().save(nuevoPeriodo());
  limpiar(Periodo, { id: periodo.id });
  return periodo;
}

export async function crearBoleta() {
  const periodo = await crearPeriodo();
  const boleta = await new BoletaRepository().save(nuevaBoleta(periodo.id));
  limpiar(Boleta, { id: boleta.id });
  return boleta;
}
