# ADR-001: Microservicios con un bounded context por módulo

- **Estado:** Aceptada
- **Fecha:** 2026-10-29

## Contexto
El kata exige arquitectura de microservicios (el Sistema Core de ARCA ya lo es) y 4 módulos de MVP: Personal, Vacaciones, Contratos y Boletas. Se necesita que varios integrantes trabajen en paralelo sin pisarse.

## Decisión
Un microservicio por bounded context: `ms-personal`, `ms-vacaciones`, `ms-contratos`, `ms-boletas`, más `ms-auth` (usuarios y roles) y un API Gateway como entrada única.

## Alternativas consideradas
- **Monolito modular:** más simple de operar, pero no cumple el patrón exigido.
- **Un servicio por entidad:** demasiado granular para 2–3 sprints.

## Consecuencias
- (+) Trabajo en paralelo con contratos claros; despliegue y pruebas por servicio.
- (−) Más complejidad operativa (Docker Compose, red, trazabilidad).
- (−) Hay que evitar acoplamiento: dependencias permitidas solo `vacaciones|contratos|boletas → personal`, `personal → auth` (baja) y `auth → personal` (validar funcionario al crear usuario). Las dos últimas nunca se encadenan (ver ADR-003).
