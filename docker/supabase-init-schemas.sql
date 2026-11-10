-- Variante Supabase. Ejecutar mediante scripts/provision-supabase.cjs.
-- Las passwords llegan como parametro privado de la sesion, no estan en este SQL.
-- Solo administra los seis schemas ARCA. No revoca permisos de public,
-- auth, storage ni otros objetos de la plataforma. No requiere superusuario.
DO $arca$
DECLARE
  services CONSTANT jsonb := '[
    {"schema_name":"auditoria","role_name":"arca_auditoria"},
    {"schema_name":"autenticacion","role_name":"arca_auth"},
    {"schema_name":"personal","role_name":"arca_personal"},
    {"schema_name":"vacaciones","role_name":"arca_vacaciones"},
    {"schema_name":"contratos","role_name":"arca_contratos"},
    {"schema_name":"boletas","role_name":"arca_boletas"}
  ]'::jsonb;
  passwords jsonb := nullif(current_setting('arca.bootstrap_passwords', true), '')::jsonb;
  service record;
  target record;
  existing_role record;
  roles_sql text;
  privileges_sql text;
  admin_name text := current_user;
  database_oid oid;
BEGIN
  IF passwords IS NULL THEN
    RAISE EXCEPTION 'Ejecutar con scripts/provision-supabase.cjs';
  END IF;
  SELECT oid INTO database_oid FROM pg_database WHERE datname = current_database();
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Se esperaba la base postgres del proyecto Supabase';
  END IF;
  -- No modificar defaults globales de PUBLIC: revisar una configuracion
  -- preexistente que conceda permisos globales de tablas o secuencias.
  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole = admin_name::regrole::oid
      AND d.defaclnamespace = 0 AND d.defaclobjtype IN ('r', 'S')
      AND a.grantee = 0
  ) THEN
    RAISE EXCEPTION 'Hay grants globales de tablas/secuencias a PUBLIC; requiere revision del DBA';
  END IF;

  FOR service IN SELECT * FROM jsonb_to_recordset(services)
    AS x(schema_name text, role_name text)
  LOOP
    IF length(coalesce(passwords ->> service.role_name, '')) < 24 THEN
      RAISE EXCEPTION 'Falta una password segura para %', service.role_name;
    END IF;
    SELECT * INTO existing_role FROM pg_roles WHERE rolname = service.role_name;
    IF FOUND THEN
      IF existing_role.rolsuper OR existing_role.rolcreatedb
        OR existing_role.rolcreaterole OR existing_role.rolreplication
        OR existing_role.rolbypassrls OR NOT existing_role.rolcanlogin THEN
        RAISE EXCEPTION 'El rol % tiene atributos incompatibles', service.role_name;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = existing_role.oid)
        OR EXISTS (
          SELECT 1 FROM pg_shdepend
          WHERE refclassid = 'pg_authid'::regclass AND refobjid = existing_role.oid
            AND deptype = 'o' AND (dbid = 0 OR dbid = database_oid)
        ) THEN
        RAISE EXCEPTION 'El rol % tiene membresias o propiedades que requieren revision', service.role_name;
      END IF;
    ELSE
      EXECUTE format(
        'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5',
        service.role_name, passwords ->> service.role_name
      );
    END IF;
    EXECUTE format('ALTER ROLE %I NOINHERIT', service.role_name);
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', service.schema_name, admin_name);
    IF EXISTS (
      SELECT 1 FROM pg_namespace
      WHERE nspname = service.schema_name AND nspowner <> admin_name::regrole::oid
    ) THEN
      RAISE EXCEPTION 'El schema % no pertenece al administrador actual', service.schema_name;
    END IF;
  END LOOP;

  SELECT string_agg(format('%I', x.role_name), ', ') INTO roles_sql
  FROM jsonb_to_recordset(services) AS x(role_name text);
  -- Limpiar solo grants globales dirigidos a nuestros seis roles, no PUBLIC.
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON TABLES FROM %s', admin_name, roles_sql);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON SEQUENCES FROM %s', admin_name, roles_sql);

  FOR target IN SELECT * FROM jsonb_to_recordset(services)
    AS x(schema_name text, role_name text)
  LOOP
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC, %s', target.schema_name, roles_sql);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC, %s', target.schema_name, roles_sql);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM PUBLIC, %s', target.schema_name, roles_sql);
    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC, %s', target.schema_name, roles_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON TABLES FROM PUBLIC, %s', admin_name, target.schema_name, roles_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM PUBLIC, %s', admin_name, target.schema_name, roles_sql);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM %s', admin_name, target.schema_name, roles_sql);
  END LOOP;

  FOR service IN SELECT * FROM jsonb_to_recordset(services)
    AS x(schema_name text, role_name text)
  LOOP
    privileges_sql := CASE WHEN service.schema_name = 'auditoria'
      THEN 'SELECT, INSERT' ELSE 'SELECT, INSERT, UPDATE, DELETE' END;
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), service.role_name);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', service.schema_name, service.role_name);
    EXECUTE format('GRANT %s ON ALL TABLES IN SCHEMA %I TO %I', privileges_sql, service.schema_name, service.role_name);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', service.schema_name, service.role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT %s ON TABLES TO %I', admin_name, service.schema_name, privileges_sql, service.role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO %I', admin_name, service.schema_name, service.role_name);
    EXECUTE format('ALTER ROLE %I IN DATABASE %I SET search_path TO %I', service.role_name, current_database(), service.schema_name);

    FOR target IN SELECT * FROM jsonb_to_recordset(services)
      AS x(schema_name text, role_name text)
    LOOP
      IF has_schema_privilege(service.role_name, target.schema_name, 'USAGE')
          IS DISTINCT FROM (service.schema_name = target.schema_name)
        OR has_schema_privilege(service.role_name, target.schema_name, 'CREATE') THEN
        RAISE EXCEPTION 'Aislamiento incorrecto: %, %', service.role_name, target.schema_name;
      END IF;
    END LOOP;
  END LOOP;
END;
$arca$;
