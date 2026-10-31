# HU-01 – Arquitectura C4 y decisiones arquitectónicas
**Proyecto:** Sistema de Gestión Humana – ARCA Ltda. (Kata Tercer Desafío, 27/10/2026)
**Épica:** E1 Fundaciones de arquitectura · **Responsable:** I1 · **Sprint final:** 17 de noviembre

Este documento resume lo definido en la HU-01 para que todo el equipo construya sobre la misma estructura. Los detalles están en `docs/`.

---

## 1. Qué se entregó (criterios de aceptación)

| CA | Entregable | Archivo | Estado |
|----|-----------|---------|--------|
| CA-01 | C4 Nivel 1 – Contexto (RRHH, Dirección, Funcionario, Admin; Core como externo) | `docs/c4/nivel1-contexto.puml` | Hecho |
| CA-02 | C4 Nivel 2 – Contenedores (frontend, gateway, 5 microservicios, Gotenberg, PostgreSQL con 6 schemas) | `docs/c4/nivel2-contenedores.puml` | Hecho |
| CA-03 | C4 Nivel 3 – Componentes de `ms-personal` y `ms-boletas` (route → controller → service → repository) | `docs/c4/nivel3-ms-personal.puml`, `nivel3-ms-boletas.puml` | Hecho |
| CA-04 | 7 ADRs | `docs/adr/ADR-001` … `ADR-007` | Hecho |
| CA-05 | Contratos internos OpenAPI | `docs/api/internal-contracts.openapi.yaml` | Hecho (borrador) |
| CA-06 | Tabla de supuestos enviada al ingeniero y respuestas registradas | `docs/supuestos-negocio.md` | Hecho por decisión del equipo: no se envía; se trabaja con las propuestas por defecto |

Para ver los diagramas: abrir los `.puml` con la extensión *PlantUML* de VS Code o pegarlos en plantuml.com. Usan la librería C4 incluida en PlantUML (`!include <C4/...>`).

---

## 2. Arquitectura en una mirada

- **Frontend (SPA)** → **API Gateway** → 5 microservicios: `ms-auth`, `ms-personal`, `ms-vacaciones`, `ms-contratos`, `ms-boletas`.
- **PostgreSQL** (una instancia en la nube, 6 schemas): `auth`, `personal`, `vacaciones`, `contratos`, `boletas`, `auditoria`. Áreas y cargos viven en `personal`; feriados en `vacaciones`; `auditoria` lo escribe el Gateway (HU-24).
- **Gotenberg** convierte HTML a PDF para contratos y boletas.
- Los PDFs se guardan en la BD (`bytea`), en tablas separadas de los metadatos.

### Dependencias permitidas entre servicios
```
ms-vacaciones ─┐
ms-contratos  ─┼─► ms-personal ◄──► ms-auth
ms-boletas    ─┘
ms-contratos, ms-boletas ─► Gotenberg
```
`ms-personal` y `ms-auth` se llaman en ambos sentidos, pero nunca en cadena: personal → auth al dar de baja (HU-12) y auth → personal al crear un usuario vinculado a un funcionario (HU-06). Ninguna de las dos llamadas dispara la otra, así que no hay ciclo en tiempo de ejecución (ver ADR-003).
Cualquier dependencia nueva fuera de este esquema debe hablarse con el equipo y quedar en un ADR.

### Resumen de decisiones
| ADR | Decisión |
|-----|----------|
| 001 | Microservicios, un bounded context por módulo |
| 002 | Un schema de Postgres por servicio; cada servicio con su propio rol de BD; sin FK entre schemas |
| 003 | REST síncrono entre servicios por `/internal/*` con `X-Internal-Key`; timeout 3 s y un reintento |
| 004 | Supabase como Postgres administrado (conexión por Session pooler) |
| 005 | TypeORM, solo dentro de repositories; migraciones, `synchronize: false` |
| 006 | PDF en `bytea`, tabla aparte, con SHA-256; columna `select: false` |
| 007 | Gotenberg en Docker Compose, red interna |

---

## 3. Contratos internos (CA-05)

| Servicio | Endpoint | Uso |
|----------|----------|-----|
| `ms-personal` | `GET /internal/funcionarios/:id` | Obtener un funcionario (vacaciones, contratos, boletas) |
| `ms-personal` | `GET /internal/funcionarios?estado=&activosDesde=&activosHasta=` | Funcionarios activos de un periodo (principalmente boletas) |
| `ms-auth` | `PATCH /internal/usuarios/:id/estado` | Desactivar/reactivar usuario (lo llama `ms-personal` en la baja) |

Reglas del filtro de rango: devuelve a quien cumpla `fechaIngreso <= activosHasta` y (`fechaBaja` nula o `fechaBaja >= activosDesde`). Estados de funcionario: `EN_PRUEBA`, `RATIFICADO`, `BAJA` (se evita `ACTIVO` porque un funcionario en prueba también está activo, y el filtro `activosDesde/activosHasta` usa "activo" en ese sentido).

---

## 4. Convenciones para todos los servicios

**Capas:** `route → controller → service → repository`. Nadie se salta capas. TypeORM solo en `repository`; sin SQL crudo.

**Estructura sugerida por servicio:**
```
ms-<nombre>/
  src/
    routes/  controllers/  services/  repositories/
    entities/  schemas/ (Zod)  clients/ (HTTP a otros ms)
    middlewares/  config/  migrations/  app.ts  server.ts
  tests/  (unit + supertest)
  Dockerfile
```

**Errores:** siempre `{ "code": "...", "message": "...", "details": {...} }`. Códigos base: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `SERVICE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500).

**Validación:** Zod en la entrada de cada endpoint (middleware en la route).

**Pruebas:** unitarias de reglas de negocio en `service`/dominio + al menos una prueba Supertest por endpoint.

**Puertos propuestos:**
| Servicio | Puerto |
|----------|--------|
| api-gateway | 8080 |
| ms-auth | 3001 |
| ms-personal | 3002 |
| ms-vacaciones | 3003 |
| ms-contratos | 3004 |
| ms-boletas | 3005 |
| gotenberg | 3000 |

**Variables de entorno comunes:** `PORT`, `DATABASE_URL`, `DB_SCHEMA`, `INTERNAL_API_KEY`, `JWT_SECRET` (gateway y auth), y las URLs de otros servicios (`PERSONAL_SERVICE_URL`, `AUTH_SERVICE_URL`, `GOTENBERG_URL`). Nunca subir `.env` al repositorio; usar `.env.example`.

**Autenticación:** `ms-auth` emite JWT; el Gateway lo valida y propaga `X-User-Id`, `X-User-Role` y `X-Funcionario-Id` (este último vacío si el usuario no está vinculado a un funcionario; lo usan las reglas de "solo sus propios datos" de HU-09, 14, 16, 19 y 23). Las rutas `/internal/*` no pasan por el Gateway.

---

## 5. Qué necesita cada integrante de esto

- **ms-personal:** implementar los 2 endpoints `/internal/funcionarios` tal como están en el OpenAPI, el `AuthClient`, y las tablas `area` y `cargo` dentro del schema `personal`.
- **ms-auth:** implementar `PATCH /internal/usuarios/:id/estado` (idempotente), la emisión de JWT y un `PersonalClient` para validar el funcionario al crear usuarios (HU-06).
- **ms-vacaciones / ms-contratos / ms-boletas:** consumir `ms-personal` solo por esos contratos (usar un `PersonalClient`); no leer su schema.
- **ms-contratos / ms-boletas:** llamar a Gotenberg y guardar el PDF en tabla separada.
- **MER (HU-02):** respetar los límites de schema; la integridad entre servicios se valida por API, no por FK.
- **Documentación de APIs (HU-26):** partir de `internal-contracts.openapi.yaml`.

---

## 6. Pendientes y puntos a confirmar

1. **CA-06 (resuelto 30/10):** el equipo decidió trabajar con las propuestas por defecto de `docs/supuestos-negocio.md` sin esperar respuesta. Si el ingeniero corrige alguna, se ajusta la HU afectada.
2. **ADR-004 (resuelto 30/10):** Supabase. Ojo: el proyecto gratuito se pausa por inactividad; confirmarlo activo antes de revisiones y de la demo.
3. **Sexto schema (resuelto):** es `auditoria`, según el backlog (HU-02 CA-01, HU-24). Se descartó `catalogos`: áreas y cargos van en `personal` y los feriados en `vacaciones`, para que cada servicio sea dueño de lo que usa.
4. **Frontend (resuelto):** React + Vite, como dice el stack del backlog.
5. **Baja no transaccional:** si `ms-auth` falla durante una baja, definir cómo se reintenta (ver ADR-003).
6. **Definition of Done:** al ser una HU de documentación, los ítems de código, Supertest, Zod y `docker compose up` no aplican a HU-01 directamente; sí aplican PR revisado por otro integrante y demo al equipo.

---

## 7. Cambios y archivos nuevos

```
hu-01-arquitectura/
├── HU-01_Arquitectura_Contexto_Equipo.md   (este archivo)
└── docs/
    ├── c4/   nivel1-contexto.puml · nivel2-contenedores.puml · nivel3-ms-personal.puml · nivel3-ms-boletas.puml
    ├── adr/  ADR-001 … ADR-007
    ├── api/  internal-contracts.openapi.yaml
    └── supuestos-negocio.md
```
