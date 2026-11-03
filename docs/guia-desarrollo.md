# Guía de desarrollo — ARCA Backend

Esta guía permite agregar funcionalidades sin romper las capas, los contratos internos ni el aislamiento de datos.

## 1. Crear un endpoint

El flujo obligatorio es **route → controller → service → repository**. Los ejemplos siguientes son una referencia para una nueva HU; no agregan endpoints de negocio automáticamente.

| Capa | Responsabilidad |
|---|---|
| Route | Método, URL, validación y middleware. |
| Controller | Traducir HTTP, invocar el service y responder. |
| Service | Reglas de negocio y coordinación de repositories o clientes HTTP. |
| Repository | Consultas y transacciones mediante TypeORM sobre el schema propio. |

### Ejemplo público: consultar un funcionario

En `ms-personal`, reutiliza `FuncionarioRepository.findById`; el repositorio ya existe. Este es un extracto del patrón, no un reemplazo del archivo completo:

```ts
import { AppDataSource } from '../data-source';
import { Funcionario } from '../entities/funcionario.entity';

export class FuncionarioRepository {
  private readonly repo = AppDataSource.getRepository(Funcionario);
  findById(id: string) { return this.repo.findOneBy({ id }); }
  // Conservar los otros métodos existentes.
}
```

El service se ubica en `src/services/funcionario.service.ts`:

```ts
import { AppError } from '@arca/shared';
import { FuncionarioRepository } from '../repositories/funcionario.repository';

export class FuncionarioService {
  constructor(private readonly repo = new FuncionarioRepository()) {}
  async obtener(id: string) {
    const funcionario = await this.repo.findById(id);
    if (!funcionario) throw new AppError('NOT_FOUND', 'Funcionario no encontrado');
    return {
      id: funcionario.id, nombres: funcionario.nombres,
      apellidos: funcionario.apellidos, ci: funcionario.ci,
    };
  }
}
```

Define un DTO explícito. Agrega las reglas de autorización y negocio exigidas por la HU; no devuelvas entidades completas sin revisar campos sensibles.

El controller se ubica en `src/controllers/funcionario.controller.ts`:

```ts
import type { RequestHandler } from 'express';
import { FuncionarioService } from '../services/funcionario.service';

const service = new FuncionarioService();
export const obtenerFuncionario: RequestHandler = async (req, res, next) => {
  try { res.status(200).json(await service.obtener(req.params.id)); }
  catch (error) { next(error); }
};
```

Express 4 requiere entregar a `next(error)` los errores de handlers asíncronos.

En `src/routes/funcionario.routes.ts`, valida antes de llamar al controller:

```ts
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '@arca/shared';
import { obtenerFuncionario } from '../controllers/funcionario.controller';

const params = z.object({ id: z.string().uuid() });
export const funcionarioRoutes = Router();
funcionarioRoutes.get('/:id', (req, _res, next) => {
  const result = params.safeParse(req.params);
  if (!result.success) {
    next(new AppError('VALIDATION_ERROR', 'Parametros invalidos', {
      validation: result.error.flatten(),
    }));
    return;
  }
  next();
}, obtenerFuncionario);
```

Para un módulo mayor, mueve los schemas Zod a `src/schemas/`. Registra el router en `createApp`, **antes del handler 404 y del errorHandler**:

```ts
import { funcionarioRoutes } from './routes/funcionario.routes';
// Dentro de createApp, después del parser JSON:
app.use('/funcionarios', funcionarioRoutes);
```

El cliente público utiliza `/api/v1/personal/funcionarios/:id`; el servicio recibe `/funcionarios/:id`. El DataSource debe estar inicializado para consultar; la comprobación `/health` inicializa y verifica la conexión en la plantilla.

## 2. AppError y manejo de errores

```ts
import { AppError, errorHandler } from '@arca/shared';

throw new AppError('CONFLICT', 'Ya existe una asignacion vigente', { funcionarioId });
// En app.ts, una sola vez y después de las rutas:
app.use(errorHandler);
```

El formato común es `{ code, message, details }`; `details` vale `null` si no se proporciona. No incluyas secretos ni mensajes internos de PostgreSQL en respuestas.

| Código | HTTP |
|---|---:|
| VALIDATION_ERROR | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT | 409 |
| SERVICE_UNAVAILABLE | 503 |
| INTERNAL_ERROR | 500 |

El service lanza el error de negocio; el controller lo entrega a `next`; el middleware común responde. No repitas el formato manualmente en cada controller.

## 3. Logger

```ts
import { createLogger } from '@arca/shared';
const logger = createLogger('ms-personal');
logger.info('funcionario.consultado', { funcionarioId });
logger.warn('dependencia.no_disponible', { service: 'ms-auth' });
logger.error('operacion.fallida', { operation: 'registrar-funcionario' });
```

El logger emite JSON y redacta campos sensibles reconocidos. Usa nombres de evento y contexto estructurado. No registres cuerpos completos, contraseñas, tokens, cadenas de conexión ni información personal innecesaria.

## 4. Peticiones entre microservicios

Encapsula las llamadas en `src/clients/`. Este ejemplo puede utilizarse desde Vacaciones, Contratos o Boletas:

```ts
import { HttpClient } from '@arca/shared';

interface FuncionarioInterno {
  id: string;
  estado: 'EN_PRUEBA' | 'RATIFICADO' | 'BAJA';
}

export class PersonalClient {
  private readonly http: HttpClient;
  constructor() {
    const baseUrl = process.env.PERSONAL_SERVICE_URL;
    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!baseUrl || !internalApiKey) throw new Error('Configuracion interna incompleta');
    this.http = new HttpClient({ baseUrl, internalApiKey });
  }
  obtenerFuncionario(id: string) {
    return this.http.request<FuncionarioInterno>(
      `/internal/funcionarios/${encodeURIComponent(id)}`,
    );
  }
}
```

El service invoca `PersonalClient`, no consulta la BD ajena. Respeta el contrato completo de `docs/api/internal-contracts.openapi.yaml`. El genérico TypeScript no valida JSON en ejecución; utiliza Zod si necesitas comprobar la respuesta recibida.

El cliente agrega `X-Internal-Key`, tiene timeout predeterminado de tres segundos por intento y como máximo un reintento ante fallos transitorios. Dos intentos agotados pueden tardar aproximadamente seis segundos, más procesamiento. La indisponibilidad termina en `AppError` 503.

No sigue redirects ni permite enviar la clave a otro origen. Los errores HTTP compatibles con el contrato conservan su código; no se reflejan mensajes remotos arbitrarios.

Para una escritura, el mismo cliente admite opciones:

```ts
await http.request(`/internal/usuarios/${encodeURIComponent(usuarioId)}/estado`, {
  method: 'PATCH',
  body: { estado: 'INACTIVO', motivo: 'Baja del funcionario' },
});
```

Los reintentos también pueden repetir escrituras. El endpoint receptor debe garantizar idempotencia.

## 5. TypeORM y límites de schemas

| Componente | Schema fijo |
|---|---|
| gateway | auditoria |
| ms-auth | autenticacion |
| ms-personal | personal |
| ms-vacaciones | vacaciones |
| ms-contratos | contratos |
| ms-boletas | boletas |

Cada `src/data-source.ts` fija su schema y su search_path, mantiene `synchronize: false` y configura timeouts de conexión y consulta. No cambies el schema para reutilizar tablas de otro módulo.

**Prohibido:** importar entidades de otro servicio, crear relaciones entre schemas, consultar tablas ajenas por QueryBuilder/SQL o utilizar credenciales administrativas para saltarse el aislamiento.

Guarda referencias ajenas como UUID simples y valida los datos mediante el cliente HTTP correspondiente. Las consultas y transacciones de negocio pertenecen al repository. El SQL de bootstrap y las migraciones son infraestructura; no habilitan SQL crudo en controllers o services.

Las migraciones requieren el administrador que aplicó los permisos predeterminados. Los usuarios de ejecución solo tienen permisos de datos sobre su schema. Nunca soluciones un fallo de permisos dejando una aplicación en ejecución con el superusuario.

Conserva las convenciones: columnas snake_case, propiedades camelCase, fechas de negocio como strings `YYYY-MM-DD`, instantes timestamptz y dinero numeric con `numericTransformer` de shared.

## 6. Protección de rutas internas

El export real se llama `requireInternalKey`; puedes utilizar un alias local:

```ts
import { requireInternalKey as internalKeyMiddleware } from '@arca/shared';

app.use('/internal', internalKeyMiddleware(process.env.INTERNAL_API_KEY ?? ''));
// Registrar después el router interno existente:
app.use('/internal', internalRoutes);
```

La plantilla ya monta esta protección. Agrega endpoints al router interno; no dupliques el middleware en cada ruta. Mantén la protección antes de interpretar el body y antes de resolver endpoints internos.

Una clave ausente o incorrecta produce 401. Una configuración sin clave falla al crear la aplicación. En el gateway, las rutas internas se bloquean con 403 incluso si el cliente conoce la clave.

Los endpoints internos también siguen las capas y validan su entrada. Un DTO público no sustituye automáticamente al DTO del contrato interno. `X-Internal-Key` no reemplaza la autorización de usuarios que corresponda a cada HU.

## 7. Entorno, pruebas y documentación

Configura `.env` a partir de `.env.example`, conserva el frontend hermano y abre Docker Desktop.

```bash
docker compose up -d --build --wait --wait-timeout 180
docker compose ps
bash scripts/smoke-test.sh
npm install
npm run test:infra
npm run test --workspaces
npm run build
```

`test:infra` utiliza TypeORM simulado y servidores HTTP locales; no necesita la BD levantada. La suite completa de repositorios sí necesita una base de pruebas migrada y permisos de limpieza. No la ejecutes contra Supabase compartido.

Gateway y microservicios utilizan Jest + Supertest. Shared conserva node:test por excepción aprobada. Después de cambiar shared, recompílalo con `npm run build --workspace=@arca/shared`; para usar cambios en contenedores, reconstruye las imágenes.

Para cada nueva HU agrega pruebas unitarias de reglas, al menos una prueba Supertest por endpoint y casos de error, autorización y dependencias cuando correspondan. Actualiza OpenAPI y coordina con el equipo cualquier nueva dependencia entre servicios.

`/health` no requiere Zod porque no define payload, query ni params; esta excepción no se extiende a las nuevas operaciones de negocio.

## Referencias

- [README](../README.md).
- [OpenAPI](api/internal-contracts.openapi.yaml).
- [Arquitectura](HU-01_Arquitectura_Contexto_Equipo.md).
- [Modelo de datos](Sprints/1/HU2/data-model.md).
- [Verificación HU-03](Sprints/1/HU3/HU-03-verificacion.md).

## Ejecutar contra Supabase

El backend dispone de docker-compose.supabase.yml para conectar gateway y cinco servicios a la nube. La configuración privada de runtime está en .env.supabase.runtime y no contiene la credencial administrativa. No usar la base compartida para suites que borran datos.

En TypeORM, DB_SSL_CA_FILE activa la verificación TLS con el certificado CA; DATABASE_URL no debe incluir sslmode al usar esa variable. DB_POOL_MAX admite valores de 1 a 5. Cada aplicación conserva su schema fijo y su rol arca_*; las migraciones de nube se ejecutan como administrador separado mediante scripts/migrate-supabase.cjs.

Consultar el [README](../README.md#ejecutar-el-backend-con-supabase) para el arranque. Con los contenedores levantados, node scripts/verify-cloud-health.cjs comprueba los seis /health y las identidades/TLS reales; bash scripts/smoke-test.sh comprueba el gateway desde el host.
