# ADR-002: Un schema de PostgreSQL por servicio

- **Estado:** Aceptada
- **Fecha:** 2026-10-29

## Contexto
La información debe estar en una base relacional. Una instancia por servicio es costosa de operar para el alcance del kata, pero compartir tablas rompería la independencia de los microservicios.

## Decisión
Una sola instancia PostgreSQL con 6 schemas: `autenticacion`, `personal`, `vacaciones`, `contratos`, `boletas`, `auditoria`. Cada servicio tiene su propio rol de BD con permisos **solo** sobre su schema. Áreas y cargos son tablas de `personal`; los feriados, de `vacaciones`. El schema `auditoria` lo escribe solo el API Gateway, con un rol que puede insertar pero no actualizar ni borrar (HU-24). Ningún servicio lee tablas de otro: los datos ajenos se piden por API.

## Alternativas consideradas
- **Base por servicio:** aislamiento total, pero más costo y configuración.
- **Tablas compartidas en `public`:** simple, pero acopla servicios.

## Consecuencias
- (+) Aislamiento lógico con costo operativo bajo; migración futura a bases separadas sencilla.
- (−) Sin claves foráneas entre schemas: la integridad entre servicios (ej. `funcionarioId`) se valida por API, no por FK.
- (−) El MER (HU-02) debe respetar los límites de schema.
- Se descartó un schema `catalogos` compartido: obligaba a `ms-vacaciones` a pedir los feriados por API en cada cálculo de días hábiles.
- El schema de `ms-auth` se llama `autenticacion` y no `auth`, porque Supabase (ADR-004) ya usa `auth` para su propio servicio de autenticación.
