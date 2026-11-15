import type { FuncionarioContrato } from '@arca/shared';
import { numeroALiteralBolivianos } from './numero-literal';
import { formatearFechaLarga } from './template-renderer';

export interface ContratoContexto {
  empresa: {
    razon_social: string;
  };
  funcionario: {
    nombre_completo: string;
    ci: string;
    fecha_ingreso: string;
    dias_prueba: number;
  };
  asignacion: {
    cargo: string;
    area: string;
    remuneracion: number;
    remuneracion_literal: string;
  };
  fecha_emision: string;
}

export const RAZON_SOCIAL_ARCA = 'EMPRESA DE SERVICIOS AUXILIARES FINANCIEROS ARCA LTDA.';

export function construirContextoContrato(
  funcionario: FuncionarioContrato,
  fechaEmision: Date = new Date(),
): ContratoContexto {
  const nombreCompleto = `${funcionario.nombres} ${funcionario.apellidos}`.trim();
  const monto = funcionario.remuneracion?.monto ?? 0;

  return {
    empresa: {
      razon_social: RAZON_SOCIAL_ARCA,
    },
    funcionario: {
      nombre_completo: nombreCompleto,
      ci: funcionario.documentoIdentidad,
      fecha_ingreso: funcionario.fechaIngreso,
      dias_prueba: funcionario.diasPrueba,
    },
    asignacion: {
      cargo: funcionario.cargo,
      area: funcionario.area,
      remuneracion: monto,
      remuneracion_literal: numeroALiteralBolivianos(monto),
    },
    fecha_emision: formatearFechaLarga(fechaEmision),
  };
}

/**
 * CA-05: Encabezado de ARCA, numeración de páginas y espacio para firmas.
 * Genera el documento HTML completo que Gotenberg compila a PDF.
 */
export function prepararHtmlImpresion(
  contenidoRenderizado: string,
  numeroContrato: string,
  funcionarioNombre: string,
  ci: string,
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato ${numeroContrato}</title>
  <style>
    @page {
      size: letter;
      margin: 25mm 20mm 25mm 20mm;
      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-family: 'Times New Roman', Times, serif;
        font-size: 9pt;
        color: #555;
      }
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #111;
      margin: 0;
      padding: 0;
      text-align: justify;
    }
    .header-arca {
      text-align: center;
      margin-bottom: 25px;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
    }
    .header-arca h1 {
      font-size: 13pt;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e3a8a;
    }
    .header-arca h2 {
      font-size: 11pt;
      margin: 0;
      color: #4b5563;
      font-weight: normal;
    }
    .numero-contrato {
      font-size: 9.5pt;
      font-family: monospace;
      color: #374151;
      margin-top: 4px;
    }
    .contenido-contrato {
      white-space: pre-wrap;
      word-wrap: break-word;
      margin-bottom: 40px;
    }
    .firmas-container {
      margin-top: 60px;
      display: table;
      width: 100%;
      page-break-inside: avoid;
    }
    .firma-col {
      display: table-cell;
      width: 50%;
      text-align: center;
      vertical-align: top;
      padding: 0 20px;
    }
    .linea-firma {
      border-top: 1px solid #111;
      margin-top: 55px;
      padding-top: 6px;
      font-size: 10pt;
    }
    .linea-firma strong {
      display: block;
      margin-bottom: 2px;
    }
    .page-footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      text-align: right;
      font-size: 8.5pt;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header-arca">
    <h1>${RAZON_SOCIAL_ARCA}</h1>
    <h2>CONTRATO INDIVIDUAL DE TRABAJO</h2>
    <div class="numero-contrato">N°: ${numeroContrato}</div>
  </div>

  <div class="contenido-contrato">
${contenidoRenderizado}
  </div>

  <div class="firmas-container">
    <div class="firma-col">
      <div class="linea-firma">
        <strong>POR LA EMPRESA</strong>
        ARCA LTDA.<br>
        Representante Legal
      </div>
    </div>
    <div class="firma-col">
      <div class="linea-firma">
        <strong>POR EL TRABAJADOR</strong>
        ${funcionarioNombre}<br>
        C.I. ${ci}
      </div>
    </div>
  </div>
</body>
</html>`;
}
