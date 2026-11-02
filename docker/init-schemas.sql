-- Solo para el Postgres local de desarrollo. En Supabase los schemas los crea
-- docker/supabase-roles.sql (o el SQL Editor) junto con los roles por servicio.
CREATE SCHEMA IF NOT EXISTS autenticacion;
CREATE SCHEMA IF NOT EXISTS personal;
CREATE SCHEMA IF NOT EXISTS vacaciones;
CREATE SCHEMA IF NOT EXISTS contratos;
CREATE SCHEMA IF NOT EXISTS boletas;
CREATE SCHEMA IF NOT EXISTS auditoria;
