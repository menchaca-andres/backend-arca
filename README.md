# backend-arca

Microservicios del Sistema de Gestión Humana de ARCA Ltda. Node.js + TypeScript + Express, TypeORM y PostgreSQL. La arquitectura y las convenciones están en [docs/HU-01_Arquitectura_Contexto_Equipo.md](docs/HU-01_Arquitectura_Contexto_Equipo.md) y el modelo de datos en [docs/data-model.md](docs/data-model.md).

## Estructura

```
docs/                 C4, ADRs, contratos internos y modelo de datos
packages/shared/      código común (@arca/shared)
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

## Empezar a trabajar

Solo necesitas Node 20 o superior y Docker Desktop abierto.

```bash
npm install       # instala todo y compila @arca/shared
npm run setup     # crea los .env y levanta la base local con los 6 schemas
npm run db:migrate
npm run dev --workspace=ms-personal    # el servicio de tu HU
```

No hay que editar ningún `.env`: los valores de desarrollo ya vienen listos. La base local usa el puerto 5433 para no chocar con un Postgres instalado en la máquina.

## Comandos

```bash
npm run build         # compila todos
npm test              # pruebas de todos
npm run db:up         # levanta la base si está apagada
npm run db:reset      # borra la base local y la crea de nuevo
npm run docker:up     # levanta todo con Docker Compose
```

Cada servicio responde `GET /health`.

## Migraciones (Postgres local)

Se usa el puerto 5433, como en los `.env.example`, para no chocar con un Postgres instalado en la máquina.

```bash
docker run -d --name arca-pg -p 5433:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=arca postgres:16
docker exec arca-pg psql -U postgres -d arca -c "CREATE SCHEMA auth; CREATE SCHEMA personal; CREATE SCHEMA vacaciones; CREATE SCHEMA contratos; CREATE SCHEMA boletas; CREATE SCHEMA auditoria;"
npm run migration:run --workspace=ms-personal    # lee services/ms-personal/.env; repetir por servicio
npm run migration:revert --workspace=ms-personal
```
