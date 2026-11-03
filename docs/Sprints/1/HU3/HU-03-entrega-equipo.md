# HU-03 — Entrega de infraestructura al equipo

**Proyecto:** ARCA — Gestión Humana.  
**Responsable de esta entrega:** Diego Coaquira, I3.  
**Fecha:** 02/11/2026.  
**Rama local:** feature/HU-03-infraestructura.  
**Estado:** implementación y verificaciones de infraestructura completadas. Entrega preparada para publicación en feature/HU-03-infraestructura; revisión del PR y demo pendientes. Este documento no acredita que ya estén integrados en main.

## 1. Qué aporté en la HU-03

Preparé e integré la infraestructura común para que el equipo pueda implementar sus historias sobre una misma base:

- Integración de logger y manejador de errores de @arca/shared en los cinco microservicios y el gateway.
- GET /health con conexión real a PostgreSQL mediante TypeORM, siguiendo route → controller → service → repository. Responde 200 cuando conecta y 503 con el formato común cuando falla.
- Protección global de /internal en los cinco servicios mediante X-Internal-Key. El gateway bloquea el acceso exterior a rutas internas.
- Proxy del gateway hacia los cinco servicios bajo /api/v1/<servicio>.
- Configuración de DataSource con schema fijo, synchronize: false, timeouts de conexión/consulta y pools de hasta cinco conexiones. Para Supabase se valida el certificado CA y el hostname mediante TLS.
- Provisión de Supabase: seis schemas, seis roles separados y aplicación de las seis migraciones existentes. Se verificó el aislamiento conectando realmente con cada usuario.
- Compose de nube superpuesto al Compose local. Gateway y microservicios usan Supabase; el entorno conserva PostgreSQL local como alternativa.
- Construcción del frontend desde ../frontend-arca usando su Dockerfile original, sin modificar ese repositorio. En este equipo se publica en localhost:5174 para conservar los puertos utilizados por Reecicla.
- Pruebas Jest + Supertest de infraestructura, smoke test y scripts reproducibles de verificación.
- README, guía de desarrollo, OpenAPI de /health, matriz de aceptación y evidencias de ejecución.

Se reutilizaron la base del repositorio, las entidades, repositorios y migraciones existentes. Esta entrega no atribuye a HU-03 la autoría de todo el código de HU-01/HU-02 ni de los aportes previos del equipo.

## 2. Arquitectura que queda disponible

| Componente | Puerto dentro de Docker | Prefijo público | Schema Supabase | Rol de ejecución |
|---|---:|---|---|---|
| gateway | 8080 | Entrada HTTP | auditoria | arca_auditoria |
| ms-auth | 3001 | /api/v1/auth | autenticacion | arca_auth |
| ms-personal | 3002 | /api/v1/personal | personal | arca_personal |
| ms-vacaciones | 3003 | /api/v1/vacaciones | vacaciones | arca_vacaciones |
| ms-contratos | 3004 | /api/v1/contratos | contratos | arca_contratos |
| ms-boletas | 3005 | /api/v1/boletas | boletas | arca_boletas |
| Gotenberg 8 | 3000 | Sin ruta pública propia | No aplica | No aplica |
| frontend / Nginx | 80 | localhost:5174 en modo nube | No accede directamente a la BD | No aplica |

El gateway se publica en localhost:8080. Los microservicios y Gotenberg no publican puertos al host. PostgreSQL 16 local conserva el puerto 5433 y su volumen; con el override de Supabase, las aplicaciones usan la BD en la nube.

**Ubicación del frontend:** repositorio hermano frontend-arca; no se creó apps/frontend. Esta excepción está documentada y debe quedar aceptada en la revisión del equipo.

**Proyecto Supabase configurado:** arca-gestion-humana, referencia othblpxxhhqwevzofpqi, región São Paulo; conexión mediante Session Pooler, puerto 5432. Se creó en la organización de Diego. El acceso del resto del equipo al panel o a credenciales de servicio debe coordinarse; tener el repositorio no concede acceso a Supabase.

## 3. Resultados comprobados y dónde revisarlos

| Comprobación | Resultado registrado | Evidencia |
|---|---|---|
| Arranque completo | 9 contenedores healthy: db, frontend, gateway, 5 servicios y Gotenberg | [CA02-compose-evidencia.json](CA02-compose-evidencia.json) |
| Frontend | Carga visible de la plantilla; HTML, JS y CSS con 200 | [Captura](CA02-frontend.png) |
| Conectividad frontend/gateway | Acceso desde el contenedor del frontend al gateway y CORS válido para localhost:5174 | [CA-02](CA02-compose-evidencia.json) |
| BD en la nube | 6 schemas, 6 roles y 6 migraciones existentes aplicadas | [Procedimiento Supabase](CA03-supabase.md) |
| Aislamiento real | 26 accesos a tablas propias permitidos y 130 accesos a tablas ajenas rechazados con PostgreSQL 42501 | [CA03-supabase-evidencia.json](CA03-supabase-evidencia.json) |
| Healthchecks contra Supabase | 6 respuestas 200; rol, schema, proyecto, TLS y pool verificados desde los contenedores | [Evidencia de healthchecks](CA03-supabase-health-evidencia.json) |
| Proxy | 5 rutas /api/v1/<servicio>/health con 200 | [Evidencia de healthchecks](CA03-supabase-health-evidencia.json) |
| Pruebas de infraestructura | 109 pruebas Jest + Supertest aprobadas en 12 suites | [Evidencia de healthchecks](CA03-supabase-health-evidencia.json) |
| Shared | 36 pruebas aprobadas previamente, conservadas con node:test por acuerdo de esta tarea | [Matriz de verificación](HU-03-verificacion.md) |
| Smoke test | Gateway /health con HTTP 200 | [CA-02](CA02-compose-evidencia.json) |

Son resultados de la ejecución registrada, no una garantía de disponibilidad permanente. Los fallos con respuesta 503 están cubiertos por pruebas con TypeORM simulado; no se apagó la BD compartida para provocar ese fallo.

El frontend actual muestra únicamente “ARCA – Gestión Humana”. App.tsx todavía no invoca ApiService.health. Se verificaron arranque y conectividad de infraestructura; los flujos de negocio de la interfaz corresponden a sus siguientes historias.

El aislamiento certificado corresponde a los seis schemas ARCA. Supabase conserva permisos compartidos de plataforma y catálogos mediante PUBLIC; no se revocaron indiscriminadamente permisos de public, auth o storage.

## 4. Cómo levantarlo en otra máquina

### Preparación inicial

1. Disponer de Docker Desktop con Compose, Git y ambos repositorios clonados como carpetas hermanas. Para ejecutar npm y las pruebas fuera de Docker, utilizar Node compatible con el proyecto; Node 22 fue el usado en la verificación local de pruebas.
2. Recibir los cambios cuando estén publicados y revisados. No asumir que main contiene ya esta entrega.
3. Preparar privadamente .env.supabase.runtime usando [la plantilla de runtime](../../../../docker/supabase-runtime.env.example): clave interna y las seis URLs de servicio. No contiene la credencial administrativa.
4. Obtener el certificado CA oficial y guardarlo como .env.supabase-ca.crt. Las URLs de runtime no deben incluir sslmode; TLS se configura mediante DB_SSL_CA_FILE en el override.
5. Coordinar la configuración privada con el responsable. No publicar passwords, URLs con passwords, la clave interna ni archivos .env en Git o en documentación.

El proyecto Supabase y sus migraciones iniciales ya existen. Otro desarrollador no debe crear un proyecto distinto ni volver a provisionar la base compartida para empezar una historia.

### Arranque completo

Desde backend-arca:

```bash
docker compose --env-file .env.supabase.runtime -f docker-compose.yml -f docker-compose.supabase.yml up -d --build --wait
```

Si la instalación no reconoce docker compose, utilizar docker-compose con los mismos argumentos. El override requiere Compose >= 2.24.4. El arranque verificado se realizó con las imágenes ya construidas y --no-build; el comando anterior incluye su construcción para otras máquinas.

- Frontend: http://localhost:5174/.
- Gateway: http://localhost:8080/health.
- FRONTEND_PORT permite cambiar el puerto del frontend cuando sea necesario.

El Compose base sigue disponible para el modo local. Tras sincronizar main se conserva init para el modo local; el override de Supabase lo excluye mediante el perfil local-init. Las migraciones de nube siguen gestionadas por el administrador. Para preparar una BD local nueva, seguir el [README](../../../../README.md), incluyendo sus migraciones.

### Verificaciones

```bash
bash scripts/smoke-test.sh
node scripts/verify-cloud-health.cjs
```

El segundo comando requiere Docker activo y los seis contenedores del backend; comprueba respuestas HTTP e identidades/TLS reales. Guarda una nueva evidencia de healthchecks solo si pasan los seis componentes. La evidencia de CA-02 registra además la revisión visual del frontend.

Para las pruebas de infraestructura, con las dependencias instaladas desde el lockfile:

```bash
npm run test:infra
```

La suite general se ejecuta con npm run test --workspaces, pero puede incluir pruebas de repositorios que borran datos. Preparar una BD de pruebas independiente y migrada antes de ejecutarla; no apuntarla al Supabase compartido. Para compilar los workspaces, usar npm run build.

## 5. Cómo continuar la siguiente historia

1. Identificar el microservicio dueño de los datos y confirmar las rutas/contratos de la HU antes de escribir código.
2. Conservar src/{routes,controllers,services,repositories,entities,schemas,clients,middlewares,config,migrations}.
3. Implementar route → controller → service → repository. La ruta registra el endpoint y sus validaciones; el controller adapta HTTP; el service aplica reglas; el repository utiliza TypeORM.
4. Validar body, query y params con Zod cuando existan entradas. /health tiene una excepción documentada porque no recibe payload.
5. Usar AppError y el manejador común. No devolver errores internos de PostgreSQL, passwords o trazas al cliente.
6. Consultar únicamente el schema propio. Un identificador de otra entidad no habilita un JOIN entre servicios; pedir los datos al servicio propietario por HTTP.
7. Crear rutas internas bajo /internal y conservar el middleware global existente antes de los routers. Utilizar X-Internal-Key para llamadas entre servicios. No añadir dichas rutas al proxy público.
8. Mantener los prefijos del gateway. Por ejemplo, /api/v1/personal/funcionarios llega al servicio personal como /funcionarios. Este ejemplo no afirma que esa ruta de negocio esté implementada actualmente.
9. Añadir pruebas unitarias de reglas y al menos una prueba Supertest por endpoint usando Jest + Supertest. Documentar el contrato OpenAPI y los errores esperados.
10. Si cambia la BD, añadir una migración en el servicio propietario, mantener synchronize: false y coordinar su aplicación administrativa. Presentar el PR para revisión antes de integrar.

Consultar los ejemplos completos en la [guía de desarrollo](../../../guia-desarrollo.md).

### Utilidades reales disponibles en shared

```ts
import { AppError, createLogger, HttpClient } from '@arca/shared';

const logger = createLogger('ms-personal');
logger.info('operacion.completada', { requestId: 'identificador-de-la-peticion' });

// Dentro del service, cuando corresponda a una regla de la HU:
throw new AppError('NOT_FOUND', 'Recurso no encontrado', { id: 'identificador' });
```

El constructor es AppError(code, message, details). El estado HTTP se obtiene del código común; details puede ser null. No pasar un número HTTP como primer argumento.

Ejemplo ilustrativo de cliente entre servicios; la ruta interna debe implementarse y acordarse en su propia HU:

```ts
import { HttpClient } from '@arca/shared';

const baseUrl = process.env.PERSONAL_SERVICE_URL;
const internalApiKey = process.env.INTERNAL_API_KEY;
if (!baseUrl || !internalApiKey) {
  throw new Error('Falta configuracion del cliente interno');
}
const personalClient = new HttpClient({ baseUrl, internalApiKey });

// En una funcion async, para un contrato futuro acordado:
const funcionario = await personalClient.request<{ id: string }>(
  '/internal/funcionarios/' + encodeURIComponent(funcionarioId),
);
```

HttpClient agrega X-Internal-Key, usa un timeout predeterminado de 3 segundos por intento y permite un reintento. No sigue redirects. El reintento también puede afectar escrituras; sus historias deben definir idempotencia antes de utilizarlo para operaciones que no deban duplicarse.

La exportación del middleware se llama requireInternalKey; algunas aplicaciones la importan con el alias internalKeyMiddleware. Ya está montado para /internal en los cinco servicios: conservar esa protección al agregar routers, antes del manejador de 404.

## 6. Cambios de BD y responsabilidades

| Necesidad | Acción |
|---|---|
| Leer/escribir datos de la propia HU | Usar el repository y la credencial de su servicio |
| Obtener datos de otro dominio | Consumir su API interna mediante HttpClient |
| Crear/alterar tablas | Añadir migración y coordinar ejecución administrativa |
| Revisar aislamiento | Utilizar scripts/verify-supabase.cjs con configuración privada autorizada |
| Aplicar migraciones en nube | Responsable administrativo: scripts/migrate-supabase.cjs |
| Revisar salud desde Docker | scripts/verify-cloud-health.cjs |

Los roles de ejecución en la nube no tienen CREATE. No usar postgres como credencial de runtime ni aumentar los pools por encima del límite de cinco conexiones por rol. Los permisos predeterminados actuales corresponden a objetos creados por postgres; otro propietario requiere revisar sus propios default privileges.

Los roles locales user_* se conservan en docker/init-schemas.sql. En Supabase se utiliza arca_* para seguir los nombres del script del equipo. No mezclar URLs locales con roles de nube ni ejecutar el bootstrap local directamente en Supabase.

La configuración administrativa .env.supabase y la configuración de runtime .env.supabase.runtime son archivos distintos, ignorados por Git. El equipo debe gestionar su entrega privada y el acceso al proyecto con el responsable; este documento no concede ni distribuye accesos.

## 7. Qué queda fuera y qué falta para cerrar

- HU-05: validación de JWT y autorización que corresponda a esa historia. La protección por clave interna de HU-03 no reemplaza JWT.
- HU-24: lógica de auditoría. Tener el schema auditoria no significa que ya esté implementada la historia de auditoría.
- Reglas de personal, vacaciones, contratos, boletas y autenticación de otras HUs.
- Interfaz funcional y flujos de negocio del frontend; se mantuvo su plantilla existente.
- CI, ESLint y Prettier no forman parte de esta entrega acordada; no se presentan como implementados por este trabajo.
- Confirmar en la revisión del equipo las excepciones documentadas: frontend separado, prefijo /api/v1, credenciales dummy exclusivamente locales, Zod no aplicable a /health y runner existente de shared.
- Publicar los cambios cuando se autorice, abrir/revisar el PR y obtener aprobación de otro integrante.
- Realizar la demo y registrar fecha, participantes y resultado.

La entrega se publica mediante la rama feature/HU-03-infraestructura y un PR contra main. La aprobación de otro integrante y la demo se registran por separado; no se fusiona automáticamente.

## 8. Mensaje breve para compartir con el grupo

> Equipo, dejé implementada y verificada la infraestructura de HU-03: gateway, cinco microservicios, shared, Gotenberg, frontend en Docker y Supabase con seis schemas y usuarios separados. Pasaron 109 pruebas de infraestructura; los seis healthchecks respondieron 200 contra Supabase y el conjunto completo quedó healthy. También documenté la guía, los contratos y las evidencias.
>
> Para continuar sus HUs, trabajen en el microservicio correspondiente, respeten route → controller → service → repository, validen entradas con Zod y reutilicen AppError, logger y HttpClient de shared. No consulten otros schemas; pidan esos datos por API interna con X-Internal-Key. Las migraciones de nube las coordinamos y las pruebas que limpian datos deben usar una BD independiente.
>
> Los cambios se presentan en feature/HU-03-infraestructura para revisión mediante PR. Falta la aprobación y hacer la demo. Revisen docs/Sprints/1/HU3/HU-03-entrega-equipo.md y docs/guia-desarrollo.md. Les coordinaré la configuración privada; las credenciales no van en Git ni en el mensaje del grupo.

## 9. Referencias para la revisión

- [README del repositorio](../../../../README.md).
- [Guía de desarrollo](../../../guia-desarrollo.md).
- [Matriz de criterios y DoD](HU-03-verificacion.md).
- [OpenAPI](../../../api/internal-contracts.openapi.yaml).
- [Procedimiento Supabase](CA03-supabase.md).
- [Evidencia de Compose](CA02-compose-evidencia.json).
- [Evidencia de aislamiento](CA03-supabase-evidencia.json).
- [Evidencia de healthchecks de nube](CA03-supabase-health-evidencia.json).

> Sincronización con main: se conservaron los aportes del equipo (Node 22, CI, lint/formato, init local, contratos y utilidades). Ver [nota de integración](HU-03-sincronizacion-main.md). Las evidencias anteriores conservan su fecha; la nota registra las comprobaciones posteriores.
