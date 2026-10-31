# HU-02 – Handoff para Claude Code

Este archivo explica dónde quedó la HU-02 y qué falta para terminarla. Léelo completo antes de tocar código.

**Proyecto:** Sistema de Gestión Humana de ARCA Ltda. (kata universitario, entrega 17/11/2026).
**HU-02:** Diseñar el modelo de datos y las migraciones por servicio. **Sprint 1** (28/10 – 03/11). Responsable: I2 (yo).
**Rama:** `feature/HU-02-modelo-datos`

---

## 1. Fuentes de verdad (leer primero)

| Archivo | Qué contiene |
|---|---|
| `docs/Sprints/1/HU2/data-model.md` | **El modelo completo.** 6 schemas, 20 tablas, cada columna con tipo, nulabilidad, CHECK, índices y la HU que la usa. Las entities deben salir de aquí, columna por columna. |
| `docs/Sprints/1/adr/ADR-002-schema-por-servicio.md` | Un schema por servicio, sin FK entre schemas. |
| `docs/Sprints/1/adr/ADR-005-typeorm.md` | TypeORM solo en repositories, `synchronize: false`, migraciones. |
| `docs/Sprints/1/adr/ADR-006-pdf-en-bd-bytea.md` | PDF en tabla aparte, `select: false`. |
| `docs/Sprints/1/api/internal-contracts.openapi.yaml` | Contratos entre servicios. Los enums deben coincidir con este archivo. |
| `docs/Sprints/1/HU-01_Arquitectura_Contexto_Equipo.md` | Convenciones del equipo: capas, estructura de carpetas, errores, puertos. |

Si algo de este handoff contradice `docs/Sprints/1/HU2/data-model.md`, **manda `data-model.md`**. Si `data-model.md` contradice otra HU, no lo resuelvas solo: déjalo anotado y pregúntame.

---

## 2. Stack (ya decidido, no cambiar)

- Node.js + **TypeScript** + Express, un microservicio por bounded context.
- **TypeORM** con migraciones. **Prohibido:** SQL crudo (la única excepción del proyecto es el trigger de inmutabilidad de boletas, y es de la HU-22, no de esta), Prisma, `synchronize: true`.
- PostgreSQL en **Supabase** (ADR-004). **En esta etapa no usamos Supabase:** todo se hace contra un Postgres local en Docker. Aplicar en Supabase queda para después (sección 6).
- Validación con Zod, pruebas con Jest + Supertest (las pruebas de endpoints no son de esta HU).

---

## 3. Dónde estamos

**Hecho:**
- [x] HU-01: C4, ADRs, contratos internos (en `docs/`).
- [x] HU-02 T1 – Diseño del MER: `docs/Sprints/1/HU2/data-model.md`, con un diagrama Mermaid por schema.
- [x] HU-02 T4 (parte 1) – Diccionario de datos: es el mismo `docs/Sprints/1/HU2/data-model.md`.

**Falta (esto es lo que vas a hacer):**
- [ ] T2 – Entities de TypeORM de los 6 schemas + migración inicial por servicio.
- [ ] T3 – Repositories base.
- [ ] T4 (parte 2) – Semilla mínima de desarrollo.

**No es de esta HU (no lo hagas):**
- Services, controllers, routes o endpoints de negocio (HU-05 en adelante).
- Crear la base en Supabase, los roles de BD por schema o los `GRANT` (HU-03).
- El trigger de inmutabilidad de boletas (HU-22).
- La semilla grande de demo de 40 funcionarios (HU-27).

---

## 4. Estructura esperada

La plantilla de servicio la crea la HU-03 (otro integrante). **Primero revisa si ya existe en `main`.**
- **Si existe:** usa sus carpetas, su `data-source.ts` y su `packages/shared` tal cual; no los dupliques.
- **Si no existe:** crea solo lo mínimo que esta HU necesita, respetando esta estructura (acordada en la HU-01), y avísame para coordinar el merge:

```
packages/shared/src/
  enums.ts                  ← enums compartidos (ver 5.2)
  numeric.transformer.ts    ← numeric → number
services/ms-auth/src/        entities/  repositories/  migrations/  data-source.ts
services/ms-personal/src/    entities/  repositories/  migrations/  data-source.ts
services/ms-vacaciones/src/  entities/  repositories/  migrations/  data-source.ts
services/ms-contratos/src/   entities/  repositories/  migrations/  data-source.ts
services/ms-boletas/src/     entities/  repositories/  migrations/  data-source.ts
gateway/src/                 entities/  migrations/  data-source.ts      ← schema auditoria
```

| Servicio | Schema | Tablas |
|---|---|---|
| ms-auth | `autenticacion` | usuario |
| ms-personal | `personal` | area, cargo, funcionario, asignacion_laboral |
| ms-vacaciones | `vacaciones` | feriado, solicitud_vacacion |
| ms-contratos | `contratos` | plantilla, plantilla_version, contrato, contrato_pdf, correlativo |
| ms-boletas | `boletas` | concepto, periodo, novedad, boleta, boleta_detalle, boleta_pdf, correlativo |
| gateway | `auditoria` | evento |

---

## 5. T2 – Entities y migraciones

### 5.1 `data-source.ts` (uno por servicio)

```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: process.env.DB_SCHEMA,            // 'personal', 'boletas', ...
  namingStrategy: new SnakeNamingStrategy(),
  entities: [__dirname + '/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',        // queda dentro del schema del servicio
  synchronize: false,
});
```

Dependencias: `typeorm`, `pg`, `reflect-metadata`, `typeorm-naming-strategies`. En `tsconfig`: `experimentalDecorators` y `emitDecoratorMetadata` en `true`.

### 5.2 Reglas para escribir las entities

1. **Nombres:** propiedades en camelCase; la `SnakeNamingStrategy` las pasa a snake_case. No escribas `name:` en `@Column` ni en `@Entity` (salvo el nombre de tabla, `@Entity('asignacion_laboral')`, para que quede en singular).
2. **PK:** `@PrimaryGeneratedColumn('uuid') id!: string;`. Excepción: `auditoria.evento` usa `@PrimaryGeneratedColumn('increment', { type: 'bigint' })`.
3. **Dinero:** `@Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer }) monto!: number;`. Porcentajes: `precision: 7, scale: 4`. El transformer debe manejar `null`.
4. **Fechas de negocio** (`date`): tipo `string` en TypeScript (`'YYYY-MM-DD'`). **Nunca `Date`**: Bolivia es UTC-4 y se corre un día. Los instantes (`timestamptz`) sí son `Date`.
5. **Enums:** define una sola vez en `packages/shared/src/enums.ts` y usa `{ type: 'enum', enum: X, enumName: 'x' }`. Pon `enumName` explícito cuando el mismo enum aparezca en dos tablas del mismo schema (ej. `TipoConcepto` en `concepto` y `boleta_detalle`) para que Postgres cree un solo tipo.
   Enums: `RolUsuario`, `EstadoFuncionario` (`EN_PRUEBA`, `RATIFICADO`, `BAJA`), `MotivoBaja`, `MotivoAsignacion`, `EstadoSolicitud`, `TipoContrato`, `EstadoContrato`, `TipoConcepto`, `FormaCalculo`, `BaseCalculo`, `EstadoPeriodo`, `EstadoBoleta`. Los valores exactos están en `data-model.md`.
6. **CHECK:** con `@Check('<nombre>', '<expresión>')` en la clase, usando los nombres de columna en **snake_case y entre comillas**: `@Check('ck_cargo_banda', '"salario_min" <= "salario_max"')`. Ponles nombre (prefijo `ck_`) para que los errores se entiendan.
7. **Índices únicos parciales:** `@Index('ux_asignacion_vigente', ['funcionarioId'], { unique: true, where: '"vigente_hasta" IS NULL' })`. Hay cuatro: asignación vigente, versión de plantilla activa, contrato vigente y boleta no rectificada por período y funcionario.
8. **Relaciones solo dentro del mismo schema.** Una referencia a otro servicio (`funcionarioId` fuera de `personal`, cualquier `*Por`) es `@Column('uuid')` con `@Index()`, **sin** `@ManyToOne`.
   Sí hay relación: `cargo → area`, `asignacion_laboral → funcionario/cargo`, `plantilla_version → plantilla`, `contrato → plantilla_version`, `novedad → concepto`, `boleta → periodo`, `boleta → boleta` (rectificación), `boleta_detalle → boleta/concepto`, `*_pdf → contrato/boleta`.
9. **FK con `onDelete`:** `boleta_detalle.boleta` = `CASCADE`; `boleta_detalle.concepto` y `novedad.concepto` = `RESTRICT`. El resto, el default.
10. **PDF:** `contrato_pdf` y `boleta_pdf` usan la FK como PK (`@PrimaryColumn('uuid') contratoId` + `@OneToOne` + `@JoinColumn`), y `@Column('bytea', { select: false }) contenido!: Buffer;`.
11. **`usuario.passwordHash`** también lleva `select: false`.
12. **`correlativo`:** PK compuesta `(tipo, anio)` con dos `@PrimaryColumn`.
13. **`created_at` / `updated_at`:** `@CreateDateColumn({ type: 'timestamptz' })` y `@UpdateDateColumn({ type: 'timestamptz' })`. Las tablas inmutables (`asignacion_laboral`, `plantilla_version`, `contrato`, `boleta`, `boleta_detalle`, `evento`) solo llevan `created_at`.
14. Sin lógica de negocio en las entities. Las validaciones que `data-model.md` marca como "se valida en el service" **no** van aquí.

### 5.3 Migraciones (contra Postgres local)

```bash
docker run -d --name arca-pg -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=arca postgres:16
# crear los 6 schemas una vez (ver nota)
# por cada servicio, con DATABASE_URL=postgres://postgres:dev@localhost:5432/arca y su DB_SCHEMA:
npx typeorm-ts-node-commonjs migration:generate src/migrations/InitialSchema -d src/data-source.ts
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
```

- Usa la misma versión mayor de Postgres que use el proyecto de Supabase (se ve en el panel del proyecto; si todavía no existe, 16 está bien).
- **Nota sobre los schemas:** en local, créalos a mano una vez con `psql` (`CREATE SCHEMA personal;` etc.). Es configuración de tu máquina, no código del repo. En Supabase los crea la HU-03.
- Una migración inicial por servicio. Revisa el archivo generado: deben aparecer todos los CHECK, los 4 índices parciales y las FK con su `onDelete`. Si TypeORM no generó alguno, corrige la entity y regenera; no edites el SQL a mano.
- Prueba que la migración baja y sube limpia: `migration:revert` y otra vez `migration:run`.

---

## 6. T3 – Repositories base

Un repository por entity en `src/repositories/`, que envuelve al `Repository` de TypeORM. Los services (de otras HU) nunca usarán TypeORM directo.

```ts
export class FuncionarioRepository {
  private repo = AppDataSource.getRepository(Funcionario);
  findById(id: string) { return this.repo.findOneBy({ id }); }
  findAll() { return this.repo.find(); }
  save(entity: Funcionario) { return this.repo.save(entity); }
}
```

- Solo `findById`, `findAll` y `save`. Las consultas especiales (filtros, solapamiento, vigentes, etc.) las agrega cada HU cuando las necesite.
- Para `UsuarioRepository`, agrega `findByEmailWithPassword(email)` con `.addSelect('usuario.passwordHash')`, porque la HU-05 lo va a necesitar y el campo tiene `select: false`.
- **ST3.2:** una prueba por repository contra el Postgres local: guardar, leer por id y comprobar que un CHECK o un índice único rechaza un dato inválido (por ejemplo, dos asignaciones vigentes para el mismo funcionario).

---

## 7. T4 (parte 2) – Semilla mínima de desarrollo

Un script `src/seeds/dev.seed.ts` en `ms-personal` (y uno en `ms-auth` si hace falta) que inserte usando los **repositories**, no SQL:
- 3 áreas, 5 cargos con bandas salariales coherentes.
- 5 funcionarios con su asignación `INGRESO` vigente: 2 `EN_PRUEBA`, 2 `RATIFICADO` (uno con más de 1 año de antigüedad, para probar vacaciones) y 1 `BAJA` con su asignación cerrada.
- Que se pueda correr dos veces sin duplicar (buscar por `codigo` o `ci` antes de insertar).

Sirve para que en el Sprint 2 las HU-09 a HU-14 no se traben esperando el alta de la HU-08.

---

## 8. Cuándo está terminada esta etapa

- [ ] Las 20 entities existen y coinciden con `docs/Sprints/1/HU2/data-model.md`, columna por columna.
- [ ] `packages/shared` tiene los enums y el `numericTransformer`.
- [ ] Cada servicio tiene su migración inicial, y `migration:run` + `migration:revert` corren limpios en el Postgres local.
- [ ] Los CHECK y los 4 índices parciales aparecen en las migraciones.
- [ ] Hay repositories base y sus pruebas pasan contra el Postgres local.
- [ ] La semilla mínima corre y es idempotente.
- [ ] `tsc` sin errores. No hay SQL crudo ni `synchronize: true` en ningún lado.
- [ ] PR desde `feature/HU-02-modelo-datos` con la descripción de lo hecho.

**Queda pendiente para después (no bloquea el PR):** correr `migration:run` y la semilla contra Supabase con la cadena del **Session pooler** (no la conexión directa ni el Transaction pooler), cuando la HU-03 tenga la base y los roles creados. Con eso se cierra la HU-02 completa.

---

## 9. Si encuentras algo que no cuadra

No inventes una solución que cambie el modelo. Anótalo en una sección **"Dudas"** al final de `docs/Sprints/1/HU2/data-model.md`, con la tabla, la columna y qué HU afecta, y sigue con lo demás.
