# Implementación de HU-13 y HU-14: Vacaciones

## Alcance

Este documento describe la implementación de **HU-13: Calcular elegibilidad y saldo** y
**HU-14: Solicitar vacaciones** en el módulo `ms-vacaciones`, además de su integración con
el portal web. La aprobación, rechazo y cancelación de solicitudes siguen fuera del alcance
de estas historias.

## Contexto funcional

- La elegibilidad exige que el funcionario esté `RATIFICADO`, haya cumplido al menos un año
  desde su ingreso y no esté de baja. Se devuelve un motivo explícito cuando no cumple.
- Cada aniversario completo acredita 15 días hábiles. La fecha de aniversario se calcula
  en calendario, sin aproximarla a bloques de 365 días.
- El saldo se calcula como `15 × gestiones cumplidas − días aprobados − días pendientes`.
  Las solicitudes pendientes reservan días; las rechazadas no se descuentan.
- Los rangos de vacaciones son inclusivos. El conteo excluye sábados, domingos y feriados.
  Las fechas actuales y las fechas mínimas de solicitud se interpretan con la zona
  `America/La_Paz`.
- Una solicitud debe iniciar en una fecha futura y contener al menos un día hábil. No puede
  superar el saldo ni coincidir con solicitudes pendientes o aprobadas existentes.
- `FUNCIONARIO` solo puede solicitar para su propio funcionario; `RRHH` puede registrar por
  otra persona y queda identificado como responsable del registro.

## Endpoints

Los endpoints de servicio se exponen bajo `/api/v1/vacaciones` a través del gateway. Se
mantiene además el prefijo legado `/api/vacaciones`.

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/saldo/:idFuncionario` | Elegibilidad, motivo, gestiones, días ganados/usados/reservados/disponibles y próxima gestión. |
| `GET` | `/dias-habiles?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | Vista previa del conteo hábil de un rango. |
| `GET` | `/feriados/:anio` | Catálogo nacional de feriados (2026 y 2027). |
| `GET` | `/solicitudes` | Solicitudes propias para `FUNCIONARIO`; listado general para RRHH, ADMIN y DIRECCION. |
| `POST` | `/solicitudes` | Crear solicitud `PENDIENTE`; el cuerpo admite `funcionarioId` únicamente para RRHH. |

Las rutas de consulta y registro de vacaciones utilizan la identidad que el gateway obtiene
del JWT. Los errores siguen el formato común `{ code, message, details }` mediante
`AppError` y la capa compartida de manejo de errores. Los datos de entrada se validan con
Zod.

## Integración entre servicios

`ms-vacaciones` no consulta la base de datos de Personal directamente. Solicita el contrato
del funcionario a `GET /internal/funcionarios/:id` de `ms-personal`, protegido por
`X-Internal-Key`. El servicio de Personal devuelve su estado, fecha de ingreso y nombre, que
son los datos necesarios para aplicar las reglas de las dos historias. La ruta interna
reutiliza el repositorio y el servicio de Personal.

La tabla de feriados existente en el esquema de vacaciones se conserva. El repositorio une
los feriados persistidos con el catálogo nacional integrado, de modo que el catálogo 2026 y
2027 está disponible también en instalaciones nuevas sin pasos manuales.

## Interfaz

La página de vacaciones dejó de usar registros ficticios y consulta los endpoints reales.
Muestra tarjetas de días disponibles, utilizados, reservados y ganados; elegibilidad y su
motivo; y una barra de progreso hacia la próxima gestión. RRHH puede elegir un funcionario
para consultar su saldo y registrar una solicitud.

En el formulario se obtiene del backend la vista previa de días hábiles al elegir el rango.
No se permite enviar mientras el rango sea inválido, esté cargando el conteo o no tenga días
hábiles.

## Pruebas y verificación

Se añadieron pruebas unitarias de acumulación por aniversario, elegibilidad, feriados,
solicitudes que se cruzan, saldo insuficiente, fechas no válidas y permisos de registro.
También se añadieron pruebas Supertest de los endpoints de saldo, conteo hábil, feriados,
listado y creación. La nueva ruta interna de Personal también tiene una prueba Supertest
para el contrato y la validación del identificador.

Verificaciones ejecutadas:

- `npm run test --workspace=ms-vacaciones -- vacaciones.test.ts`: **13 pruebas aprobadas**.
- `npm run test --workspace=ms-personal -- funcionario.internal.test.ts`: **2 pruebas aprobadas**.
- Build de `@arca/shared`, `ms-vacaciones` y `ms-personal`: **correcto**.
- `npm run build` del frontend: **correcto**.
- `npm run lint` del frontend: **correcto**; el linter muestra avisos preexistentes en
  Personal, Usuarios y Catálogos.

La definición OpenAPI está en [`api/hu-13-14-vacaciones.openapi.yaml`](./api/hu-13-14-vacaciones.openapi.yaml).
El `docker compose` existente aplica las migraciones de los servicios durante su inicialización;
no se requieren cambios manuales de esquema para estas historias. La revisión/aprobación por
otro integrante y la demo al equipo son actividades de proceso y no se pueden certificar
desde esta implementación local.

## Archivos implementados

Las rutas de esta tabla son relativas a la raíz del proyecto indicado. **Creado** significa
que el archivo se agregó para estas historias; **Editado** significa que ya existía y se
modificó para integrar la implementación.

| Proyecto / origen | Archivo (ruta relativa al proyecto) | Cambio | Área o capa | Implementación |
|---|---|---|---|---|
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/domain/calculo-vacaciones.ts` | Creado | Dominio | Cómputo de gestiones, días ganados, aniversario y elegibilidad. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/domain/feriados.ts` | Creado | Dominio | Catálogo nacional 2026/2027 y función `contarDiasHabiles`. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/clients/personal.client.ts` | Creado | Cliente entre servicios | Consulta autenticada del contrato interno de Personal. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/schemas/vacaciones.schema.ts` | Creado | Validación | Esquemas Zod para fechas, rangos e identificadores. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/middlewares/validate.middleware.ts` | Creado | Middleware | Validación Zod de body, parámetros y query strings. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/controllers/vacaciones.controller.ts` | Creado | Controller | Manejo HTTP para saldo, días hábiles, feriados y solicitudes. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/services/vacaciones.service.ts` | Creado | Service | Reglas de negocio de HU-13 y HU-14. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/routes/vacaciones.routes.ts` | Creado | Routes / autorización | Endpoints y permisos según rol e identidad del funcionario. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/app.ts` | Editado | Aplicación / montaje de rutas | Registro de rutas para el gateway versionado y el prefijo legado. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/repositories/feriado.repository.ts` | Editado | Repository | Lectura de feriados persistidos y combinación con el catálogo nacional integrado. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/src/repositories/solicitud-vacacion.repository.ts` | Editado | Repository | Listado por funcionario y búsqueda de solicitudes con rangos cruzados. |
| Backend — `backend-arca-main` / `ms-vacaciones` | `services/ms-vacaciones/tests/vacaciones.test.ts` | Creado | Pruebas | Pruebas unitarias de reglas y Supertest de los endpoints. |
| Backend — `backend-arca-main` / `ms-personal` | `services/ms-personal/src/routes/funcionario.internal.routes.ts` | Creado | Routes internas | Ruta interna protegida para consultar los datos del funcionario. |
| Backend — `backend-arca-main` / `ms-personal` | `services/ms-personal/src/controllers/funcionario.internal.controller.ts` | Creado | Controller | Validación del identificador y respuesta HTTP del contrato interno. |
| Backend — `backend-arca-main` / `ms-personal` | `services/ms-personal/src/services/funcionario.service.ts` | Editado | Service | Construcción del contrato requerido por Vacaciones desde datos de Personal. |
| Backend — `backend-arca-main` / `ms-personal` | `services/ms-personal/src/app.ts` | Editado | Aplicación / montaje de rutas | Registro de la ruta interna detrás de la clave compartida. |
| Backend — `backend-arca-main` / `ms-personal` | `services/ms-personal/tests/funcionario.internal.test.ts` | Creado | Pruebas | Prueba Supertest del contrato interno y de la validación del identificador. |
| Frontend — `frontend-arca-main` | `src/types/index.ts` | Editado | Tipos compartidos | Tipos del saldo de vacaciones y de sus solicitudes. |
| Frontend — `frontend-arca-main` | `src/services/api.ts` | Editado | Servicio API | Métodos para saldo, listado, conteo de días hábiles y registro de solicitudes. |
| Frontend — `frontend-arca-main` | `src/features/vacaciones/VacacionesPage.tsx` | Editado | Pantalla / feature | Tarjetas de saldo, barra de progreso, solicitudes reales, selector para RRHH y formulario. |
| Backend — `backend-arca-main` / documentación API | `docs/api/hu-13-14-vacaciones.openapi.yaml` | Creado | Documentación API | Contrato OpenAPI de las rutas de Vacaciones. |
| Backend — `backend-arca-main` / documentación | `docs/HU-13-14-IMPLEMENTACION.md` | Editado | Documentación de entrega | Contexto funcional, endpoints, decisiones, verificación e inventario de cambios. |
