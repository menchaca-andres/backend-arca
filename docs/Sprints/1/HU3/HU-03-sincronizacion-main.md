# HU-03 — Integración con main antes del PR

Fecha: 02/11/2026. Base incorporada: 76523f7 (31 commits del equipo).

## Resoluciones

- Se preservan Node 22, Zod 4, entidades/repositorios, semilla, CI y herramientas de lint/formato incorporados por el equipo.
- Las rutas /api/v1/<servicio> conviven con las rutas de main /api/auth, /api/usuarios, /api/funcionarios, /api/areas, /api/cargos, /api/vacaciones, /api/contratos, /api/plantillas, /api/boletas, /api/periodos y /api/conceptos. El bloqueo de rutas internas se aplica a ambas familias. Se conservan CORS_ORIGIN y descarte de cabeceras de identidad aportadas por clientes, sin implementar JWT.
- Shared conserva bootstrap, contratos, validación de entorno, middlewares, factories de AppError y el cliente InternalClient. También conserva HttpClient y la redacción de secretos de esta entrega. AppError acepta tanto (code, message, details) como (code, message, status, details), y expone status y statusCode.
- /health conserva las cuatro capas y el formato común de errores. Su respuesta de éxito añade db: up para mantener el contrato del equipo.
- El Compose local conserva init para migraciones/semilla; el override de Supabase lo deja fuera del arranque normal mediante el perfil local-init. Se conserva el aislamiento por usuario local y los puertos internos de microservicios/Gotenberg.
- Los scripts shell se guardan con LF mediante .gitattributes. Las credenciales privadas permanecen ignoradas por Git y excluidas de imágenes.
- Se añaden pruebas de regresión de rutas, CORS, descarte de identidad y compatibilidad de shared.

## Verificación

Compilación, lint, formato y typecheck aprobados. Suite completa: 229 pruebas (190 Jest en 32 suites y 39 de shared), sin fallos, con PostgreSQL temporal. Se repitieron las 54 pruebas del gateway tras conservar las cabeceras del proxy. Init local validado.

Las seis imágenes Node 22 se reconstruyeron y desplegaron: nueve contenedores healthy, seis healthchecks reales contra Supabase con TLS validado, cinco rutas de salud por el proxy con 200, rutas internas bloqueadas con 403 en gateway y 401 sin clave en los cinco servicios, frontend con 200/CORS válido y smoke test aprobado. Ver [validación posterior a la integración](HU-03-validacion-pr.json). La base de pruebas no es el Supabase compartido.

Las evidencias previas CA02-compose-evidencia.json y CA03-supabase-health-evidencia.json corresponden a la ejecución anterior a esta sincronización; no se modifican para aparentar otra ejecución.
