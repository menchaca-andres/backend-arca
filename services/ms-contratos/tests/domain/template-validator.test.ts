import {
  extraerVariables,
  validarVariablesPlantilla,
  VARIABLES_OBLIGATORIAS,
  VARIABLES_PERMITIDAS,
} from '../../src/domain/template-variables';

describe('Domain: Template Variables Validator (CA-02, CA-04)', () => {
  const plantillaValida = `
    Contrato de trabajo para {{funcionario.nombre_completo}} con CI {{funcionario.ci}}.
    Ingresa en fecha {{funcionario.fecha_ingreso}} con un período de prueba de {{funcionario.dias_prueba}} días.
    Percibirá una remuneración de {{asignacion.remuneracion}} ({{asignacion.remuneracion_literal}}).
    Cargo: {{asignacion.cargo}} en el área {{asignacion.area}}.
    Emitido por {{empresa.razon_social}} en fecha {{fecha_emision}}.
  `;

  it('extrae todas las variables utilizadas en la plantilla', () => {
    const vars = extraerVariables(plantillaValida);
    expect(vars).toContain('funcionario.nombre_completo');
    expect(vars).toContain('funcionario.ci');
    expect(vars).toContain('funcionario.fecha_ingreso');
    expect(vars).toContain('funcionario.dias_prueba');
    expect(vars).toContain('asignacion.remuneracion');
  });

  it('extrae variables incluso cuando usan helpers', () => {
    const conHelpers = `
      Fecha: {{fechaLarga funcionario.fecha_ingreso}}
      Sueldo: {{montoBs asignacion.remuneracion}}
      Literal: {{numeroLiteral asignacion.remuneracion}}
    `;
    const vars = extraerVariables(conHelpers);
    expect(vars).toContain('funcionario.fecha_ingreso');
    expect(vars).toContain('asignacion.remuneracion');
  });

  it('aprueba una plantilla que contiene las variables obligatorias y permitidas', () => {
    const resultado = validarVariablesPlantilla(plantillaValida);
    expect(resultado.valid).toBe(true);
    expect(resultado.desconocidas).toHaveLength(0);
    expect(resultado.faltantesObligatorias).toHaveLength(0);
  });

  it('rechaza una plantilla con variables no reconocidas (CA-04)', () => {
    const conDesconocidas = `
      {{funcionario.fecha_ingreso}}
      {{asignacion.remuneracion}}
      {{funcionario.dias_prueba}}
      {{variable_desconocida}}
      {{otro_campo_invalido}}
    `;
    const resultado = validarVariablesPlantilla(conDesconocidas);
    expect(resultado.valid).toBe(false);
    expect(resultado.desconocidas).toContain('variable_desconocida');
    expect(resultado.desconocidas).toContain('otro_campo_invalido');
    expect(resultado.errores[0]).toContain('Variables no permitidas encontradas');
  });

  it('rechaza una plantilla a la que le falta alguna de las 3 obligatorias del Kata (CA-04)', () => {
    // Falta fecha_ingreso
    const sinFechaIngreso = `
      {{asignacion.remuneracion}}
      {{funcionario.dias_prueba}}
    `;
    const r1 = validarVariablesPlantilla(sinFechaIngreso);
    expect(r1.valid).toBe(false);
    expect(r1.faltantesObligatorias).toContain('funcionario.fecha_ingreso');

    // Falta remuneracion
    const sinRemuneracion = `
      {{funcionario.fecha_ingreso}}
      {{funcionario.dias_prueba}}
    `;
    const r2 = validarVariablesPlantilla(sinRemuneracion);
    expect(r2.valid).toBe(false);
    expect(r2.faltantesObligatorias).toContain('asignacion.remuneracion');

    // Falta dias_prueba
    const sinDiasPrueba = `
      {{funcionario.fecha_ingreso}}
      {{asignacion.remuneracion}}
    `;
    const r3 = validarVariablesPlantilla(sinDiasPrueba);
    expect(r3.valid).toBe(false);
    expect(r3.faltantesObligatorias).toContain('funcionario.dias_prueba');
  });
});

