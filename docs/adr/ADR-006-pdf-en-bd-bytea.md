# ADR-006: PDF guardado en la BD (bytea)

- **Estado:** Aceptada
- **Fecha:** 2026-10-29

## Contexto
Los contratos y las boletas generan PDFs que deben conservarse y poder descargarse. Los PDFs son pequeños (típicamente decenas o pocos cientos de KB) y no se quiere operar un almacenamiento de objetos para el kata.

## Decisión
Guardar el PDF en una columna `bytea` de una **tabla separada** de los metadatos (`contrato_pdf`, `boleta_pdf`), con `sha256`, `tamano_bytes` y `generado_en`. Los listados nunca leen el `bytea`.

## Alternativas consideradas
- **Sistema de archivos/volumen Docker:** simple, pero se pierde con el contenedor y complica la copia entre entornos.
- **S3 o similar:** escalable, pero infraestructura adicional fuera del alcance.

## Consecuencias
- (+) Un solo respaldo, transaccional con los metadatos, sin infraestructura extra.
- (−) Crece el tamaño de la BD y afecta el tier gratuito; revisar el límite del proveedor (ADR-004).
- (−) Si el volumen crece, migrar a almacenamiento de objetos manteniendo el mismo contrato de descarga.
