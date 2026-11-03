# HU-03 – Infraestructura y plantilla de microservicio

**Sprint 1 · Responsable:** I3 · **Estado:** Supabase provisionado y verificado; entrega integrada con main para revisión del PR.

## 1. Estado de los criterios de aceptación

| CA | Estado | Evidencia / pendiente |
|---|---|---|
| CA-01 monorepo | **Parcial** | `backend-arca` tiene `gateway/`, `services/ms-*` y `packages/shared`; el frontend vive en el repo hermano `frontend-arca` (no en `apps/frontend`). Documentar la desviación. |
| CA-02 compose completo | **Hecho** | `docker-compose.yml` levanta db, init, gateway, 5 servicios, Gotenberg y frontend; `init` aplica migraciones y semilla. Requiere ambos repos clonados uno al lado del otro. |
| CA-03 Supabase + roles | **Ejecutado y verificado** | Seis schemas y roles arca_* provisionados; ver CA03-supabase-evidencia.json y CA03-supabase-health-evidencia.json. |
| CA-04 plantilla con capas | **Hecho** | `routes/controllers/services/repositories/entities/schemas/clients/middlewares/config` en los 5 servicios. La carpeta se llama `schemas/` (Zod), no `dtos/`. |
| CA-05 `/health` con BD | **Hecho** | `@arca/shared/health` ejecuta `SELECT 1`; responde 503 si la base está caída. |
| CA-06 gateway enruta `/api/*` | **Hecho** | Proxy con `http-proxy-middleware`; `/api/*` se reenvía al servicio; rutas desconocidas devuelven 404 JSON. |
| CA-07 shared logger/errores | **Hecho** | `@arca/shared` expone `logger`, `AppError`, `errorHandler`, `notFoundHandler`, `requestId`, `requireRole`, `requireSelfOrRole`, `InternalClient` y tipos de contrato. |
| CA-08 credenciales en `.env` | **Hecho** | `.env.example` por servicio; compose tiene defaults de desarrollo y permite override por entorno. |
| T1.2 ESLint/Prettier | **Hecho** | `eslint.config.mjs`, `.prettierrc.json`, scripts `lint` y `format:check`. |
| T2.3 aislamiento | **Script listo** | `npm run db:verify-isolation`; probado en local contra los 6 roles. |
| T4.2 CORS + request-id | **Hecho** | CORS configurable con `CORS_ORIGIN`; `x-request-id` se genera/valida y se propaga. |
| T5.2 red y healthchecks | **Hecho** | Servicios en la red interna; healthchecks y `depends_on` con `service_healthy` / `service_completed_successfully`. |
| T6 CI | **Hecho** | `.github/workflows/ci.yml`: instala, crea schemas, migra, siembra, lint, formato, typecheck y pruebas con PostgreSQL de servicio. |

## 2. Arranque local

```bash
npm install
npm run setup          # crea .env y levanta db (schemas por init-schemas.sql)
npm run db:migrate
npm run db:seed
npm run dev --workspace=ms-personal
```

Todo junto:

```bash
npm run docker:up      # docker compose up --build
```

`docker compose up` ejecuta el servicio `init`, que corre las 6 migraciones y la semilla; después arrancan los servicios y el gateway espera a que estén sanos. El frontend queda en `http://localhost:5173`.

Los defaults de compose (`JWT_SECRET`, `INTERNAL_API_KEY`, `CORS_ORIGIN`) permiten levantarlo sin `.env`; para cambiarlos, exportarlos en el entorno o editar el compose.

**Verificado el 02/11/2026:** `docker compose up -d --wait` dejó sanos db, init (6 migraciones + semilla), los 5 servicios, gateway, Gotenberg y frontend; `/health` del gateway responde `db: up`, `/api/funcionarios` se reenvía a `ms-personal` y Gotenberg convierte HTML a PDF. Queda pendiente repetir la misma prueba contra Supabase.

## 3. Supabase (procedimiento de referencia)

**Actualización:** el proyecto arca-gestion-humana ya está configurado. No crear otro proyecto ni repetir la provisión sobre la base compartida. Las ejecuciones y el alcance vigente están en [CA03-supabase.md](CA03-supabase.md); las instrucciones siguientes se conservan como referencia histórica.

1. Crear el proyecto en Supabase y elegir la región más cercana. Anotar el `project-ref`.
2. Ejecutar [`docker/supabase-roles.sql`](../../../../docker/supabase-roles.sql) en el SQL Editor **después de reemplazar `CAMBIAR_ESTA_CLAVE` por una clave fuerte por rol**. El script es idempotente para los roles.
3. Crear los 6 schemas si el proyecto está vacío: el mismo script asume que existen; si no, ejecutar [`docker/init-schemas.sql`](../../../../docker/init-schemas.sql) primero.
4. Armar la cadena de cada servicio con el **Session pooler** (no Transaction pooler) y SSL:

   ```
   postgresql://arca_personal.<project-ref>:<clave>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   En el pooler el usuario es `<rol>.<project-ref>`; el rol de la base sigue siendo `arca_personal`.
5. Poner cada cadena en el `.env` del servicio (`DATABASE_URL`) y correr:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   `db:migrate` recorre los 6 workspaces y cada uno usa su `DB_SCHEMA` y su `DATABASE_URL`.
6. Verificar el aislamiento con las URLs de cada rol:

   ```bash
   ARCA_AUTH_URL='postgresql://arca_auth.<ref>:<clave>@.../postgres?sslmode=require' \
   ARCA_PERSONAL_URL='...' \
   ARCA_VACACIONES_URL='...' \
   ARCA_CONTRATOS_URL='...' \
   ARCA_BOLETAS_URL='...' \
   ARCA_AUDITORIA_URL='...' \
   npm run db:verify-isolation
   ```

   Debe imprimir `[ok]` para los 6 roles y fallar si alguno puede leer el schema de otro.

**Notas de operación:**
- El tier gratuito se pausa por inactividad. Confirmar el proyecto activo antes de cada revisión y de la demo.
- `DB_POOL_MAX` está en 5 por servicio para no agotar el pooler; ajustar si Supabase lo permite.
- El rol de servicio tiene `CREATE` en su schema para poder migrar. Si se separan las credenciales, crear un rol de migración por servicio y quitar `CREATE` al de runtime.
- El gateway solo tiene `INSERT`/`SELECT` sobre `auditoria` (HU-24 CA-04).

## 4. Pendientes y riesgos

- **Ejecutar** los pasos de Supabase con credenciales reales; en este repo solo quedan el SQL, el script de verificación y el runbook.
- **Repos separados:** el compose del backend referencia `../frontend-arca`. Si se decide monorepo, mover el frontend a `apps/frontend` y actualizar el contexto de build. Mientras tanto, CI del backend no construye el frontend.
- **Node 20 → 22:** los Dockerfiles y el CI ya usan Node 22; falta actualizar las máquinas de los integrantes.
- **Migraciones en producción:** el servicio `init` es de desarrollo/demo; en un despliegue real las migraciones deben correr como job separado con un rol de migración.
- **Dependencias:** `npm audit` deja 3 vulnerabilidades moderadas transitivas de TypeORM (`glob`/`minimatch`, herramientas de CLI); no están expuestas por HTTP. El fix automático propone TypeORM 1.x, un cambio mayor que conviene planificar aparte. Zod ya está en 4.6.7 (la alerta alta desapareció).
