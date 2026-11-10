import {
  formatearFechaLarga,
  formatearMontoBs,
  renderTemplate,
  SAMPLE_CONTEXT,
} from '../../src/domain/template-renderer';
import { numeroALiteralBolivianos } from '../../src/domain/numero-literal';

describe('Domain: Template Renderer & Helpers (CA-07)', () => {
  it('formatea fechas en español largo', () => {
    expect(formatearFechaLarga('2026-11-15')).toBe('15 de noviembre de 2026');
    expect(formatearFechaLarga('2024-03-01')).toBe('1 de marzo de 2024');
  });

  it('formatea montos a moneda boliviana (Bs.)', () => {
    expect(formatearMontoBs(8500)).toBe('Bs. 8.500,00');
    expect(formatearMontoBs(12345.5)).toBe('Bs. 12.345,50');
  });

  it('convierte números a su representación literal oficial', () => {
    expect(numeroALiteralBolivianos(8500)).toBe('OCHO MIL QUINIENTOS 00/100 BOLIVIANOS');
    expect(numeroALiteralBolivianos(100)).toBe('CIEN 00/100 BOLIVIANOS');
    expect(numeroALiteralBolivianos(1500.5)).toBe('MIL QUINIENTOS 50/100 BOLIVIANOS');
  });

  it('renderiza una plantilla Handlebars con el contexto de muestra predeterminado', () => {
    const template = `Contrato entre {{empresa.razon_social}} y {{funcionario.nombre_completo}}. Sueldo: {{montoBs asignacion.remuneracion}}.`;
    const resultado = renderTemplate(template);

    expect(resultado).toContain('ARCA LTDA.');
    expect(resultado).toContain('CARLOS ALBERTO MAMANI FLORES');
    expect(resultado).toContain('Bs. 8.500,00');
  });

  it('renderiza con contexto personalizado cuando se proporciona', () => {
    const template = `Funcionario: {{funcionario.nombre_completo}} - Ingreso: {{fechaLarga funcionario.fecha_ingreso}}`;
    const resultado = renderTemplate(template, {
      funcionario: {
        nombre_completo: 'MARIA LOPEZ',
        fecha_ingreso: '2026-05-01',
      },
    });

    expect(resultado).toBe('Funcionario: MARIA LOPEZ - Ingreso: 1 de mayo de 2026');
  });
});

