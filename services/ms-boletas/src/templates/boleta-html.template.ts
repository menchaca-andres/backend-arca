import type { Boleta } from '../entities/boleta.entity';
import type { Periodo } from '../entities/periodo.entity';
import type { BoletaDetalle } from '../entities/boleta-detalle.entity';

export function generarHtmlBoleta(
  boleta: Boleta,
  periodo: Periodo,
  detalles: BoletaDetalle[],
  hashSha256Preview?: string,
): string {
  const datos = (boleta.datosFuncionario ?? {}) as Record<string, any>;
  const haberes = detalles.filter((d) => d.tipo === 'HABER');
  const descuentos = detalles.filter((d) => d.tipo === 'DESCUENTO');

  const fechaEmisionStr = boleta.emitidaEn
    ? new Date(boleta.emitidaEn).toLocaleDateString('es-BO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('es-BO');

  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const nombreMes = meses[periodo.mes - 1] ?? `Mes ${periodo.mes}`;

  const filasHaberes = haberes
    .map(
      (h) => `
    <tr>
      <td>${h.conceptoNombre} (${h.conceptoCodigo})</td>
      <td class="monto">Bs. ${Number(h.monto).toFixed(2)}</td>
    </tr>
  `,
    )
    .join('');

  const filasDescuentos = descuentos
    .map(
      (d) => `
    <tr>
      <td>${d.conceptoNombre} ${d.porcentaje ? `(${d.porcentaje}%)` : ''}</td>
      <td class="monto">Bs. ${Number(d.monto).toFixed(2)}</td>
    </tr>
  `,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Boleta de Pago - ${boleta.numero ?? 'BORRADOR'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { padding: 30px; font-size: 11pt; color: #1e293b; background: #fff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company { font-size: 16pt; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .company-sub { font-size: 9pt; color: #64748b; margin-top: 3px; }
    .boleta-title { text-align: right; }
    .boleta-title h1 { font-size: 14pt; font-weight: 700; color: #0284c7; }
    .boleta-number { font-family: monospace; font-size: 12pt; font-weight: bold; margin-top: 4px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold; text-transform: uppercase; }
    .badge-rectificada { background: #fee2e2; color: #991b1b; }
    .badge-emitida { background: #dcfce7; color: #166534; }
    
    .grid-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 30px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 10pt; }
    .info-item strong { color: #475569; display: inline-block; width: 140px; }
    
    .rectificacion-box { background: #fff1f2; border: 1px solid #fecdd3; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 9pt; color: #9f1239; }
    .rectificacion-box strong { display: block; font-size: 10pt; margin-bottom: 2px; }

    .tables-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; font-size: 9pt; text-transform: uppercase; }
    th.monto { text-align: right; }
    td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
    td.monto { text-align: right; font-family: monospace; }
    
    .totales-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 10px; padding: 15px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 6px; text-align: center; }
    .total-item span { display: block; font-size: 9pt; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
    .total-item strong { font-size: 13pt; font-family: monospace; color: #0f172a; }
    .total-item.liquido strong { color: #0369a1; font-size: 15pt; }

    .firmas { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; text-align: center; font-size: 9.5pt; color: #475569; }
    .linea-firma { border-top: 1px solid #94a3b8; padding-top: 8px; }
    
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
    .hash { font-family: monospace; font-size: 7.5pt; color: #475569; max-width: 480px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">ARCA Ltda.</div>
      <div class="company-sub">Gestión del Talento Humano • NIT: 1029384029 • La Paz, Bolivia</div>
    </div>
    <div class="boleta-title">
      <h1>BOLETA DE PAGO</h1>
      <div class="boleta-number">${boleta.numero ?? 'BORRADOR'}</div>
      <div style="margin-top: 5px;">
        <span class="badge ${boleta.version > 1 ? 'badge-rectificada' : 'badge-emitida'}">
          ${boleta.version > 1 ? `Rectificación v${boleta.version}` : 'Versión Original'}
        </span>
      </div>
    </div>
  </div>

  <div class="grid-info">
    <div class="info-item"><strong>Funcionario:</strong> ${datos.nombres ?? ''} ${datos.apellidos ?? ''}</div>
    <div class="info-item"><strong>Período:</strong> ${nombreMes} / ${periodo.anio}</div>
    <div class="info-item"><strong>C.I.:</strong> ${datos.documentoIdentidad ?? '—'}</div>
    <div class="info-item"><strong>Cargo:</strong> ${datos.cargo ?? '—'}</div>
    <div class="info-item"><strong>Área:</strong> ${datos.area ?? '—'}</div>
    <div class="info-item"><strong>Sueldo Base:</strong> Bs. ${Number(datos.remuneracion ?? 0).toFixed(2)}</div>
    <div class="info-item"><strong>Días Trabajados:</strong> ${boleta.diasTrabajados} / 30 días</div>
    <div class="info-item"><strong>Fecha Emisión:</strong> ${fechaEmisionStr}</div>
  </div>

  ${
    boleta.version > 1
      ? `
  <div class="rectificacion-box">
    <strong>Boleta Rectificatoria (Versión ${boleta.version})</strong>
    Esta boleta rectifica y reemplaza legalmente a la versión previa original. Motivo registrado: "${boleta.motivoRectificacion ?? 'Rectificación formal autorizada'}".
  </div>
  `
      : ''
  }

  <div class="tables-container">
    <div>
      <table>
        <thead>
          <tr>
            <th>Concepto de Haber</th>
            <th class="monto">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${filasHaberes || '<tr><td colspan="2">Sin haberes registrados</td></tr>'}
        </tbody>
      </table>
    </div>

    <div>
      <table>
        <thead>
          <tr>
            <th>Concepto de Descuento</th>
            <th class="monto">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${filasDescuentos || '<tr><td colspan="2">Sin descuentos registrados</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <div class="totales-grid">
    <div class="total-item">
      <span>Total Ganado</span>
      <strong>Bs. ${Number(boleta.totalGanado).toFixed(2)}</strong>
    </div>
    <div class="total-item">
      <span>Total Descuentos</span>
      <strong style="color: #b91c1c;">- Bs. ${Number(boleta.totalDescuentos).toFixed(2)}</strong>
    </div>
    <div class="total-item liquido">
      <span>Líquido Pagable</span>
      <strong>Bs. ${Number(boleta.liquidoPagable).toFixed(2)}</strong>
    </div>
  </div>

  <div class="firmas">
    <div class="linea-firma">
      Firma Funcionario<br />
      C.I. ${datos.documentoIdentidad ?? '—'}
    </div>
    <div class="linea-firma">
      Gerencia / RRHH<br />
      ARCA Ltda.
    </div>
  </div>

  <div class="footer">
    <div>
      <strong>Huella Criptográfica SHA-256 (Auditoría Forense):</strong>
      <div class="hash">${boleta.hashSha256 ?? hashSha256Preview ?? 'Cálculo al persistir binario'}</div>
    </div>
    <div>Documento Laboral Oficial e Inmutable</div>
  </div>
</body>
</html>`;
}
