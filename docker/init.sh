#!/bin/sh
# Aplica las migraciones de los 6 schemas y carga la semilla de desarrollo.
# Es idempotente: TypeORM salta las migraciones ya aplicadas y la semilla
# busca por código/CI antes de insertar.
set -eu

echo "[init] Aplicando migraciones"
DB_SCHEMA=autenticacion npm run migration:run --workspace=ms-auth
DB_SCHEMA=personal npm run migration:run --workspace=ms-personal
DB_SCHEMA=vacaciones npm run migration:run --workspace=ms-vacaciones
DB_SCHEMA=contratos npm run migration:run --workspace=ms-contratos
DB_SCHEMA=boletas npm run migration:run --workspace=ms-boletas
DB_SCHEMA=auditoria npm run migration:run --workspace=gateway

echo "[init] Cargando semilla de desarrollo"
DB_SCHEMA=personal npm run seed:dev --workspace=ms-personal
DB_SCHEMA=autenticacion npm run seed:dev --workspace=ms-auth
DB_SCHEMA=boletas npm run seed:dev --workspace=ms-boletas

echo "[init] Listo"
