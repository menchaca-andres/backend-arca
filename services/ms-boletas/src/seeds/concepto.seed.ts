import { BaseCalculo, FormaCalculo, TipoConcepto } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Concepto } from '../entities/concepto.entity';

export const CONCEPTOS_SEMILLA = [
  {
    codigo: 'HABER_BASICO',
    nombre: 'Haber básico',
    tipo: TipoConcepto.HABER,
    formaCalculo: FormaCalculo.SISTEMA,
    valor: null,
    base: null,
    automatico: true,
    esSistema: true,
    orden: 1,
    activo: true,
  },
  {
    codigo: 'APORTE_LABORAL',
    nombre: 'Aporte laboral AFP (12.71%)',
    tipo: TipoConcepto.DESCUENTO,
    formaCalculo: FormaCalculo.PORCENTAJE,
    valor: 12.71,
    base: BaseCalculo.TOTAL_GANADO,
    automatico: true,
    esSistema: false,
    orden: 100,
    activo: true,
  },
];

export async function sembrarConceptos(): Promise<Concepto[]> {
  const repo = AppDataSource.getRepository(Concepto);
  const resultados: Concepto[] = [];

  for (const datos of CONCEPTOS_SEMILLA) {
    let concepto = await repo.findOneBy({ codigo: datos.codigo });
    if (!concepto) {
      concepto = repo.create(datos);
      concepto = await repo.save(concepto);
      resultados.push(concepto);
    } else {
      resultados.push(concepto);
    }
  }

  return resultados;
}

if (require.main === module) {
  AppDataSource.initialize()
    .then(sembrarConceptos)
    .then(() => AppDataSource.destroy())
    .then(() => console.log('[ms-boletas] Semilla de conceptos aplicada'))
    .catch((err) => {
      console.error('[ms-boletas] La semilla de conceptos falló:', err);
      process.exit(1);
    });
}

