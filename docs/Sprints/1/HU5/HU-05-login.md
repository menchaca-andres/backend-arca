# HU-05 – Iniciar sesión con roles

**Sprint 1 · Responsable:** I5 · **Estado:** implementado en backend y frontend.

## 1. Criterios de aceptación

| CA | Estado | Evidencia |
|---|---|---|
| CA-01 JWT de 8 h con `sub`, `rol` e `id_funcionario` | Hecho | `AuthService.login()` firma con `expiresIn: '8h'`; prueba verifica `exp - iat = 28800`. |
| CA-02 401 genérico con o sin correo | Hecho | Mismo mensaje `Credenciales inválidas`; se compara contra un hash de descarte si el usuario no existe. |
| CA-03 Contraseñas bcrypt | Hecho | `bcryptjs` (10 rondas en semilla, 4 en pruebas); `passwordHash` tiene `select: false` y no sale en la respuesta. |
| CA-04 Usuario desactivado no entra | Hecho | `activo = false` devuelve 401. |
| CA-05 Bloqueo tras 5 fallos por 15 min | Hecho | Se guarda `intentos_fallidos` y `bloqueado_hasta`; responde 423 `ACCOUNT_LOCKED`; al vencer permite entrar. |
| CA-06 Gateway valida JWT y propaga identidad | Hecho | `jwtAuth` valida todas las rutas `/api` salvo `/api/auth/login`; inyecta `x-user-id`, `x-user-rol`, `x-funcionario-id`; descarta cabeceras del cliente. |
| CA-07 `requireRole` en shared | Hecho | `@arca/shared` expone `requireRole` y `requireSelfOrRole`; pruebas de 401/403. |
| CA-08 Semilla con los 4 roles | Hecho | `ms-auth/src/seeds/users.seed.ts`; se ejecuta en `db:seed` y en el `init` de compose. |
| CA-09 Pantalla de login y redirección | Hecho | `LoginPage` muestra errores, guarda sesión y navega al inicio; el inicio muestra módulos según el rol. |
| CA-10 Cerrar sesión borra el token | Hecho | `logout()` limpia `localStorage` y vuelve a `/login`; un 401 de una ruta protegida también limpia la sesión. |

## 2. Endpoints

El contrato OpenAPI está en [`docs/api/hu-05-auth.openapi.yaml`](../../../api/hu-05-auth.openapi.yaml).

### `POST /api/auth/login`

```json
{ "email": "rrhh@arca.bo", "password": "Rrhh123!" }
```

Respuesta `200`:

```json
{
  "token": "<jwt>",
  "usuario": {
    "id": "<uuid>",
    "email": "rrhh@arca.bo",
    "rol": "RRHH",
    "funcionarioId": null
  }
}
```

Errores:
- `400 VALIDATION_ERROR`: correo o contraseña inválidos (Zod).
- `401 UNAUTHORIZED`: credenciales incorrectas o usuario desactivado.
- `423 ACCOUNT_LOCKED`: cuenta bloqueada; `details.minutosRestantes`.

### `GET /api/auth/me`

Requiere `Authorization: Bearer <token>`. Devuelve `{ id, rol, funcionarioId }` a partir de las cabeceras que inyecta el gateway. Sirve para probar el contrato de identidad y para futuras pantallas de sesión.

## 3. JWT y gateway

- Algoritmo HS256, secreto `JWT_SECRET`, vigencia 8 h.
- Payload: `sub` (id del usuario), `rol` (`ADMIN`, `RRHH`, `DIRECCION`, `FUNCIONARIO`) e `id_funcionario` (puede ser `null`).
- El gateway:
  1. descarta `x-user-id`, `x-user-rol` y `x-funcionario-id` enviados por el cliente;
  2. deja pasar `/api/auth/login`;
  3. valida el Bearer en el resto de `/api`;
  4. inyecta las tres cabeceras con los datos del token.
- Las rutas `/health` y los archivos estáticos no pasan por la validación.

## 4. Usuarios de demo

| Rol | Correo | Contraseña |
|---|---|---|
| ADMIN | `admin@arca.bo` | `Admin123!` |
| RRHH | `rrhh@arca.bo` | `Rrhh123!` |
| DIRECCION | `direccion@arca.bo` | `Direccion123!` |
| FUNCIONARIO | `funcionario@arca.bo` | `Funcionario123!` |

El usuario FUNCIONARIO se vincula al funcionario de CI `9000003` (Daniela Mendoza), cuyo id es fijo en la semilla de `ms-personal` (`11111111-1111-4111-8111-111111111103`). Los ids determinísticos solo se aplican en una base nueva; para la demo conviene `npm run db:reset` antes de sembrar.

## 5. Frontend

- `/login`: formulario, mensaje de error del backend y redirección al inicio.
- `/`: ruta protegida; si no hay sesión redirige a `/login`.
- `AuthProvider` guarda token y usuario en `localStorage`; `logout()` los elimina.
- El cliente HTTP adjunta el token, traduce el error `{ code, message, details }` y, ante un 401 de una ruta protegida, limpia la sesión y avisa al contexto.
- El inicio muestra módulos distintos según el rol.

La UI se verificó con `npm run build`, `npm run lint` y revisión del bundle; no hay una prueba E2E de navegador en este alcance.

## 6. Pruebas

- `ms-auth/tests/services/auth.service.test.ts`: login válido, expiración de 8 h, credenciales inválidas, bloqueo al quinto intento, usuario inactivo y desbloqueo al vencer.
- `ms-auth/tests/routes/auth.routes.test.ts`: endpoint de login, Zod, `/auth/me` con y sin identidad.
- `ms-auth/tests/middlewares/require-role.test.ts`: 401 sin identidad, 403 con rol incorrecto y regla de dueño.
- `gateway/tests/middlewares/auth.test.ts`: ruta pública, falta de token, token válido, vencido e inválido, y propagación de identidad.

## 7. Pendientes y decisiones

- El token se guarda en `localStorage`; es lo más simple para el MVP, pero si se endurece la seguridad conviene evaluar cookie `httpOnly` + CSRF.
- Un token emitido sigue siendo válido aunque el usuario sea desactivado después (hasta 8 h). Para el MVP se acepta; una mejora es una lista de revocación o un `tokenVersion` en `usuario`.
- El bloqueo se calcula con la hora del servidor y no usa transacción; con intentos concurrentes podría quedar un conteo impreciso. Es aceptable para el alcance actual.
- No hay cambio de contraseña ni recuperación; están fuera del alcance del backlog.
