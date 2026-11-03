# HU-03 — Configurar infraestructura y plantilla de microservicio

**Incidencia:** AR3-11. **Épica:** E1 — Fundaciones de arquitectura. **Responsable:** I3.
**Dependencia según Jira:** HU-01. **Fecha de actualización:** 02/11/2026.

**Estado:** implementación local documentada y CA-03 provisionado/verificado en Supabase el 02/11/2026; revisión del PR y demo pendientes de acreditar. Los seis componentes del backend están conectados a Supabase mediante un override; se conserva el modo local y su volumen.

## Evidencias y alcance

- Código físico de gateway y cinco aplicaciones integrado con shared y salud en capas.
- Última ejecución verificada: 109 pruebas Jest + Supertest aprobadas en 12 suites; compilación completa correcta.
- Shared dispone de 36 pruebas aprobadas y conserva node:test por excepción aprobada.
- Arranque completo verificado el 02/11/2026 mediante Compose: nueve contenedores healthy, incluyendo frontend en localhost:5174. HTML y assets con 200, carga visual y conectividad de red/CORS con gateway comprobadas. Ver CA02-compose-evidencia.json.
- El SQL de bootstrap está listo para el entorno local; su validación local se registra según el reporte del responsable. No se afirma una auditoría independiente de todos los permisos mediante conexiones reales.
- Las pruebas de salud simulan TypeORM; las de proxy utilizan servidores HTTP locales. Además, se ejecutó una verificación real de los seis contenedores contra Supabase: seis healthchecks con 200 y roles/schemas/TLS comprobados. El smoke test y las cinco rutas de salud por el gateway devolvieron 200.

## Matriz de criterios de aceptación

| Criterio | Estado | Implementación o evidencia |
|---|---|---|
| CA-01 — Estructura del repositorio | ✅ Con excepción aprobada | Gateway, cinco servicios y packages/shared. El frontend permanece en ../frontend-arca y Compose usa su Dockerfile; no se crea apps/frontend. |
| CA-02 — Arranque completo con Compose | ✅ Verificado | Compose combinado local + Supabase: nueve contenedores healthy, frontend en localhost:5174 visible en navegador, HTML/JS/CSS con 200 y conectividad de red/CORS con gateway verificada. Frontend construido desde ../frontend-arca sin modificar ese repo. Ver [evidencia](CA02-compose-evidencia.json) y [captura](CA02-frontend.png). |
| CA-03 — BD en la nube con seis schemas y roles | ✅ Provisionado y verificado | Proyecto arca-gestion-humana: seis schemas y roles arca_*, seis migraciones aplicadas, TLS validado y conexiones reales por usuario. 26 accesos propios permitidos y 130 accesos ajenos rechazados. Ver [evidencia](CA03-supabase-evidencia.json) y [alcance](CA03-supabase.md). |
| CA-04 — Plantilla común | ✅ Implementado | src/{routes,controllers,services,repositories,entities,schemas,clients,middlewares,config,migrations} en los servicios y gateway. |
| CA-05 — Salud real de la BD | ✅ Verificado contra Supabase | Seis /health devolvieron 200 desde los contenedores; se comprobaron roles, schemas, TLS y pools. Las respuestas 503 están cubiertas por Jest + Supertest. Ver [evidencia real](CA03-supabase-health-evidencia.json). |
| CA-06 — Enrutamiento y puertos | ✅ Implementado y probado | Gateway enruta los cinco prefijos acordados /api/v1/...; los microservicios no publican puertos al host. |
| CA-07 — Logger y errores comunes | ✅ Implementado | packages/shared/src/logger.ts, errors.ts y error-handler.ts. Formato { code, message, details }, admitiendo details: null. |
| CA-08 — Credenciales fuera del código | ✅ Con excepción local aprobada | Clave interna y credenciales reales en .env. Se permiten exclusivamente credenciales dummy de desarrollo local en docker-compose.yml e init-schemas.sql. |
| CA-09 — Protección de rutas internas | ✅ Implementado y probado | Los cinco servicios montan requireInternalKey y responden 401 sin clave válida. El gateway bloquea rutas internas con 403, incluidas variantes codificadas cubiertas por pruebas. |
| CA-10 — Cliente HTTP común | ✅ Implementado y probado | http-client.ts: timeout predeterminado de 3 s por intento, un reintento y error 503 ante indisponibilidad. |

## Justificaciones formales

### CA-08: credenciales dummy de desarrollo local

Se aprueba mantener las credenciales dummy de docker-compose.yml e init-schemas.sql exclusivamente para desarrollo local reproducible. No son secretos de producción ni deben reutilizarse en Supabase.

La excepción no autoriza publicar credenciales reales. INTERNAL_API_KEY y las conexiones reales permanecen en archivos .env ignorados por Git o mecanismos equivalentes. Los .env.example pueden versionarse sin secretos reales.

### Zod: endpoints /health

Se justifica no utilizar Zod en GET /health porque la operación no define ni consume body, query ni parámetros de ruta. La respuesta depende de comprobar PostgreSQL, no de datos aportados por el solicitante.

Esto no representa validación de entradas vacías mediante Zod ni rechazo de toda entrada no declarada. Es una excepción de aplicabilidad de la regla del DoD para esta operación. Las nuevas rutas que reciban datos deben validarlos con Zod.

Los errores de salud utilizan el formato común y devuelven 503 SERVICE_UNAVAILABLE sin exponer credenciales ni mensajes internos de PostgreSQL.

### CA-03: ejecución y verificación en Supabase

El 02/11/2026 se ejecutó la variante compatible docker/supabase-init-schemas.sql en el proyecto arca-gestion-humana mediante Session Pooler, con TLS validado. Se aplicaron las seis migraciones existentes como administrador. Los seis roles de runtime carecen de CREATE y acceden exclusivamente a su propio schema entre los seis schemas ARCA.

La verificación real con credenciales individuales permitió 26 consultas a tablas propias y rechazó 130 consultas a tablas ajenas con código 42501. Se conserva la convención de roles arca_* del equipo, con una contraseña distinta por servicio.

El bootstrap local init-schemas.sql no se ejecutó en Supabase. Los permisos de plataforma se conservan; el alcance es el aislamiento de datos de los seis schemas ARCA, no la eliminación absoluta de privilegios compartidos de PUBLIC. El Compose base mantiene el modo local. El override docker-compose.supabase.yml conecta los seis componentes a Supabase; sus /health y conexiones reales quedaron verificados en CA03-supabase-health-evidencia.json.

Consultar [procedimiento y alcance](CA03-supabase.md) y [reporte de evidencia](CA03-supabase-evidencia.json), sin contraseñas ni URLs con credenciales.


### Alcance de la verificación del frontend

El frontend actual es una plantilla React que muestra “ARCA – Gestión Humana”; App.tsx no invoca ApiService.health. CA-02 acredita su construcción, arranque, carga de assets, conectividad desde su contenedor al gateway y CORS válido para localhost:5174. No se afirma una prueba E2E de negocio ni se añaden funciones de otras historias. Los puertos 3000 y 5173 de Reecicla se conservaron.

## Definition of Done

| Requisito original | Estado | Evidencia o condición |
|---|---|---|
| Cumple todos sus criterios de aceptación | ✅ Implementación y evidencias registradas | CA-03 ejecutado y verificado en Supabase; CA-01 y CA-08 conservan las excepciones documentadas. El alcance de los privilegios de plataforma se detalla en CA03-supabase.md. |
| Código en capas y TypeORM en repositories, sin SQL crudo de negocio | ✅ Implementado en infraestructura | /health sigue las cuatro capas. DataSource, entidades y migraciones conservan sus responsabilidades de persistencia. SQL de bootstrap y migraciones pertenecen a administración de infraestructura. |
| Entrada validada con Zod y errores comunes | ✅ Con excepción justificada | /health no define entrada; nuevas operaciones con datos deben usar Zod. Las seis aplicaciones utilizan el manejador común. |
| Pruebas unitarias y al menos una Supertest por endpoint | ✅ Para endpoints de infraestructura implementados | Suites health e infra en seis workspaces; 109 pruebas aprobadas. Shared tiene 36 pruebas aprobadas. No hay reglas de negocio nuevas en esta HU. |
| Endpoints documentados con OpenAPI | ✅ Documentado | docs/api/internal-contracts.openapi.yaml incluye GET /health para los seis componentes, respuestas 200/503 y ausencia de autenticación en esta operación. Los contratos internos de HU-01 se conservan como contratos de otras HUs. |
| Corre con docker compose up sin pasos manuales recurrentes | ✅ Arranque completo verificado | Un comando con docker-compose.yml + docker-compose.supabase.yml levanta los nueve componentes, sin seleccionar servicios. Requiere preparación inicial de configuración privada y migraciones de nube ya aplicadas. El servicio init se conserva para el modo local y queda excluido en nube mediante el perfil local-init. |
| PR revisado y aprobado por otro integrante | ⏳ Pendiente de evidencia | Registrar el enlace y la aprobación real cuando se produzcan. No se crean ni aprueban PRs mediante este documento. |
| Demo de la HU mostrada al equipo | ⏳ Pendiente de evidencia | Registrar fecha, participantes y resultado de la demo cuando se realice. |

## Fuera de alcance

JWT en el gateway corresponde a HU-05; registro de auditoría a HU-24. No se implementan reglas de negocio de otras historias.

CI, ESLint y Prettier quedaron fuera del alcance acordado. El prefijo público adoptado es /api/v1/<servicio>.

## Archivos de referencia

- [README](../../../../README.md).
- [Guía de desarrollo](../../../guia-desarrollo.md).
- [OpenAPI](../../../api/internal-contracts.openapi.yaml).
- [Bootstrap local](../../../../docker/init-schemas.sql).
- [Compose](../../../../docker-compose.yml).

**Cierre formal:** CA-03 cuenta con evidencia real de Supabase. Falta acreditar la revisión del PR y la demo. Los checks de implementación no sustituyen esas evidencias.

> Sincronización con main: se conservaron los aportes del equipo (Node 22, CI, lint/formato, init local, contratos y utilidades). Ver [nota de integración](HU-03-sincronizacion-main.md). Las evidencias anteriores conservan su fecha; la nota registra las comprobaciones posteriores.
