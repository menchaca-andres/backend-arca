# backend-arca

HU-20: [conceptos y novedades de planilla](docs/HU-20-IMPLEMENTACION.md), [OpenAPI](docs/api/hu-20-conceptos.openapi.yaml). El frontend hermano incorpora `/boletas/conceptos` y `/boletas/novedades` para RRHH. La semilla de ms-boletas forma parte de db:seed e init local; no ejecutarla sobre la base compartida sin revisar su impacto.

Backend del Sistema de Gestión Humana de ARCA Ltda. Implementado con Node.js, TypeScript, Express, TypeORM y PostgreSQL.

## Arquitectura

El frontend consume el API Gateway. El gateway distribuye las peticiones entre cinco microservicios; Contratos y Boletas utilizan Gotenberg para generar PDF.

| Componente    | Puerto interno | Schema        | Usuario local   |
| ------------- | -------------: | ------------- | --------------- |
| Gateway       |           8080 | auditoria     | user_gateway    |
| ms-auth       |           3001 | autenticacion | user_auth       |
| ms-personal   |           3002 | personal      | user_personal   |
| ms-vacaciones |           3003 | vacaciones    | user_vacaciones |
| ms-contratos  |           3004 | contratos     | user_contratos  |
| ms-boletas    |           3005 | boletas       | user_boletas    |
| Gotenberg     |           3000 | No aplica     | No aplica       |

Cada aplicación sigue route → controller → service → repository. Los datos de otros servicios se obtienen por HTTP, nunca consultando sus schemas.

El frontend permanece en el repositorio hermano `../frontend-arca`, por excepción aprobada de CA-01. Compose utiliza su Dockerfile; no se crea `apps/frontend`.

## Portal de arquitectura

El portal estático con arquitectura C4, mapa de microservicios y diagramas por módulo está en [`docs/portal/`](docs/portal/). Incluye casos de uso, clases, secuencia, actividades, procesos, ER y despliegue para `ms-auth`, `ms-personal`, `ms-vacaciones`, `ms-contratos` y `ms-boletas`.

```bash
python3 -m http.server 8099 --directory docs/portal
```

Abrir `http://localhost:8099`. No requiere build ni dependencias locales.

## Requisitos

- Docker Desktop abierto y Docker Compose disponible.
- Node.js y npm para compilar y probar fuera de Docker. La versión local utilizada fue Node.js 22.17.0.
- Git Bash y curl para el smoke test.
- `backend-arca` y `frontend-arca` clonados uno al lado del otro.
- Puertos 3000, 5433 y 8080 disponibles.

## Preparar la configuración

Desde la raíz de `backend-arca`:

```bash
cp .env.example .env
```

Edita el `.env` raíz y completa `INTERNAL_API_KEY` y `JWT_SECRET` con claves propias no vacías. Compose distribuye `INTERNAL_API_KEY` a todos los componentes y `JWT_SECRET` a `ms-auth` y al gateway. No publiques archivos `.env` ni credenciales reales.

El Compose actual está destinado al desarrollo local: sus `DATABASE_URL` apuntan a `db:5432`, con los usuarios y contraseñas dummy de `docker/init-schemas.sql`. Las variables de conexión adicionales del `.env.example` raíz no sustituyen esas URLs en este Compose.

Los `.env` de cada workspace son necesarios si ejecutas sus procesos directamente con Node. En ese caso, PostgreSQL local se encuentra en `localhost:5433`, no en `db:5432`.

## Levantar el entorno

```bash
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 180
docker compose ps
```

Para un arranque posterior sin reconstrucción:

```bash
docker compose up -d
```

Comandos útiles:

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

Después de cambiar código del backend, reconstruye las imágenes para que los contenedores utilicen los archivos nuevos. El directorio de código no está montado como volumen de desarrollo.

### Inicialización de PostgreSQL

El servicio `db` utiliza PostgreSQL 16, la base `arca` y el volumen persistente `db-data`.

Con un volumen vacío, PostgreSQL ejecuta automáticamente `docker/init-schemas.sql`. El script crea los seis schemas y roles, revoca acceso a schemas ajenos y configura permisos de tablas y secuencias existentes y futuras.

Los usuarios de ejecución no son propietarios y no tienen `CREATE` ni `TEMP`. El gateway tiene lectura e inserción sobre auditoría; los demás usuarios tienen CRUD en su schema.

El script no vuelve a ejecutarse automáticamente sobre un volumen ya inicializado. Si existe una base anterior, el administrador debe aplicar el bootstrap de forma controlada, sin borrar datos. Las contraseñas de roles existentes se conservan.

Crear roles y schemas no crea las tablas de negocio: estas se crean con las migraciones. Los permisos predeterminados corresponden al administrador que ejecutó el bootstrap; las migraciones deben utilizar ese mismo administrador o permisos equivalentes configurados explícitamente.

Los comandos existentes `npm run db:migrate` y `npm run db:seed` dependen de la configuración de conexión de los workspaces. No ejecutes migraciones con los usuarios restringidos de ejecución. No utilices `db:reset` salvo que quieras eliminar expresamente la base local.

### Accesos

| Componente        | Acceso desde el host         |
| ----------------- | ---------------------------- |
| Frontend          | http://localhost:3000        |
| Gateway           | http://localhost:8080        |
| Salud del gateway | http://localhost:8080/health |
| PostgreSQL        | localhost:5433               |

Los microservicios y Gotenberg no publican puertos al host. El frontend utiliza la red `web`; el gateway conecta `web` y `backend`.

## Rutas y seguridad interna

| Prefijo público      | Destino                     |
| -------------------- | --------------------------- |
| `/api/v1/auth`       | `http://ms-auth:3001`       |
| `/api/v1/personal`   | `http://ms-personal:3002`   |
| `/api/v1/vacaciones` | `http://ms-vacaciones:3003` |
| `/api/v1/contratos`  | `http://ms-contratos:3004`  |
| `/api/v1/boletas`    | `http://ms-boletas:3005`    |

El gateway elimina el prefijo público, conserva la query y propaga `X-Request-Id`. Bloquea el acceso exterior a rutas internas. Los cinco servicios protegen `/internal` con `X-Internal-Key` y responden 401 cuando falta o es incorrecta.

La HU-07 agrega `GET/POST /api/v1/personal/areas`, `PATCH /api/v1/personal/areas/:id`, `GET/POST /api/v1/personal/cargos` y `PATCH /api/v1/personal/cargos/:id`. Por compatibilidad también responden `/api/areas` y `/api/cargos`. Solo `ADMIN` y `RRHH` pueden operar los catálogos; los listados ocultan inactivos salvo `?incluirInactivos=true`. El contrato está en [docs/api/hu-07-catalogos.openapi.yaml](docs/api/hu-07-catalogos.openapi.yaml).

`GET /health` es público y consulta PostgreSQL mediante TypeORM: devuelve 200 con `{ service, status: "OK" }` o 503 con `{ code: "SERVICE_UNAVAILABLE", message, details: null }`.

Por excepción justificada, `/health` no utiliza Zod: no define body, query ni parámetros de ruta. Las nuevas operaciones que reciban datos deben validarlos con Zod.

El gateway valida el JWT de la HU-05 (ver "Autenticación y usuarios de demo") y deja pasar sin token solo `POST /api/auth/login` y su alias `POST /api/v1/auth/login`. El registro de auditoría es de la HU-24.

## Pruebas

```bash
npm install
npm run test:infra
npm run build
npm run db:seed   # 3 áreas, 5 cargos, 5 funcionarios y 4 usuarios (uno por rol)
npm test          # necesita la base levantada y migrada
```

`test:infra` compila shared y ejecuta las suites `health.test.ts` e `infra.test.ts` del gateway y los cinco servicios. Utiliza Jest + Supertest, TypeORM simulado y servidores HTTP locales de prueba. No necesita Docker ni Supabase.

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

Para ejecutar las pruebas de todos los workspaces:

```bash
npm run test --workspaces
```

La suite completa incluye pruebas de repositorios que necesitan una base de pruebas migrada y conexiones configuradas. Las pruebas que limpian datos requieren credenciales de prueba con permisos suficientes; el usuario de ejecución del gateway no puede borrar auditoría. No uses la base compartida de Supabase para estas pruebas.

Shared conserva su runner nativo `node:test` por excepción aprobada. La última ejecución verificada de infraestructura aprobó 109 pruebas en 12 suites; la compilación completa también terminó correctamente.

### Smoke test

Desde Git Bash:

```bash
bash scripts/smoke-test.sh
```

El script comprueba HTTP 200 en `http://localhost:8080/health`, con timeout y código de salida distinto de cero ante fallo. El responsable reportó un arranque local y smoke test satisfactorios; eso no demuestra por sí solo aislamiento de schemas o configuración en la nube.

## Credenciales y Supabase

CA-08 tiene una excepción aprobada: SQL y Compose contienen credenciales dummy exclusivamente para desarrollo local. Las credenciales reales, la clave interna y las cadenas de Supabase permanecen fuera del repositorio.

El proyecto arca-gestion-humana de Supabase fue provisionado y verificado el 02/11/2026 mediante Session Pooler y TLS validado: seis schemas, seis roles arca_* y seis migraciones aplicadas. Se comprobaron 26 accesos propios permitidos y 130 accesos ajenos rechazados. Consulta el [procedimiento y alcance](docs/Sprints/1/HU3/CA03-supabase.md) y la [evidencia real](docs/Sprints/1/HU3/CA03-supabase-evidencia.json). Los seis componentes del backend ya se ejecutan en Docker conectados a Supabase mediante el override descrito abajo, con TLS verificado y pools de hasta cinco conexiones. El Compose base conserva el modo local.

`docker/init-schemas.sql` es un bootstrap local listo, con validación local reportada por el responsable. No debe ejecutarse sin adaptación en Supabase: exige superusuario y rechaza schemas ajenos, mientras Supabase administra sus propios schemas. La variante compatible docker/supabase-init-schemas.sql ya se aplicó conservando los schemas de la plataforma. scripts/migrate-supabase.cjs y scripts/verify-supabase.cjs permiten repetir las migraciones y la verificación con la configuración privada.

## Documentación

- [Guía para desarrollar nuevas historias](docs/guia-desarrollo.md).
- [Verificación de HU-03](docs/Sprints/1/HU3/HU-03-verificacion.md).
- [OpenAPI: contratos internos y salud](docs/api/internal-contracts.openapi.yaml).
- [OpenAPI: login y sesión (HU-05)](docs/api/hu-05-auth.openapi.yaml).
- [OpenAPI: áreas y cargos (HU-07)](docs/api/hu-07-catalogos.openapi.yaml).
- [Arquitectura y convenciones](docs/HU-01_Arquitectura_Contexto_Equipo.md).
- [Modelo de datos](docs/Sprints/1/HU2/data-model.md).
- Diagramas C4: `docs/c4/`. ADRs: `docs/Sprints/1/adr/`.

## Ejecutar el backend con Supabase

La configuración adicional está en docker-compose.supabase.yml. El Compose base conserva el modo local. Se requiere Docker Compose >= 2.24.4 por las etiquetas de reemplazo de dependencias.

La configuración privada de ejecución está en .env.supabase.runtime (plantilla sin secretos en docker/supabase-runtime.env.example), con la clave interna y las seis URLs de los roles arca_*. No incluye la conexión administrativa. El certificado CA de Supabase está en .env.supabase-ca.crt y se monta como solo lectura en /run/secrets/supabase-ca.crt; no se copia en las imágenes.

Los seis DataSource activan TLS con validación de CA y hostname cuando DB_SSL_CA_FILE está definido. No incluir sslmode en DATABASE_URL junto con esa variable. DB_POOL_MAX es 5 por defecto y admite enteros entre 1 y 5 para respetar el límite de cada rol. Los servicios conservan su schema y synchronize: false.

Para levantar únicamente gateway, los cinco servicios y su dependencia Gotenberg con la nube:

```bash
docker compose --env-file .env.supabase.runtime -f docker-compose.yml -f docker-compose.supabase.yml up -d --build --wait gateway ms-auth ms-personal ms-vacaciones ms-contratos ms-boletas
bash scripts/smoke-test.sh
node scripts/verify-cloud-health.cjs
```

Si Docker Desktop no reconoce `docker compose`, usar su ejecutable `docker-compose` con los mismos argumentos.

La comprobación ejecutada el 02/11/2026 acreditó seis `/health` con 200, cinco rutas de salud por el proxy con 200 y el smoke test con 200. El verificador comprueba también rol, schema, proyecto, TLS cifrado/autorizado y tamaño del pool desde cada contenedor. Ver [evidencia de ejecución](docs/Sprints/1/HU3/CA03-supabase-health-evidencia.json).

El override elimina la dependencia de PostgreSQL local. No borra ni detiene su contenedor o volumen. Los microservicios mantienen sus puertos internos; gateway sigue en localhost:8080. El frontend conserva su configuración y repositorio independiente.

Para consultar un healthcheck interno sin publicar puertos:

```bash
docker compose --env-file .env.supabase.runtime -f docker-compose.yml -f docker-compose.supabase.yml exec -T ms-auth curl -fsS http://localhost:3001/health
```

Repetir en los demás servicios con su puerto; gateway se consulta desde http://localhost:8080/health. No ejecutar pruebas de repositorios que limpian datos contra esta base compartida.

## Arranque completo verificado (CA-02)

Con los dos repositorios hermanos, la configuración privada .env.supabase.runtime y el certificado CA preparados, un comando construye y levanta todo el conjunto:

```bash
docker compose --env-file .env.supabase.runtime -f docker-compose.yml -f docker-compose.supabase.yml up -d --build --wait
```

Si la instalación no dispone del subcomando docker compose, usar docker-compose con los mismos argumentos. El init del equipo se ejecuta en modo local. El override de nube lo deja en el perfil local-init; las migraciones de Supabase ya están aplicadas mediante el procedimiento administrativo documentado.

- Frontend: http://localhost:5174/ (solo loopback). El puerto se configura con FRONTEND_PORT; su valor predeterminado en el override es 5174. Los puertos 3000 y 5173 se conservan para otros proyectos.
- Gateway: http://localhost:8080/health.
- Los cinco servicios y Gotenberg conservan puertos internos. PostgreSQL local permanece como alternativa, con su volumen intacto; los seis componentes del backend utilizan Supabase.

Verificado el 02/11/2026: nueve contenedores healthy, frontend visible en navegador, HTML/JS/CSS con HTTP 200, conectividad frontend→gateway por Docker y respuesta CORS válida para el origen localhost:5174. Evidencia en [CA02-compose-evidencia.json](docs/Sprints/1/HU3/CA02-compose-evidencia.json) y [captura](docs/Sprints/1/HU3/CA02-frontend.png).

El frontend actual muestra únicamente “ARCA – Gestión Humana”. App.tsx todavía no llama a ApiService.health. Estas comprobaciones acreditan arranque y conectividad de infraestructura, no un flujo de negocio de la interfaz. El repositorio frontend-arca no se modificó.

## Entrega al equipo

[Entrega de HU-03 y continuidad para el equipo](docs/Sprints/1/HU3/HU-03-entrega-equipo.md): alcance realizado, evidencias, configuración, convenciones y pasos para implementar las siguientes historias.

> Sincronización con main: se conservaron los aportes del equipo (Node 22, CI, lint/formato, init local, contratos y utilidades). Ver [nota de integración](docs/Sprints/1/HU3/HU-03-sincronizacion-main.md). Las evidencias anteriores conservan su fecha; la nota registra las comprobaciones posteriores.
