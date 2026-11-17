export const VARIABLES_PERMITIDAS = [
  'funcionario.nombre_completo',
  'funcionario.ci',
  'asignacion.cargo',
  'asignacion.area',
  'asignacion.remuneracion',
  'asignacion.remuneracion_literal',
  'funcionario.fecha_ingreso',
  'funcionario.dias_prueba',
  'empresa.razon_social',
  'fecha_emision',
] as const;

export type VariablePermitida = (typeof VARIABLES_PERMITIDAS)[number];

export const VARIABLES_OBLIGATORIAS: VariablePermitida[] = [
  'funcionario.fecha_ingreso',
  'asignacion.remuneracion',
  'funcionario.dias_prueba',
];

export const HELPERS_PERMITIDOS = ['fechaLarga', 'montoBs', 'numeroLiteral'];

export interface TemplateValidationResult {
  valid: boolean;
  variables: string[];
  desconocidas: string[];
  faltantesObligatorias: string[];
  errores: string[];
}

/**
 * Extrae las variables utilizadas dentro de los tags {{ ... }} de una plantilla Handlebars.
 * Tolera espacios y helpers (ej. {{fechaLarga funcionario.fecha_ingreso}}).
 */
export function extraerVariables(contenido: string): string[] {
  const regex = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const variablesEncontradas = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(contenido)) !== null) {
    const rawTag = match[1].trim();

    // Ignorar comentarios {{! ... }}
    if (rawTag.startsWith('!')) continue;

    // Si tiene helper (ej. "fechaLarga funcionario.fecha_ingreso"), tomar el argumento
    const partes = rawTag.split(/\s+/);
    if (partes.length > 1 && HELPERS_PERMITIDOS.includes(partes[0])) {
      variablesEncontradas.add(partes[1]);
    } else {
      variablesEncontradas.add(partes[0]);
    }
  }

  return Array.from(variablesEncontradas);
}

/**
 * Valida que una plantilla cumpla CA-04:
 * 1. No contenga variables fuera del catálogo permitido.
 * 2. Contenga obligatoriamente: fecha de ingreso, remuneración y días de prueba.
 */
export function validarVariablesPlantilla(contenido: string): TemplateValidationResult {
  const variables = extraerVariables(contenido);
  const permitidasSet = new Set<string>(VARIABLES_PERMITIDAS);

  const desconocidas = variables.filter((v) => !permitidasSet.has(v));
  const variablesSet = new Set<string>(variables);
  const faltantesObligatorias = VARIABLES_OBLIGATORIAS.filter((ob) => !variablesSet.has(ob));

  const errores: string[] = [];

  if (desconocidas.length > 0) {
    errores.push(
      `Variables no permitidas encontradas: ${desconocidas.map((v) => `{{${v}}}`).join(', ')}. Solo se permiten variables del catálogo oficial.`,
    );
  }

  if (faltantesObligatorias.length > 0) {
    errores.push(`Faltan variables obligatorias del Kata: ${faltantesObligatorias.map((v) => `{{${v}}}`).join(', ')}.`);
  }

  return {
    valid: errores.length === 0,
    variables,
    desconocidas,
    faltantesObligatorias,
    errores,
  };
}
