-- Roles y permisos por schema para Supabase (HU-03 CA-03 / HU-02 CA-09).
--
-- Ejecutar una vez con un rol administrador (SQL Editor de Supabase o psql).
-- ANTES de ejecutar: reemplazar 'CAMBIAR_ESTA_CLAVE' por una clave fuerte por rol.
--
-- En el Session pooler el usuario de conexión es "<rol>.<project-ref>";
-- el rol de la base sigue siendo "arca_auth", "arca_personal", etc.
--
-- Los roles tienen CREATE en su schema para poder correr las migraciones.
-- Si más adelante se separan las credenciales de migración y de runtime,
-- quitar CREATE al rol de runtime y crear un rol de migración por servicio.

DO $$
DECLARE
  rol text;
BEGIN
  FOREACH rol IN ARRAY ARRAY[
    'arca_auth',
    'arca_personal',
    'arca_vacaciones',
    'arca_contratos',
    'arca_boletas',
    'arca_auditoria'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', rol, 'CAMBIAR_ESTA_CLAVE');
    END IF;
  END LOOP;
END $$;

-- Permite conectarse a la base actual (postgres en Supabase, arca en local).
DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO arca_auth, arca_personal, arca_vacaciones, arca_contratos, arca_boletas, arca_auditoria',
    current_database()
  );
END $$;

-- Cada servicio solo tiene USAGE/CREATE sobre su propio schema.
GRANT USAGE, CREATE ON SCHEMA autenticacion TO arca_auth;
GRANT USAGE, CREATE ON SCHEMA personal TO arca_personal;
GRANT USAGE, CREATE ON SCHEMA vacaciones TO arca_vacaciones;
GRANT USAGE, CREATE ON SCHEMA contratos TO arca_contratos;
GRANT USAGE, CREATE ON SCHEMA boletas TO arca_boletas;
GRANT USAGE, CREATE ON SCHEMA auditoria TO arca_auditoria;

-- Permisos sobre las tablas y secuencias existentes.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA autenticacion TO arca_auth;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA autenticacion TO arca_auth;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA personal TO arca_personal;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA personal TO arca_personal;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA vacaciones TO arca_vacaciones;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA vacaciones TO arca_vacaciones;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA contratos TO arca_contratos;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA contratos TO arca_contratos;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA boletas TO arca_boletas;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA boletas TO arca_boletas;

-- Auditoría: solo inserción y lectura (HU-24 CA-04).
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA auditoria TO arca_auditoria;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auditoria TO arca_auditoria;

-- Objetos que se creen en el futuro (migraciones corridas como postgres).
ALTER DEFAULT PRIVILEGES IN SCHEMA autenticacion GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arca_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA autenticacion GRANT USAGE, SELECT ON SEQUENCES TO arca_auth;

ALTER DEFAULT PRIVILEGES IN SCHEMA personal GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arca_personal;
ALTER DEFAULT PRIVILEGES IN SCHEMA personal GRANT USAGE, SELECT ON SEQUENCES TO arca_personal;

ALTER DEFAULT PRIVILEGES IN SCHEMA vacaciones GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arca_vacaciones;
ALTER DEFAULT PRIVILEGES IN SCHEMA vacaciones GRANT USAGE, SELECT ON SEQUENCES TO arca_vacaciones;

ALTER DEFAULT PRIVILEGES IN SCHEMA contratos GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arca_contratos;
ALTER DEFAULT PRIVILEGES IN SCHEMA contratos GRANT USAGE, SELECT ON SEQUENCES TO arca_contratos;

ALTER DEFAULT PRIVILEGES IN SCHEMA boletas GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arca_boletas;
ALTER DEFAULT PRIVILEGES IN SCHEMA boletas GRANT USAGE, SELECT ON SEQUENCES TO arca_boletas;

ALTER DEFAULT PRIVILEGES IN SCHEMA auditoria GRANT SELECT, INSERT ON TABLES TO arca_auditoria;
ALTER DEFAULT PRIVILEGES IN SCHEMA auditoria GRANT USAGE, SELECT ON SEQUENCES TO arca_auditoria;

-- Ningún rol de servicio puede crear objetos ni leer tablas en public.
REVOKE ALL ON SCHEMA public FROM
  arca_auth, arca_personal, arca_vacaciones, arca_contratos, arca_boletas, arca_auditoria;

-- Que las consultas sin schema calificado apunten al schema del servicio.
ALTER ROLE arca_auth SET search_path = autenticacion, public;
ALTER ROLE arca_personal SET search_path = personal, public;
ALTER ROLE arca_vacaciones SET search_path = vacaciones, public;
ALTER ROLE arca_contratos SET search_path = contratos, public;
ALTER ROLE arca_boletas SET search_path = boletas, public;
ALTER ROLE arca_auditoria SET search_path = auditoria, public;
