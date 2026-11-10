# HU-20 — Revisión del sistema completo y navegador

Fecha: 10/11/2026. Entorno local `arca-hu20-review`, frontend http://127.0.0.1:55120 y gateway en 127.0.0.1:58120. No se utilizó Supabase.

## Arranque

El resultado compartido por Diego registra las ocho imágenes construidas, los nueve servicios persistentes healthy y el servicio init terminado con código 0. El script confirmó HTTP 200 del frontend y del health del gateway. Los microservicios permanecen sin puertos publicados al host.

## Recorrido comprobado en el navegador

1. Ingreso con el usuario de demo RRHH correcto. Se muestran Conceptos de planilla y Novedades del período.
2. Catálogo con HABER_BASICO de sistema, sin acciones de edición, y APORTE_LABORAL automático del 12,71 % sobre TOTAL_GANADO.
3. Creación de QA_HU20_BONO, nombre Bono de revisión HU-20, HABER, MONTO_FIJO de 250 Bs, no automático y orden 1. La interfaz mostró confirmación y el registro apareció en el catálogo.
4. Edición del concepto a 300 Bs confirmada en la tabla.
5. Carga de funcionarios desde el servicio Personal real del entorno local, con datos semilla del proyecto.
6. Registro de una novedad para Lucía Vargas Rojas, noviembre de 2026, con el concepto de prueba e importe 125,50 Bs. El backend validó al funcionario mediante la integración interna normal; no se sustituyó Personal por un servidor simulado en este recorrido.
7. Confirmación de registro y aparición de la novedad en la tabla. Una nueva solicitud con la misma combinación fue rechazada con aviso de duplicado.
8. Después de recargar la página se conservó una sola novedad por 125,50 Bs.
9. Ingreso con el usuario de demo FUNCIONARIO: los módulos de configuración no aparecen en su menú y la navegación directa a conceptos devuelve al inicio sin mostrar el catálogo.
10. Se restauró la sesión RRHH y se dejó abierta la pantalla de novedades con el registro de prueba visible en el listado.

## Alcance de la evidencia

Este recorrido complementa las 80 pruebas previamente aprobadas, incluidas las de persistencia, referencias a boletas emitidas, períodos emitidos, rollback y concurrencia. No se generaron ni emitieron boletas y no se alteraron sus importes históricos durante la revisión visual. No se afirma una prueba visual en todos los tamaños de pantalla.

Quedaron un concepto y una novedad claramente identificados como datos de revisión en la base local de este proyecto. No se eliminaron registros ni se modificó el porcentaje de la semilla de aporte laboral.

La revisión principal de interfaz e integración con Personal real queda comprobada. El cierre formal del DoD aún requiere publicación autorizada, revisión/aprobación de otro integrante y demo real al equipo. No se realizaron commit, push, PR ni merge.
