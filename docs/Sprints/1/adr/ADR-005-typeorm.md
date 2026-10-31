# ADR-005: TypeORM como ORM

- **Estado:** Aceptada
- **Fecha:** 2026-10-29

## Contexto
Los servicios están en Node.js + TypeScript sobre PostgreSQL y el Definition of Done exige acceso a datos solo en repositories y sin SQL crudo.

## Decisión
TypeORM con el patrón Repository. Cada servicio configura `schema` propio en su `DataSource`. Las migraciones de TypeORM versionan el esquema; `synchronize` queda en `false`. TypeORM solo se importa dentro de la capa `repository` y de la configuración del DataSource.

## Alternativas consideradas
- **Prisma:** buena experiencia de desarrollo, pero el soporte de múltiples schemas es más restrictivo y la regla pide TypeORM.
- **Knex/SQL directo:** el DoD prohíbe SQL crudo.

## Consecuencias
- (+) Decoradores y entidades tipadas; encaja con la separación en capas.
- (−) Hay que cuidar consultas N+1 y las relaciones `eager`.
- (−) Las columnas `bytea` se deben marcar `select: false` para no cargarlas en listados.
