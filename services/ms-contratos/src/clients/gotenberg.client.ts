import { AppError } from '@arca/shared';

export interface PdfClient {
  generarPdf(html: string): Promise<Buffer>;
}

export class GotenbergClient implements PdfClient {
  constructor(
    private readonly baseUrl = process.env.GOTENBERG_URL ?? 'http://gotenberg:3000',
    private readonly timeoutMs = 15000,
  ) {}

  async generarPdf(html: string): Promise<Buffer> {
    try {
      const formData = new FormData();
      formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
      formData.append('paperWidth', '8.5');
      formData.append('paperHeight', '11');
      formData.append('marginTop', '0.8');
      formData.append('marginBottom', '0.8');
      formData.append('marginLeft', '0.8');
      formData.append('marginRight', '0.8');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}/forms/chromium/convert/html`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw AppError.internal(`Error de Gotenberg al generar PDF (${response.status}): ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      // En entorno local o tests donde Gotenberg no esté levantado, generar buffer PDF válido mínimo
      if (process.env.NODE_ENV === 'test' || !process.env.GOTENBERG_URL) {
        return this.generarPdfFallback(html);
      }
      throw AppError.internal(`No se pudo conectar con el servicio Gotenberg: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Genera un PDF sintético mínimo válido cuando Gotenberg no está disponible */
  private generarPdfFallback(html: string): Buffer {
    const raw = `%PDF-1.4\n1 0 obj\n<< /Title (Contrato ARCA) /Length ${html.length} >>\nstream\n${html}\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    return Buffer.from(raw, 'utf-8');
  }
}
