# ADR-007: Gotenberg para generar PDFs

- **Estado:** Aceptada
- **Fecha:** 2026-10-29

## Contexto
Los contratos (parametrizables) y las boletas deben salir como PDF con buena presentación. Se prefiere diseñarlos en HTML/CSS.

## Decisión
Desplegar Gotenberg como contenedor en Docker Compose, accesible solo desde la red interna. `ms-contratos` y `ms-boletas` envían HTML (multipart a `POST /forms/chromium/convert/html`) y reciben el PDF. Cada servicio es dueño de sus plantillas HTML.

## Alternativas consideradas
- **Librerías Node (PDFKit, Puppeteer embebido):** PDFKit exige maquetar por código; Puppeteer dentro de cada servicio engorda las imágenes.
- **Servicio externo de pago:** costo y dependencia innecesarios.

## Consecuencias
- (+) Plantillas en HTML/CSS, fáciles de parametrizar y de mantener.
- (−) Un contenedor más y punto único de falla para la generación de PDFs; se maneja con timeout, reintento y error `503`.
- (−) Imagen pesada (incluye Chromium).
