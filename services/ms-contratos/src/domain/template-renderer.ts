import Handlebars from 'handlebars';
import { numeroALiteralBolivianos } from './numero-literal';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function formatearFechaLarga(fechaStr: string | Date | undefined | null): string {
  if (!fechaStr) return '';
  const str = typeof fechaStr === 'string' ? fechaStr : fechaStr.toISOString().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (!match) return String(fechaStr);

  const anio = parseInt(match[1], 10);
  const mesIndex = parseInt(match[2], 10) - 1;
  const dia = parseInt(match[3], 10);

  return `${dia} de ${MESES[mesIndex] ?? ''} de ${anio}`;
}

export function formatearMontoBs(monto: number | undefined | null): string {
  if (monto === undefined || monto === null || isNaN(monto)) return 'Bs. 0,00';
  const parts = Number(monto).toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Bs. ${intPart},${parts[1]}`;
}

// Configurar helpers de Handlebars
Handlebars.registerHelper('fechaLarga', function (context) {
  return formatearFechaLarga(context);
});

Handlebars.registerHelper('montoBs', function (context) {
  return formatearMontoBs(context);
});

Handlebars.registerHelper('numeroLiteral', function (context) {
  return numeroALiteralBolivianos(Number(context));
});

export const SAMPLE_CONTEXT = {
  empresa: {
    razon_social: 'EMPRESA DE SERVICIOS AUXILIARES FINANCIEROS ARCA LTDA.',
  },
  funcionario: {
    nombre_completo: 'CARLOS ALBERTO MAMANI FLORES',
    ci: '4839201 LP',
    fecha_ingreso: '2026-11-15',
    dias_prueba: 90,
  },
  asignacion: {
    cargo: 'ANALISTA DE SISTEMAS',
    area: 'TECNOLOGÍA DE LA INFORMACIÓN',
    remuneracion: 8500,
    remuneracion_literal: 'OCHO MIL QUINIENTOS 00/100 BOLIVIANOS',
  },
  fecha_emision: '10 de noviembre de 2026',
};

/**
 * Renderiza una plantilla con Handlebars.
 * Si no se proporciona contexto, utiliza los datos de ejemplo predeterminados (SAMPLE_CONTEXT).
 */
export function renderTemplate(
  templateString: string,
  customContext?: Record<string, unknown>,
): string {
  const context = customContext ?? SAMPLE_CONTEXT;
  const compiled = Handlebars.compile(templateString, { noEscape: true });
  return compiled(context);
}

