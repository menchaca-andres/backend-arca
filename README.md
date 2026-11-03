# backend-arca

Microservicios del Sistema de Gestión Humana de ARCA Ltda. Node.js 22 + TypeScript + Express, TypeORM y PostgreSQL. La arquitectura y las convenciones están en [docs/HU-01_Arquitectura_Contexto_Equipo.md](docs/HU-01_Arquitectura_Contexto_Equipo.md) y el modelo de datos en [docs/Sprints/1/HU2/data-model.md](docs/Sprints/1/HU2/data-model.md).

## Estructura

```
docs/                 C4, contratos internos, backlog, ADRs y runbook de infraestructura
  Sprints/1/          ADRs, modelo de datos e infraestructura del sprint 1
packages/shared/      código común (@arca/shared): errores, logger, roles, cliente HTTP interno
docker/               init de esquemas, roles de Supabase e init de migraciones/semilla
gateway/              API Gateway, schema auditoria (puerto 8080)
services/
  ms-auth/            schema autenticacion (3001)
  ms-personal/        schema personal (3002)
  ms-vacaciones/      schema vacaciones (3003)
  ms-contratos/       schema contratos (3004)
  ms-boletas/         schema boletas (3005)
```

Cada servicio sigue `route → controller → service → repository`:

```
src/
  routes/  controllers/  services/  repositories/
  entities/  schemas/ (Zod)  clients/ (HTTP a otros ms)
  middlewares/  config/  migrations/  app.ts  server.ts
tests/
Dockerfile
.env.example
```

El arranque es común (`@arca/shared`): valida variables de entorno, conecta TypeORM con reintentos, expone `/health` con chequeo real de la base y cierra ordenadamente ante `SIGTERM`. El gateway enruta `/api/*`, agrega request-id y devuelve los errores con el formato `{ code, message, details }`.

## Empezar a trabajar

Solo necesitas **Node 22 o superior** y Docker Desktop abierto (Docker Compose v2.24+ para `env_file` con `required: false`).

```bash
npm install       # instala todo y compila @arca/shared
npm run setup     # crea los .env y levanta la base local con los 6 schemas
npm run db:migrate
npm run db:seed
npm run dev --workspace=ms-personal    # el servicio de tu HU
```

No hay que editar ningún `.env`: los valores de desarrollo ya vienen listos. La base local usa el puerto 5433 para no chocar con un Postgres instalado en la máquina.

El frontend va aparte, desde `frontend-arca`: `npm install` y `npm run dev` (abre en `http://localhost:5173`).

## Todo con Docker Compose

Con los dos repos clonados uno al lado del otro (`backend-arca/` y `frontend-arca/`):

```bash
npm run docker:up          # docker compose up --build
```

Eso levanta PostgreSQL, aplica migraciones y semilla en el servicio `init`, y arranca los 5 microservicios, el gateway, Gotenberg y el frontend en `http://localhost:5173`. El gateway queda en `http://localhost:8080` y solo él y el frontend se exponen al host.

## Comandos

```bash
npm run build         # compila todos
npm test              # pruebas de todos (necesita la base levantada y migrada)
npm run lint          # ESLint
npm run format:check  # Prettier
npm run typecheck     # tsc --noEmit por workspace
npm run db:up         # levanta la base si está apagada
npm run db:schemas    # crea los 6 schemas si faltan (CI o base ya inicializada)
npm run db:verify-isolation  # verifica que cada rol solo lea su schema (requiere URLs cloud)
npm run db:reset      # borra la base local y la crea de nuevo
npm run docker:up     # levanta todo con Docker Compose
```

Cada servicio responde `GET /health` y devuelve 503 si perdió la conexión a la base.

## Semilla y pruebas

```bash
npm run db:seed   # 3 áreas, 5 cargos, 5 funcionarios y 4 usuarios (uno por rol)
npm test          # necesita la base levantada y migrada
```

Las pruebas de repositories usan la base local y borran lo que crean. La suite incluye `/health`, el formato común de error, las restricciones de la base y el login (JWT, bloqueo, usuario inactivo y roles).

## Autenticación y usuarios de demo

El login vive en `ms-auth`; el gateway valida el JWT y propaga `x-user-id`, `x-user-rol` y `x-funcionario-id` a los servicios.

| Rol         | Correo                | Contraseña                                 |
| ----------- | --------------------- | ------------------------------------------ |
| ADMIN       | `admin@arca.bo`       | `Admin123!`                                |
| RRHH        | `rrhh@arca.bo`        | `Rrhh123!`                                 |
| DIRECCION   | `direccion@arca.bo`   | `Direccion123!`                            |
| FUNCIONARIO | `funcionario@arca.bo` | `Funcionario123!` (vinculado a CI 9000003) |

> Son credenciales **solo de desarrollo**. En producción hay que cambiarlas y rotar `JWT_SECRET`.

`POST /api/auth/login` devuelve un JWT de 8 h; `GET /api/auth/me` devuelve la identidad que inyecta el gateway. El detalle de la HU está en [docs/Sprints/1/HU5/HU-05-login.md](docs/Sprints/1/HU5/HU-05-login.md).

## Supabase

La base compartida se configura aparte; el paso a paso está en [docs/Sprints/1/HU3/HU-03-infraestructura.md](docs/Sprints/1/HU3/HU-03-infraestructura.md). Los roles y permisos están en [docker/supabase-roles.sql](docker/supabase-roles.sql) y la verificación de aislamiento en `npm run db:verify-isolation` (ver el runbook).
