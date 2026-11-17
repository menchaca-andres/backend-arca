const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS_10 = [
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISEIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
];
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function leerCentenas(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  let texto = CENTENAS[c];

  if (d === 1) {
    texto += (texto ? ' ' : '') + DECENAS_10[u];
  } else if (d === 2) {
    if (u === 0) texto += (texto ? ' ' : '') + 'VEINTE';
    else texto += (texto ? ' ' : '') + 'VEINTI' + UNIDADES[u];
  } else if (d > 2) {
    texto += (texto ? ' ' : '') + DECENAS[d];
    if (u > 0) texto += ' Y ' + UNIDADES[u];
  } else if (u > 0) {
    texto += (texto ? ' ' : '') + UNIDADES[u];
  }

  return texto.trim();
}

/**
 * Convierte un número numérico a su representación literal en moneda boliviana.
 * Ejemplo: 8500.5 -> "OCHO MIL QUINIENTOS 50/100 BOLIVIANOS"
 */
export function numeroALiteralBolivianos(monto: number): string {
  if (isNaN(monto) || monto < 0) return 'CERO 00/100 BOLIVIANOS';

  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100)
    .toString()
    .padStart(2, '0');

  if (entero === 0) {
    return `CERO ${centavos}/100 BOLIVIANOS`;
  }

  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const cientos = entero % 1000;

  const partes: string[] = [];

  if (millones > 0) {
    if (millones === 1) partes.push('UN MILLON');
    else partes.push(`${leerCentenas(millones)} MILLONES`);
  }

  if (miles > 0) {
    if (miles === 1) partes.push('MIL');
    else partes.push(`${leerCentenas(miles)} MIL`);
  }

  if (cientos > 0) {
    partes.push(leerCentenas(cientos));
  }

  return `${partes.join(' ').trim()} ${centavos}/100 BOLIVIANOS`;
}
