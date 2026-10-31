# ADR-003: Comunicación entre servicios por REST síncrono

- **Estado:** Aceptada
- **Fecha:** 2026-10-29

## Contexto
Los servicios necesitan datos de `ms-personal`; `ms-personal` debe desactivar usuarios en `ms-auth` al dar de baja (HU-12), y `ms-auth` debe validar que el funcionario exista al crear un usuario (HU-06). El tiempo es de 2–3 sprints y el equipo ya conoce REST.

## Decisión
Comunicación síncrona HTTP/JSON por rutas `/internal/*`, no expuestas por el Gateway y protegidas con la cabecera `X-Internal-Key` dentro de la red de Docker. Cada cliente HTTP define timeout (3 s) y un reintento. Contratos en `docs/api/internal-contracts.openapi.yaml`.

## Alternativas consideradas
- **Mensajería (RabbitMQ/Kafka):** desacopla mejor, pero añade infraestructura y complejidad innecesarias para el MVP.
- **gRPC:** eficiente, pero sin ventaja clara a esta escala y con curva de aprendizaje.

## Consecuencias
- (+) Simple de implementar, depurar y probar con Supertest.
- (−) Acoplamiento temporal: si `ms-personal` cae, fallan las operaciones que lo necesitan; se devuelve error `503` con el formato común.
- (−) `ms-personal` y `ms-auth` se llaman en ambos sentidos. Se acepta porque las llamadas nunca se encadenan (crear usuario no da de baja a nadie, y dar de baja no crea usuarios); ninguna petición puede quedar esperando a sí misma.
- (−) La baja de un funcionario (personal → auth) no es transaccional; si `ms-auth` falla se debe registrar el estado pendiente y poder reintentar.
