-- HU-03: SOLO PostgreSQL local dedicado a ARCA. No ejecutar en Supabase.
-- Ejecutar como el superusuario administrador de la base (normalmente postgres).
-- Passwords publicas de desarrollo: no reutilizar fuera del entorno local.
-- Las migraciones deben ejecutarse con este mismo administrador.
-- Los usuarios de ejecucion NO son propietarios ni tienen CREATE o TEMP.
-- Al repetir el script se conservan las passwords de los roles existentes.

BEGIN;
SET LOCAL password_encryption = 'scram-sha-256';

DO $arca$
DECLARE
  services CONSTANT jsonb := '[
    {"schema_name":"auditoria",    "role_name":"user_gateway",    "password":"arca_local_gateway_2026"},
    {"schema_name":"autenticacion","role_name":"user_auth",       "password":"arca_local_auth_2026"},
    {"schema_name":"personal",     "role_name":"user_personal",   "password":"arca_local_personal_2026"},
    {"schema_name":"vacaciones",   "role_name":"user_vacaciones", "password":"arca_local_vacaciones_2026"},
    {"schema_name":"contratos",    "role_name":"user_contratos",  "password":"arca_local_contratos_2026"},
    {"schema_name":"boletas",      "role_name":"user_boletas",    "password":"arca_local_boletas_2026"}
  ]'::jsonb;
  service record;
  target record;
  existing_role record;
  roles_sql text;
  table_privileges text;
  admin_name text := current_user;
  database_name text := current_database();
  database_oid oid;
BEGIN
  SELECT oid INTO database_oid FROM pg_database WHERE datname = database_name;

  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = admin_name) THEN
    RAISE EXCEPTION 'Este bootstrap local requiere un superusuario';
  END IF;
  IF database_name IN ('postgres', 'template0', 'template1') THEN
    RAISE EXCEPTION 'Selecciona la base dedicada de ARCA, no %', database_name;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_namespace
    WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
      AND nspname NOT IN (
        'public', 'auditoria', 'autenticacion', 'personal',
        'vacaciones', 'contratos', 'boletas'
      )
  ) THEN
    RAISE EXCEPTION 'Se requiere una base dedicada, sin schemas ajenos a ARCA';
  END IF;

  FOR service IN SELECT * FROM jsonb_to_recordset(services)
    AS x(schema_name text, role_name text, password text)
  LOOP
    SELECT * INTO existing_role FROM pg_roles WHERE rolname = service.role_name;
    IF FOUND THEN
      IF existing_role.rolsuper OR existing_role.rolcreatedb
        OR existing_role.rolcreaterole OR existing_role.rolreplication
        OR existing_role.rolbypassrls OR NOT existing_role.rolcanlogin THEN
        RAISE EXCEPTION 'El rol % ya existe con atributos incompatibles', service.role_name;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = existing_role.oid) THEN
        RAISE EXCEPTION 'El rol % tiene membresias que deben revisarse', service.role_name;
      END IF;
      IF EXISTS (
        SELECT 1 FROM pg_shdepend
        WHERE refclassid = 'pg_authid'::regclass
          AND refobjid = existing_role.oid AND deptype = 'o'
          AND (dbid = 0 OR dbid = database_oid)
      ) THEN
        RAISE EXCEPTION 'El rol % es propietario de objetos; revisar antes de continuar', service.role_name;
      END IF;
    ELSE
      EXECUTE format(
        'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
        service.role_name, service.password
      );
    END IF;
    EXECUTE format('ALTER ROLE %I NOINHERIT', service.role_name);
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', service.schema_name, admin_name);
    IF EXISTS (
      SELECT 1 FROM pg_namespace
      WHERE nspname = service.schema_name AND nspowner <> admin_name::regrole::oid
    ) THEN
      RAISE EXCEPTION 'El schema % debe pertenecer a %', service.schema_name, admin_name;
    END IF;
  END LOOP;

  SELECT string_agg(format('%I', x.role_name), ', ') INTO roles_sql
    FROM jsonb_to_recordset(services) AS x(role_name text);

  EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM PUBLIC, %s', database_name, roles_sql);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %s', database_name, roles_sql);

  -- Incluye PUBLIC: revocar solo al usuario no elimina permisos heredados.
  FOR target IN SELECT nspname FROM pg_namespace
    WHERE nspname IN (
      'public', 'auditoria', 'autenticacion', 'personal',
      'vacaciones', 'contratos', 'boletas'
    )
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA %I FROM PUBLIC, %s', target.nspname, roles_sql);
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I FROM PUBLIC, %s', target.nspname, roles_sql);
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I FROM PUBLIC, %s', target.nspname, roles_sql);
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC, %s', target.nspname, roles_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, %s', admin_name, target.nspname, roles_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, %s', admin_name, target.nspname, roles_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC, %s', admin_name, target.nspname, roles_sql);
  END LOOP;
  -- Limpiar tambien grants globales: un REVOKE por schema no los elimina.
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, %s', admin_name, roles_sql);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, %s', admin_name, roles_sql);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC, %s', admin_name, roles_sql);

  FOR service IN SELECT * FROM jsonb_to_recordset(services)
    AS x(schema_name text, role_name text, password text)
  LOOP
    table_privileges := CASE WHEN service.schema_name = 'auditoria'
      THEN 'SELECT, INSERT' ELSE 'SELECT, INSERT, UPDATE, DELETE' END;
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', service.schema_name, service.role_name);
    EXECUTE format('GRANT %s ON ALL TABLES IN SCHEMA %I TO %I', table_privileges, service.schema_name, service.role_name);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', service.schema_name, service.role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT %s ON TABLES TO %I', admin_name, service.schema_name, table_privileges, service.role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO %I', admin_name, service.schema_name, service.role_name);
    -- pg_catalog sigue disponible implicitamente; public no forma parte del path.
    EXECUTE format('ALTER ROLE %I IN DATABASE %I SET search_path TO %I', service.role_name, database_name, service.schema_name);

    IF NOT has_database_privilege(service.role_name, database_name, 'CONNECT')
      OR has_database_privilege(service.role_name, database_name, 'CREATE')
      OR has_database_privilege(service.role_name, database_name, 'TEMP') THEN
      RAISE EXCEPTION 'Permisos de base incorrectos para %', service.role_name;
    END IF;
    FOR target IN SELECT nspname FROM pg_namespace
      WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
    LOOP
      IF has_schema_privilege(service.role_name, target.nspname, 'USAGE')
        IS DISTINCT FROM (target.nspname = service.schema_name)
        OR has_schema_privilege(service.role_name, target.nspname, 'CREATE') THEN
        RAISE EXCEPTION 'Aislamiento incorrecto: rol %, schema %', service.role_name, target.nspname;
      END IF;
    END LOOP;
  END LOOP;
END;
$arca$;

COMMIT;
