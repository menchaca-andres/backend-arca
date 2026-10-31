# ADR-004: Proveedor de PostgreSQL en la nube

- **Estado:** Aceptada
- **Fecha:** 2026-10-30

## Contexto
Todos los integrantes deben trabajar contra la misma base sin que cada uno levante una local, y la demo al Directorio necesita datos estables.

## Decisión
Usar **Supabase** (PostgreSQL administrado, tier gratuito) como base compartida del proyecto. Se usa solo como PostgreSQL: no se usan Supabase Auth, Storage ni la API REST automática, porque la autenticación es de `ms-auth` y el acceso a datos es por TypeORM.

## Alternativas consideradas
- **Neon:** Postgres puro con ramas de BD; también válido. Se eligió Supabase por decisión del equipo.
- **Postgres en Docker Compose local:** cumple `docker compose up` sin cuentas externas, pero cada quien tiene datos distintos. Se mantiene como respaldo para desarrollo y pruebas.
- **Servidor propio:** sin costo de proveedor, pero requiere operarlo.

## Consecuencias
- (+) Base compartida y accesible desde cualquier máquina, con panel web para revisar tablas.
- (−) Dependencia de internet y de los límites del tier gratuito.
- (−) Un proyecto gratuito se pausa tras varios días sin actividad. Antes de cada revisión y de la demo, alguien del equipo debe confirmar que el proyecto está activo.
- **Conexión:** los servicios en Docker se conectan por el *pooler* de Supabase (cadena "Session pooler"), no por la conexión directa, porque la conexión directa del tier gratuito puede requerir IPv6. Con el pooler, el usuario de cada rol lleva el sufijo del proyecto (`<rol>.<project-ref>`).
- **Migraciones:** se corren por la cadena de Session pooler (no la de Transaction pooler).
- Las credenciales viajan por variables de entorno (`DATABASE_URL`); nunca se suben al repositorio. Se entrega un `.env.example`.
