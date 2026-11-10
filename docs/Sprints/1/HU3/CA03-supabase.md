# CA-03 — Supabase provisionado y verificado

**Estado:** completado en la nube el 02/11/2026. Proyecto: arca-gestion-humana, referencia `othblpxxhhqwevzofpqi`, región São Paulo. Se utilizó Session Pooler, puerto 5432, con validación TLS de cadena y hostname.

## Resultado real

- Se crearon seis schemas y seis roles de aplicación con contraseñas distintas.
- Se aplicó una migración TypeORM existente por componente, sin ejecutar semillas ni insertar datos de negocio.
- Los seis usuarios iniciaron sesión con sus propias credenciales.
- Se verificaron 26 accesos permitidos a tablas propias y 130 rechazos de acceso a tablas ajenas, todos con código PostgreSQL 42501.
- Se comprobaron USAGE/CREATE de cada schema, permisos de datos y acceso a secuencias. Los roles de runtime no tienen CREATE ni membresías administrativas.
- Gateway conserva SELECT/INSERT en auditoria, sin UPDATE/DELETE. Las migraciones se ejecutan como postgres; los objetos quedan bajo el administrador.

La evidencia real, con timestamp y resultados por usuario, está en [CA03-supabase-evidencia.json](CA03-supabase-evidencia.json). Incluye las tablas de seguimiento de migraciones, además de las 20 tablas de dominio.

| Componente | Rol PostgreSQL | Schema |
|---|---|---|
| gateway | arca_auditoria | auditoria |
| ms-auth | arca_auth | autenticacion |
| ms-personal | arca_personal | personal |
| ms-vacaciones | arca_vacaciones | vacaciones |
| ms-contratos | arca_contratos | contratos |
| ms-boletas | arca_boletas | boletas |

En Session Pooler, el nombre de conexión es `<rol>.<project-ref>`. Los nombres arca_* mantienen la convención del script del equipo en main; los usuarios user_* del entorno local se conservan.

## Archivos y reproducción

- `docker/supabase-init-schemas.sql`: bootstrap compatible con Supabase, limitado a los seis schemas ARCA. No usar el bootstrap local directamente en Supabase.
- `scripts/supabase-config.cjs`: conexión privada, TLS y correspondencias de servicios.
- `scripts/provision-supabase.cjs`: provisión transaccional. No cambia passwords de roles existentes ni aplica migraciones.
- `scripts/migrate-supabase.cjs`: ejecuta las migraciones compiladas existentes con el administrador, una transacción por componente.
- `scripts/verify-supabase.cjs`: se conecta con cada rol y comprueba todas las tablas de los seis schemas. No modifica datos de negocio.

La configuración privada está en `.env.supabase`; el certificado público está en `.env.supabase-ca.crt`. Ambos están ignorados por Git, comprobado con git check-ignore. No publicar estos archivos ni compartir la contraseña administrativa. Para otro administrador, la plantilla sin secretos está en `docker/supabase.env.example`.

Con dependencias instaladas y configuración privada válida:

```bash
npm run build
node scripts/provision-supabase.cjs
node scripts/migrate-supabase.cjs
node scripts/verify-supabase.cjs
```

La verificación escribe evidencia solo si terminan correctamente los seis usuarios; revisar siempre su timestamp. No ejecutar las suites que borran datos contra la base compartida.

## Aplicaciones conectadas y verificadas

El 02/11/2026 se reconstruyeron las seis imágenes del backend y se arrancaron usando docker-compose.supabase.yml y la configuración privada .env.supabase.runtime. Los .env existentes y el Compose base se conservan. El override elimina la dependencia de db para los seis componentes, monta el certificado como solo lectura y mantiene los puertos de los microservicios sin publicar.

Los seis DataSource usan TLS con verificación de CA y hostname al definir DB_SSL_CA_FILE, un máximo de cinco conexiones por pool, schema fijo y synchronize: false. Las URLs privadas usan los seis roles arca_* y Session Pooler en el puerto 5432, sin sslmode en la URL para no reemplazar la configuración TLS del driver.

La verificación real desde cada contenedor confirmó HTTP 200 en los seis /health, el rol y schema correspondientes, TLS cifrado y autorizado, y el mismo proyecto Supabase. Las cinco rutas /api/v1/<servicio>/health respondieron 200 a través del gateway. El smoke test externo del gateway también respondió 200. Las 109 pruebas Jest + Supertest de infraestructura pasaron en 12 suites.

Consultar [evidencia de ejecución](CA03-supabase-health-evidencia.json). La base y el volumen locales no se borraron. El frontend y los contenedores de otros proyectos no se modificaron.

Para repetir los chequeos, con los contenedores en ejecución:

```bash
node scripts/verify-cloud-health.cjs
bash scripts/smoke-test.sh
```

El verificador guarda una nueva evidencia de healthchecks solo si pasan los seis componentes. No ejecuta migraciones ni cambia datos de negocio. El procedimiento de arranque del modo nube está en el [README](../../../../README.md#ejecutar-el-backend-con-supabase); la plantilla privada de runtime sin secretos es docker/supabase-runtime.env.example.

## Alcance del aislamiento

Se acredita el aislamiento de datos entre los seis schemas de ARCA. Supabase mantiene permisos compartidos de plataforma y catálogos a través de PUBLIC; NOINHERIT no los elimina. No se revocaron permisos generales de public, auth, storage u otros schemas administrados para evitar afectar la plataforma. Esto no certifica ausencia absoluta de permisos sobre metadatos o funciones compartidas de PostgreSQL.

El bootstrap restringe los grants de los schemas ARCA y configura privilegios predeterminados para los objetos creados por postgres. Las futuras migraciones deben ejecutarse con ese mismo administrador; otro propietario requiere sus propios default privileges.

Referencias: [Conexiones Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [SSL](https://supabase.com/docs/guides/platform/ssl-enforcement) y [privilegios heredados de PUBLIC](https://supabase.com/kb/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted).

> Sincronización con main: se conservaron los aportes del equipo (Node 22, CI, lint/formato, init local, contratos y utilidades). Ver [nota de integración](HU-03-sincronizacion-main.md). Las evidencias anteriores conservan su fecha; la nota registra las comprobaciones posteriores.
