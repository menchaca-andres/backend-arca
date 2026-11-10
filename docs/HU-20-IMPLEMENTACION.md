# HU-20 — Conceptos de haberes, descuentos y novedades

Implementación de Diego Coaquira en ms-boletas y frontend hermano. Cálculo de planilla, emisión y PDF quedan fuera de alcance (HU-21/HU-22).

## Criterios implementados

| Criterio | Resultado |
|---|---|
| CA-01 | Código único, nombre, HABER/DESCUENTO, MONTO_FIJO/PORCENTAJE, valor, base, automático, orden y estado. Código normalizado a mayúsculas e inmutable. |
| CA-02 | Porcentaje entre 0 y 100 inclusive; monto fijo positivo. Valor con hasta cuatro decimales y novedad con dos, conforme al modelo existente. |
| CA-03 | HABER_BASICO de sistema protegido y APORTE_LABORAL del 12,71 % sobre TOTAL_GANADO, automático. Semillas idempotentes sin sobrescribir configuración existente. |
| CA-04 | Se rechaza borrar conceptos referenciados por boletas o novedades. Pueden desactivarse. Editar solo cambia concepto y conserva snapshots de boleta_detalle. |
| CA-05 | Novedades por año/mes/funcionario/concepto, importe positivo y concepto activo no automático. Validación del funcionario por API interna de Personal. |

Se conserva la forma SISTEMA existente exclusivamente para Haber básico, que no admite edición, cambio de estado ni eliminación. La base es obligatoria en porcentajes y null/no aplica en montos fijos. No se permite convertir en automático un concepto con novedades existentes.

## Capas y API

Route → controller → service → repository. Zod valida las entradas; AppError mantiene el formato común. TypeORM y transacciones pertenecen al repository, dentro del schema boletas. Sin migraciones nuevas ni cambios a synchronize:false. No se consulta el schema de Personal.

Cliente interno de Personal mediante HttpClient de @arca/shared, con X-Internal-Key, timeout, reintento y validación del identificador recibido. Un 404 conserva funcionario no encontrado; otros fallos de dependencia devuelven 503 sin invalidar la sesión del usuario. El autor de la novedad procede del gateway.

Prefijo /api/v1/boletas; acceso exclusivo RRHH. [OpenAPI](api/hu-20-conceptos.openapi.yaml).

| Método | Ruta del servicio | Operación |
|---|---|---|
| GET | /conceptos?incluirInactivos=true o false | Catálogo; activos por defecto |
| POST | /conceptos | Crear concepto |
| PATCH | /conceptos/:id | Editar configuración, sin código |
| PATCH | /conceptos/:id/estado | Activar/desactivar |
| DELETE | /conceptos/:id | Borrar solo sin referencias |
| GET | /novedades?anio=&mes=&funcionarioId= | Consultar; año/mes obligatorios |
| POST | /novedades | Registrar importe individual |

## Períodos y concurrencia

Al registrar una novedad se abre un período BORRADOR si falta, sin calcular ni emitir planilla. Dentro de la transacción se bloquea la fila del período, se rechaza EMITIDO y se bloquea el concepto antes de comprobar elegibilidad. Un fallo revierte también el período recién creado. La unicidad existente evita duplicados por año/mes/funcionario/concepto.

Las futuras operaciones de HU-21/HU-22 deben coordinarse bloqueando la misma fila del período y comprobando su estado antes de calcular o emitir. Esas operaciones no se implementan en esta HU.

## Reproducción

La semilla de ms-boletas se integra en db:seed y docker/init.sh. No se ejecutó sobre Supabase.

- scripts/verify-hu20-local.ps1: PostgreSQL 16 descartable, proyecto arca-hu20-tests, base arca_hu20_test, 127.0.0.1:55420. Migra solo ms-boletas y ejecuta pruebas. La suite real exige HU20_LOCAL_DB_TEST=1 y destino local con ese nombre.
- scripts/review-hu20.ps1: arranque completo, proyecto arca-hu20-review, volumen propio, claves nuevas en .env.hu20.review ignorado por Git/Docker. Frontend http://127.0.0.1:55120/, gateway 127.0.0.1:58120 y PostgreSQL 127.0.0.1:54120. -Stop conserva sus datos.
- Frontend: /boletas/conceptos y /boletas/novedades para RRHH.

## Verificación observada el 10/11/2026

- Backend completo y frontend compilan.
- 80 pruebas aprobadas en seis suites, incluidas siete pruebas reales de BD: protección de sistema, referencias, snapshots emitidos, rollback, períodos emitidos y duplicado concurrente.
- Comprobador adicional de API con persistencia real y Personal simulado: permisos, guardado y semillas correctos.
- Arranque completo de Compose: nueve servicios persistentes healthy, init código 0 y HTTP 200 de frontend/gateway.
- Recorrido real por navegador con el servicio Personal del entorno local: creación y edición de concepto, registro de novedad, duplicado rechazado y persistencia después de recargar.
- Verificación de acceso con otro rol y restauración de la sesión RRHH. [Detalle del recorrido](HU-20-revision-navegador.md).
- Formato y lint revisados para publicación sobre el main actualizado del equipo.
- Transcripts completos y archivos privados excluidos del commit.

## Cierre pendiente

Aprobación del PR por otro integrante y demo real al equipo. No se realizó merge. Las historias HU-17 y HU-20 conservan ramas y worktrees independientes.

## Integración para publicación

Se incorporó main 132cde574c57b58ab3f376eb5807a0021d07e05a conservando los cambios de HU-09/HU-10 del equipo. Los proyectos TypeScript del backend y del frontend se comprobaron sin errores de tipos después de integrar. Las cuentas de 45/80 pruebas corresponden a las ejecuciones locales documentadas antes de esta sincronización; GitHub Actions repetirá sus controles sobre los commits publicados.

Novedades usa ahora getFuncionariosParaSelector, compatible con el padrón paginado incorporado por HU-09/HU-10.

## Segunda integración para publicación — 10/11/2026

Se incorporaron backend main 36508857d26f832a939102d92cd5a82679997988 y frontend main 555943c18b7ab270505e2f91f6069d98f898328c, que ya contienen la HU-17 del equipo (backend PR #9 y frontend PR #6). Sus archivos de contratos se conservan completos en las copias de HU-20. No hay coincidencias entre los archivos propios de HU-20 y los nuevos archivos recibidos.

Después de integrar: comprobación semántica TypeScript de los siete proyectos backend y las dos configuraciones frontend sin errores; lint de los archivos TypeScript propios de HU-20 sin errores ni advertencias. No se repitieron Jest ni Docker después de esta integración: la terminal del agente sigue bloqueada por Acceso denegado. Las 80 pruebas y el recorrido local descritos arriba corresponden a la ejecución anterior.

La publicación preparada ahora incluye únicamente las ramas de HU-20. La implementación local alternativa de HU-17 se conserva sin publicarla sobre la versión integrada del equipo. No se realizó merge ni cambios sobre Supabase.
