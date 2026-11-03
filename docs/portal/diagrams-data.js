/*
 * Portal de arquitectura ARCA - datos de módulos y diagramas.
 * Los diagramas se escriben en PlantUML y se renderizan con el servidor
 * público de PlantUML, igual que el portal de referencia de COSSMIL.
 */

const diagramMeta = {
  'casos-uso': {
    name: 'Casos de uso',
    icon: 'fa-users',
    description: 'Actores, funcionalidades y relaciones principales del módulo.',
  },
  clases: {
    name: 'Clases',
    icon: 'fa-cubes',
    description: 'Entidades de dominio, servicios y colaboraciones.',
  },
  secuencia: {
    name: 'Secuencia',
    icon: 'fa-exchange-alt',
    description: 'Flujo de mensajes entre frontend, gateway, servicio y base de datos.',
  },
  actividades: {
    name: 'Actividades',
    icon: 'fa-project-diagram',
    description: 'Pasos, decisiones y caminos alternativos de un proceso.',
  },
  procesos: {
    name: 'Procesos (BPMN)',
    icon: 'fa-sitemap',
    description: 'Responsabilidades por carril y secuencia de negocio.',
  },
  er: {
    name: 'Entidad-Relación',
    icon: 'fa-database',
    description: 'Tablas, columnas, claves y relaciones del schema del servicio.',
  },
  despliegue: {
    name: 'Despliegue',
    icon: 'fa-server',
    description: 'Contenedores, conexiones y dependencias de infraestructura.',
  },
};

const modulesData = {
  'ms-auth': {
    name: 'ms-auth',
    subtitle: 'Identidad y acceso',
    icon: 'fa-key',
    sprint: 'Sprint 1',
    status: 'Parcial',
    statusClass: 'partial',
    schema: 'autenticacion',
    port: 3001,
    description:
      'Gestiona el inicio de sesión, la emisión de JWT y la administración de usuarios y roles. Es la fuente de identidad que consume el gateway.',
    responsibilities: [
      'Validar credenciales y emitir JWT de 8 horas.',
      'Aplicar bloqueo temporal después de 5 intentos fallidos.',
      'Exponer la identidad del usuario al gateway.',
      'Administrar usuarios, roles y vinculación con funcionarios (HU-06).',
    ],
    hus: ['HU-05', 'HU-06'],
    endpoints: [
      ['POST', '/api/v1/auth/login', 'Inicio de sesión', 'Implementado'],
      ['GET', '/api/v1/auth/me', 'Sesión actual', 'Implementado'],
      ['POST', '/api/v1/usuarios', 'Alta de usuario', 'Pendiente'],
      ['PATCH', '/api/v1/usuarios/:id/estado', 'Estado de usuario', 'Pendiente'],
      ['PATCH', '/internal/usuarios/:id/estado', 'Estado interno para otros servicios', 'Pendiente'],
    ],
    diagrams: ['casos-uso', 'clases', 'secuencia', 'actividades', 'procesos', 'er', 'despliegue'],
  },

  'ms-personal': {
    name: 'ms-personal',
    subtitle: 'Personal, áreas y cargos',
    icon: 'fa-users',
    sprint: 'Sprint 1',
    status: 'Parcial',
    statusClass: 'partial',
    schema: 'personal',
    port: 3002,
    description:
      'Administra áreas, cargos, funcionarios e historial de asignaciones laborales. Es el servicio dueño del padrón y de las reglas de alta, modificación, ratificación y baja.',
    responsibilities: [
      'Mantener los catálogos de áreas y cargos con banda salarial.',
      'Registrar funcionarios y su primera asignación laboral en una transacción.',
      'Consultar el padrón y la ficha del funcionario.',
      'Conservar el historial de área, cargo y remuneración.',
      'Exponer consultas internas para vacaciones, contratos y boletas.',
    ],
    hus: ['HU-07', 'HU-08', 'HU-09', 'HU-10', 'HU-11', 'HU-12'],
    endpoints: [
      ['GET', '/api/v1/personal/areas', 'Listar áreas activas', 'Implementado'],
      ['POST', '/api/v1/personal/areas', 'Crear área', 'Implementado'],
      ['PATCH', '/api/v1/personal/areas/:id', 'Editar o desactivar área', 'Implementado'],
      ['GET', '/api/v1/personal/cargos', 'Listar cargos activos', 'Implementado'],
      ['POST', '/api/v1/personal/cargos', 'Crear cargo', 'Implementado'],
      ['PATCH', '/api/v1/personal/cargos/:id', 'Editar o desactivar cargo', 'Implementado'],
      ['GET', '/api/v1/funcionarios', 'Consultar padrón', 'Pendiente'],
      ['POST', '/api/v1/funcionarios', 'Registrar funcionario', 'Pendiente'],
      ['PATCH', '/api/v1/funcionarios/:id', 'Modificar asignación o contacto', 'Pendiente'],
      ['PATCH', '/api/v1/funcionarios/:id/ratificar', 'Ratificar funcionario', 'Pendiente'],
      ['PATCH', '/api/v1/funcionarios/:id/baja', 'Dar de baja', 'Pendiente'],
      ['GET', '/internal/funcionarios/:id', 'Consulta interna de ficha', 'Pendiente'],
      ['GET', '/internal/funcionarios', 'Funcionarios activos por periodo', 'Pendiente'],
    ],
    diagrams: ['casos-uso', 'clases', 'secuencia', 'actividades', 'procesos', 'er', 'despliegue'],
  },

  'ms-vacaciones': {
    name: 'ms-vacaciones',
    subtitle: 'Saldos y solicitudes',
    icon: 'fa-calendar-alt',
    sprint: 'Sprint 2',
    status: 'Planificado',
    statusClass: 'pending',
    schema: 'vacaciones',
    port: 3003,
    description:
      'Calcula la elegibilidad y el saldo de vacaciones, registra solicitudes y administra su aprobación o rechazo. No guarda el saldo: lo calcula a partir de las gestiones y de las solicitudes.',
    responsibilities: [
      'Calcular elegibilidad y saldo con 15 días hábiles por gestión.',
      'Validar solapamientos, saldo disponible y fechas.',
      'Registrar solicitudes y reservar días pendientes.',
      'Aprobar o rechazar solicitudes y liberar reservas.',
      'Mantener el catálogo de feriados de Bolivia.',
    ],
    hus: ['HU-13', 'HU-14', 'HU-15', 'HU-16'],
    endpoints: [
      ['GET', '/api/v1/vacaciones/saldo/:idFuncionario', 'Saldo y elegibilidad', 'Pendiente'],
      ['POST', '/api/v1/vacaciones/solicitudes', 'Solicitar vacaciones', 'Pendiente'],
      ['PATCH', '/api/v1/vacaciones/solicitudes/:id/aprobar', 'Aprobar solicitud', 'Pendiente'],
      ['PATCH', '/api/v1/vacaciones/solicitudes/:id/rechazar', 'Rechazar solicitud', 'Pendiente'],
      ['GET', '/api/v1/vacaciones/historial/:idFuncionario', 'Historial y kardex', 'Pendiente'],
      ['GET', '/api/v1/vacaciones/feriados', 'Catálogo de feriados', 'Pendiente'],
    ],
    diagrams: ['casos-uso', 'clases', 'secuencia', 'actividades', 'procesos', 'er', 'despliegue'],
  },

  'ms-contratos': {
    name: 'ms-contratos',
    subtitle: 'Plantillas y contratos',
    icon: 'fa-file-signature',
    sprint: 'Sprint 3',
    status: 'Planificado',
    statusClass: 'pending',
    schema: 'contratos',
    port: 3004,
    description:
      'Administra plantillas versionadas y genera contratos en PDF a partir de los datos vigentes del funcionario. Conserva el snapshot, el HTML renderizado, el PDF y su hash.',
    responsibilities: [
      'Versionar plantillas y mantener una versión activa por plantilla.',
      'Validar variables obligatorias y desconocidas.',
      'Generar contratos con datos reales de ms-personal.',
      'Convertir HTML a PDF con Gotenberg y calcular SHA-256.',
      'Consultar y descargar contratos con verificación de hash.',
    ],
    hus: ['HU-17', 'HU-18', 'HU-19'],
    endpoints: [
      ['GET', '/api/v1/contratos/plantillas', 'Listar plantillas', 'Pendiente'],
      ['POST', '/api/v1/contratos/plantillas', 'Crear plantilla', 'Pendiente'],
      ['POST', '/api/v1/contratos/plantillas/:id/versiones', 'Versionar plantilla', 'Pendiente'],
      ['POST', '/api/v1/contratos', 'Generar contrato', 'Pendiente'],
      ['GET', '/api/v1/contratos', 'Consultar contratos', 'Pendiente'],
      ['GET', '/api/v1/contratos/:id/pdf', 'Descargar PDF y verificar hash', 'Pendiente'],
    ],
    diagrams: ['casos-uso', 'clases', 'secuencia', 'actividades', 'procesos', 'er', 'despliegue'],
  },

  'ms-boletas': {
    name: 'ms-boletas',
    subtitle: 'Planilla y boletas de pago',
    icon: 'fa-receipt',
    sprint: 'Sprint 3',
    status: 'Planificado',
    statusClass: 'pending',
    schema: 'boletas',
    port: 3005,
    description:
      'Configura conceptos y novedades, calcula la planilla del período, emite boletas inmutables y gestiona rectificaciones con trazabilidad completa.',
    responsibilities: [
      'Configurar haberes, descuentos y novedades.',
      'Calcular la planilla con días trabajados y conceptos aplicables.',
      'Emitir boletas con número correlativo, PDF y hash.',
      'Bloquear la edición de boletas emitidas.',
      'Rectificar boletas con nueva versión y motivo.',
    ],
    hus: ['HU-20', 'HU-21', 'HU-22', 'HU-23'],
    endpoints: [
      ['GET', '/api/v1/boletas/conceptos', 'Listar conceptos', 'Pendiente'],
      ['POST', '/api/v1/boletas/conceptos', 'Crear concepto', 'Pendiente'],
      ['POST', '/api/v1/boletas/novedades', 'Registrar novedad', 'Pendiente'],
      ['POST', '/api/v1/boletas/periodos', 'Abrir período', 'Pendiente'],
      ['POST', '/api/v1/boletas/periodos/:id/calcular', 'Calcular planilla', 'Pendiente'],
      ['POST', '/api/v1/boletas/periodos/:id/emitir', 'Emitir boletas', 'Pendiente'],
      ['POST', '/api/v1/boletas/:id/rectificar', 'Rectificar boleta', 'Pendiente'],
      ['GET', '/api/v1/boletas/:id/pdf', 'Descargar boleta', 'Pendiente'],
    ],
    diagrams: ['casos-uso', 'clases', 'secuencia', 'actividades', 'procesos', 'er', 'despliegue'],
  },
};

const architectureDiagrams = {
  mapa: `@startuml
title ARCA - Mapa de contenedores
actor "Usuario" as U
node "Navegador" {
  artifact "SPA React + Vite" as SPA
}
node "Docker Compose" {
  node "API Gateway\\nNode.js + Express\\n:8080" as GW
  node "ms-auth\\n:3001" as AUTH
  node "ms-personal\\n:3002" as PER
  node "ms-vacaciones\\n:3003" as VAC
  node "ms-contratos\\n:3004" as CON
  node "ms-boletas\\n:3005" as BOL
  node "Gotenberg\\n:3000" as GOT
}
cloud "Supabase" {
  database "PostgreSQL\\n6 schemas" as DB
}
U --> SPA : HTTPS
SPA --> GW : REST/JSON + JWT
GW --> AUTH
GW --> PER
GW --> VAC
GW --> CON
GW --> BOL
PER --> AUTH : interno
AUTH --> PER : interno
VAC --> PER : interno
CON --> PER : interno
BOL --> PER : interno
CON --> GOT : HTML a PDF
BOL --> GOT : HTML a PDF
AUTH --> DB
PER --> DB
VAC --> DB
CON --> DB
BOL --> DB
GW --> DB : auditoria
@enduml`,

  dependencias: `@startuml
title ARCA - Dependencias entre servicios
package "Borde" {
  [Frontend] as FE
  [API Gateway] as GW
}
package "Servicios" {
  [ms-auth] as A
  [ms-personal] as P
  [ms-vacaciones] as V
  [ms-contratos] as C
  [ms-boletas] as B
}
package "Infraestructura" {
  [Gotenberg] as G
  database "PostgreSQL" as DB
}
FE --> GW : REST/JSON
GW --> A
GW --> P
GW --> V
GW --> C
GW --> B
P --> A : PATCH /internal/usuarios/:id/estado
A --> P : GET /internal/funcionarios/:id
V --> P : GET /internal/funcionarios/:id
C --> P : GET /internal/funcionarios/:id
B --> P : GET /internal/funcionarios
C --> G : HTML a PDF
B --> G : HTML a PDF
A --> DB
P --> DB
V --> DB
C --> DB
B --> DB
GW --> DB : auditoria
@enduml`,

  auditoria: `@startuml
title ARCA - Auditoría y trazabilidad (HU-24)
actor "Usuario autenticado" as U
participant "API Gateway" as GW
participant "Servicio destino" as MS
database "auditoria.evento" as DB
U -> GW : POST / PUT / PATCH / DELETE
GW -> MS : proxy + identidad
MS --> GW : respuesta
GW -> GW : construir evento sin body ni tokens
GW -> DB : INSERT asíncrono (fire-and-forget)
GW --> U : respuesta original
note right of DB
  Si falla la auditoría, la operación
  del usuario no se interrumpe.
end note
@enduml`,

  despliegue: `@startuml
title ARCA - Despliegue local y nube
node "Equipo del usuario" {
  [Navegador] as NAV
}
cloud "Docker Compose" {
  [Frontend nginx :3000] as FE
  [API Gateway :8080] as GW
  [ms-auth :3001] as AUTH
  [ms-personal :3002] as PER
  [ms-vacaciones :3003] as VAC
  [ms-contratos :3004] as CON
  [ms-boletas :3005] as BOL
  [Gotenberg :3000] as GOT
}
cloud "Supabase" {
  database "PostgreSQL\\n6 schemas" as DB
}
NAV --> FE : HTTPS
FE --> GW : REST
GW --> AUTH
GW --> PER
GW --> VAC
GW --> CON
GW --> BOL
CON --> GOT
BOL --> GOT
AUTH --> DB
PER --> DB
VAC --> DB
CON --> DB
BOL --> DB
GW --> DB
@enduml`,
};

const diagramsData = {
  'ms-auth': {
    'casos-uso': `@startuml
left to right direction
actor "Usuario" as U
actor "Administrador" as A
actor "Servicio interno" as S
rectangle "ms-auth" {
  usecase "Iniciar sesión" as UC1
  usecase "Consultar sesión" as UC2
  usecase "Crear usuario" as UC3
  usecase "Cambiar rol" as UC4
  usecase "Activar o desactivar usuario" as UC5
  usecase "Cambiar estado interno" as UC6
}
U --> UC1
U --> UC2
A --> UC3
A --> UC4
A --> UC5
S --> UC6
@enduml`,

    clases: `@startuml
title ms-auth - Modelo de clases
class Usuario {
  - id : UUID
  - email : string
  - passwordHash : string
  - rol : RolUsuario
  - funcionarioId : UUID | null
  - activo : boolean
  - intentosFallidos : number
  - bloqueadoHasta : Date | null
  - ultimoAcceso : Date | null
}
enum RolUsuario {
  ADMIN
  RRHH
  DIRECCION
  FUNCIONARIO
}
class AuthService {
  +login(email, password) : LoginResponse
  +me(identidad) : Sesion
}
class UsuarioRepository {
  +findByEmail(email) : Usuario | null
  +findByEmailWithPassword(email) : Usuario | null
  +save(usuario) : Usuario
}
AuthService --> UsuarioRepository
AuthService --> Usuario
Usuario --> RolUsuario
@enduml`,

    secuencia: `@startuml
title ms-auth - Secuencia de login
actor Usuario
participant "Frontend" as FE
participant "API Gateway" as GW
participant "ms-auth" as AUTH
database "PostgreSQL\\nautenticacion" as DB
Usuario -> FE : correo y contraseña
FE -> GW : POST /api/v1/auth/login
GW -> AUTH : POST /auth/login
AUTH -> DB : buscar usuario por email
DB --> AUTH : usuario
AUTH -> AUTH : verificar bloqueo y bcrypt
alt credenciales válidas
  AUTH -> DB : resetear intentos y último acceso
  AUTH --> GW : JWT de 8 horas
  GW --> FE : 200 { token, usuario }
else credenciales inválidas
  AUTH -> DB : incrementar intentos / bloquear
  AUTH --> GW : 401 o 423
  GW --> FE : error común
end
@enduml`,

    actividades: `@startuml
title ms-auth - Actividad de login
start
:Recibir correo y contraseña;
:Buscar usuario por correo;
if (¿Usuario existe y está activo?) then (no)
  :Responder 401 genérico;
  stop
endif
if (¿Cuenta bloqueada?) then (sí)
  :Responder 423 ACCOUNT_LOCKED;
  stop
endif
:Comparar contraseña con bcrypt;
if (¿Contraseña correcta?) then (no)
  :Incrementar intentos fallidos;
  if (¿Llegó a 5 intentos?) then (sí)
    :Bloquear 15 minutos;
  endif
  :Responder 401 genérico;
  stop
endif
:Resetear intentos fallidos;
:Firmar JWT de 8 horas;
:Actualizar último acceso;
:Responder 200 con token;
stop
@enduml`,

    procesos: `@startuml
title ms-auth - Proceso de login
|Usuario|
start
:Ingresar correo y contraseña;
|API Gateway|
:Validar ruta pública;
:Reenviar a ms-auth;
|ms-auth|
:Buscar usuario y verificar estado;
if (¿Credenciales válidas?) then (sí)
  :Generar JWT;
  :Responder 200;
else (no)
  :Registrar intento;
  :Responder 401 o 423;
endif
|Usuario|
:Acceder al portal;
stop
@enduml`,

    er: `@startuml
title ms-auth - ER schema autenticacion
entity "USUARIO" as USUARIO {
  * id : uuid <<PK>>
  --
  * email : varchar(150) <<UK>>
  * password_hash : varchar(100)
  * rol : enum
  * funcionario_id : uuid <<UK, nullable>>
  * activo : boolean
  * intentos_fallidos : smallint
  * bloqueado_hasta : timestamptz
  * ultimo_acceso : timestamptz
  * created_at : timestamptz
  * updated_at : timestamptz
}
note right of USUARIO
  CHECK: un FUNCIONARIO siempre
  tiene funcionario_id.
end note
@enduml`,

    despliegue: `@startuml
title ms-auth - Despliegue
node "Docker Compose" {
  node "gateway :8080" as GW
  node "ms-auth :3001" as AUTH
  node "ms-personal :3002" as PER
}
cloud "Supabase" {
  database "PostgreSQL\\nautenticacion" as DB
}
GW --> AUTH : REST
AUTH --> DB : TypeORM
AUTH --> PER : interno
PER --> AUTH : interno
@enduml`,
  },

  'ms-personal': {
    'casos-uso': `@startuml
left to right direction
actor "RRHH" as RRHH
actor "Dirección" as DIR
actor "Funcionario" as FUN
actor "Servicio interno" as INT
rectangle "ms-personal" {
  usecase "Gestionar áreas" as UC1
  usecase "Gestionar cargos" as UC2
  usecase "Registrar funcionario" as UC3
  usecase "Consultar padrón y ficha" as UC4
  usecase "Modificar área, cargo y remuneración" as UC5
  usecase "Ratificar funcionario" as UC6
  usecase "Dar de baja" as UC7
  usecase "Consultar funcionario interno" as UC8
}
RRHH --> UC1
RRHH --> UC2
RRHH --> UC3
RRHH --> UC5
RRHH --> UC6
RRHH --> UC7
DIR --> UC4
FUN --> UC4
INT --> UC8
@enduml`,

    clases: `@startuml
title ms-personal - Modelo de clases
class Area {
  - id : UUID
  - codigo : string
  - nombre : string
  - activo : boolean
}
class Cargo {
  - id : UUID
  - areaId : UUID
  - nombre : string
  - salarioMin : number
  - salarioMax : number
  - activo : boolean
}
class Funcionario {
  - id : UUID
  - ci : string
  - nombres : string
  - apellidos : string
  - fechaIngreso : date
  - diasPrueba : number
  - estado : EstadoFuncionario
}
class AsignacionLaboral {
  - id : UUID
  - funcionarioId : UUID
  - cargoId : UUID
  - remuneracion : number
  - vigenteDesde : date
  - vigenteHasta : date | null
  - motivo : MotivoAsignacion
}
enum EstadoFuncionario {
  EN_PRUEBA
  RATIFICADO
  BAJA
}
enum MotivoAsignacion {
  INGRESO
  ASCENSO
  TRASLADO
  INCREMENTO
  CORRECCION
}
Area "1" --> "*" Cargo
Cargo "1" --> "*" AsignacionLaboral
Funcionario "1" --> "*" AsignacionLaboral
Funcionario --> EstadoFuncionario
AsignacionLaboral --> MotivoAsignacion
@enduml`,

    secuencia: `@startuml
title ms-personal - Secuencia de alta de funcionario
actor RRHH
participant "API Gateway" as GW
participant "ms-personal" as P
database "PostgreSQL\\npersonal" as DB
RRHH -> GW : POST /api/v1/funcionarios
GW -> P : reenviar + identidad
P -> P : validar CI, edad y banda salarial
P -> DB : BEGIN
P -> DB : insertar funcionario EN_PRUEBA
P -> DB : insertar asignación vigente
P -> DB : COMMIT
P --> GW : 201 ficha del funcionario
GW --> RRHH : ficha
@enduml`,

    actividades: `@startuml
title ms-personal - Actividad de alta de funcionario
start
:Recibir datos personales y laborales;
:Validar CI única;
if (¿CI ya existe?) then (sí)
  :Responder 409;
  stop
endif
:Validar edad mínima a la fecha de ingreso;
:Validar banda salarial del cargo;
if (¿Datos inválidos?) then (sí)
  :Responder 400;
  stop
endif
:BEGIN transacción;
:Crear funcionario EN_PRUEBA;
:Crear asignación vigente;
:COMMIT;
:Responder 201 con la ficha;
stop
@enduml`,

    procesos: `@startuml
title ms-personal - Proceso de alta de funcionario
|RRHH|
start
:Completar datos del funcionario;
|ms-personal|
:Validar unicidad de CI;
:Validar edad y banda salarial;
if (¿Datos válidos?) then (sí)
  :Crear funcionario y asignación;
  :Responder ficha;
else (no)
  :Responder error de validación;
endif
|RRHH|
:Revisar la ficha creada;
stop
@enduml`,

    er: `@startuml
title ms-personal - ER schema personal
entity "AREA" as AREA {
  * id : uuid <<PK>>
  --
  * codigo : varchar(20) <<UK>>
  * nombre : varchar(100) <<UK>>
  * activo : boolean
  * created_at : timestamptz
  * updated_at : timestamptz
}
entity "CARGO" as CARGO {
  * id : uuid <<PK>>
  --
  * area_id : uuid <<FK>>
  * nombre : varchar(100)
  * salario_min : numeric(12,2)
  * salario_max : numeric(12,2)
  * activo : boolean
}
entity "FUNCIONARIO" as FUNC {
  * id : uuid <<PK>>
  --
  * ci : varchar(15) <<UK>>
  * ci_expedido : varchar(2)
  * nombres : varchar(100)
  * apellidos : varchar(100)
  * fecha_nacimiento : date
  * sexo : char(1)
  * fecha_ingreso : date
  * dias_prueba : smallint
  * estado : enum
  * fecha_ratificacion : date
  * fecha_baja : date
  * motivo_baja : enum
}
entity "ASIGNACION_LABORAL" as ASIG {
  * id : uuid <<PK>>
  --
  * funcionario_id : uuid <<FK>>
  * cargo_id : uuid <<FK>>
  * remuneracion : numeric(12,2)
  * vigente_desde : date
  * vigente_hasta : date
  * motivo : enum
  * registrado_por : uuid
}
AREA ||--o{ CARGO : contiene
CARGO ||--o{ ASIG : se asigna
FUNCIONARIO ||--o{ ASIG : historial
note right of ASIG
  Índice único parcial:
  una sola asignación vigente
  por funcionario.
end note
@enduml`,

    despliegue: `@startuml
title ms-personal - Despliegue
node "Docker Compose" {
  node "gateway :8080" as GW
  node "ms-personal :3002" as PER
  node "ms-auth :3001" as AUTH
  node "ms-vacaciones :3003" as VAC
  node "ms-contratos :3004" as CON
  node "ms-boletas :3005" as BOL
}
cloud "Supabase" {
  database "PostgreSQL\\npersonal" as DB
}
GW --> PER : REST
PER --> DB : TypeORM
PER --> AUTH : baja de usuario
AUTH --> PER : validar funcionario
VAC --> PER : consulta interna
CON --> PER : consulta interna
BOL --> PER : consulta interna
@enduml`,
  },

  'ms-vacaciones': {
    'casos-uso': `@startuml
left to right direction
actor "Funcionario" as FUN
actor "RRHH" as RRHH
actor "Dirección" as DIR
rectangle "ms-vacaciones" {
  usecase "Consultar saldo y elegibilidad" as UC1
  usecase "Solicitar vacaciones" as UC2
  usecase "Aprobar solicitud" as UC3
  usecase "Rechazar solicitud" as UC4
  usecase "Consultar historial" as UC5
  usecase "Gestionar feriados" as UC6
  usecase "Ver calendario del personal" as UC7
}
FUN --> UC1
FUN --> UC2
FUN --> UC5
RRHH --> UC1
RRHH --> UC3
RRHH --> UC4
RRHH --> UC5
RRHH --> UC6
DIR --> UC7
@enduml`,

    clases: `@startuml
title ms-vacaciones - Modelo de clases
class Feriado {
  - fecha : date
  - descripcion : string
}
class SolicitudVacacion {
  - id : UUID
  - funcionarioId : UUID
  - funcionarioNombre : string
  - fechaInicio : date
  - fechaFin : date
  - diasHabiles : number
  - estado : EstadoSolicitud
  - motivoRechazo : string | null
}
class SaldoVacaciones {
  - elegible : boolean
  - gestiones : number
  - diasGanados : number
  - diasUsados : number
  - diasReservados : number
  - diasDisponibles : number
}
enum EstadoSolicitud {
  PENDIENTE
  APROBADA
  RECHAZADA
}
class VacacionesService {
  +calcularSaldo(funcionarioId) : SaldoVacaciones
  +solicitar(input) : SolicitudVacacion
  +aprobar(id) : SolicitudVacacion
  +rechazar(id, motivo) : SolicitudVacacion
}
class SolicitudRepository
class FeriadoRepository
class PersonalClient
VacacionesService --> SolicitudRepository
VacacionesService --> FeriadoRepository
VacacionesService --> PersonalClient
VacacionesService --> SaldoVacaciones
SolicitudVacacion --> EstadoSolicitud
@enduml`,

    secuencia: `@startuml
title ms-vacaciones - Secuencia de solicitud
actor Funcionario
participant "Frontend" as FE
participant "API Gateway" as GW
participant "ms-vacaciones" as VAC
participant "ms-personal" as PER
database "PostgreSQL\\nvacaciones" as DB
Funcionario -> FE : rango de fechas
FE -> GW : POST /api/v1/vacaciones/solicitudes
GW -> VAC : reenviar + identidad
VAC -> PER : GET /internal/funcionarios/:id
PER --> VAC : ficha y fecha de ingreso
VAC -> DB : consultar solicitudes y feriados
VAC -> VAC : validar elegibilidad, saldo y solapamiento
alt solicitud válida
  VAC -> DB : guardar PENDIENTE
  VAC --> GW : 201 solicitud
  GW --> FE : solicitud registrada
else inválida
  VAC --> GW : 400 o 409
  GW --> FE : error común
end
@enduml`,

    actividades: `@startuml
title ms-vacaciones - Actividad de solicitud
start
:Recibir funcionario y rango de fechas;
:Consultar ficha y fecha de ingreso;
:Calcular elegibilidad y saldo;
if (¿Es elegible?) then (no)
  :Responder motivo de no elegibilidad;
  stop
endif
:Contar días hábiles del rango;
if (¿Supera el saldo disponible?) then (sí)
  :Responder saldo insuficiente;
  stop
endif
if (¿Se cruza con otra solicitud?) then (sí)
  :Responder solapamiento;
  stop
endif
:Guardar solicitud PENDIENTE;
:Reservar días;
:Responder 201;
stop
@enduml`,

    procesos: `@startuml
title ms-vacaciones - Proceso de solicitud y aprobación
|Funcionario|
start
:Solicitar vacaciones;
|ms-vacaciones|
:Validar elegibilidad, saldo y fechas;
if (¿Solicitud válida?) then (sí)
  :Guardar PENDIENTE;
  :Reservar días;
else (no)
  :Responder error;
  stop
endif
|RRHH|
:Revisar bandeja de solicitudes;
if (¿Aprueba?) then (sí)
  :Aprobar y convertir reserva en uso;
else (no)
  :Rechazar con motivo;
  :Liberar reserva;
endif
|Funcionario|
:Consultar resultado;
stop
@enduml`,

    er: `@startuml
title ms-vacaciones - ER schema vacaciones
entity "FERIADO" as FER {
  * fecha : date <<PK>>
  --
  * descripcion : varchar(100)
}
entity "SOLICITUD_VACACION" as SOL {
  * id : uuid <<PK>>
  --
  * funcionario_id : uuid
  * funcionario_nombre : varchar(200)
  * fecha_inicio : date
  * fecha_fin : date
  * dias_habiles : smallint
  * estado : enum
  * motivo_rechazo : varchar(300)
  * registrado_por : uuid
  * resuelto_por : uuid
  * fecha_resolucion : timestamptz
  * created_at : timestamptz
  * updated_at : timestamptz
}
note right of SOL
  No existe tabla de saldo:
  se calcula en cada consulta.
end note
@enduml`,

    despliegue: `@startuml
title ms-vacaciones - Despliegue
node "Docker Compose" {
  node "gateway :8080" as GW
  node "ms-vacaciones :3003" as VAC
  node "ms-personal :3002" as PER
}
cloud "Supabase" {
  database "PostgreSQL\\nvacaciones" as DB
}
GW --> VAC : REST
VAC --> DB : TypeORM
VAC --> PER : consulta interna
@enduml`,
  },

  'ms-contratos': {
    'casos-uso': `@startuml
left to right direction
actor "RRHH" as RRHH
actor "Funcionario" as FUN
rectangle "ms-contratos" {
  usecase "Gestionar plantillas" as UC1
  usecase "Versionar plantilla" as UC2
  usecase "Generar contrato" as UC3
  usecase "Consultar contratos" as UC4
  usecase "Descargar contrato" as UC5
  usecase "Verificar hash del PDF" as UC6
}
RRHH --> UC1
RRHH --> UC2
RRHH --> UC3
RRHH --> UC4
FUN --> UC4
FUN --> UC5
RRHH --> UC5
UC5 ..> UC6 : include
@enduml`,

    clases: `@startuml
title ms-contratos - Modelo de clases
class Plantilla {
  - id : UUID
  - codigo : string
  - nombre : string
  - tipo : TipoContrato
  - activo : boolean
}
class PlantillaVersion {
  - id : UUID
  - plantillaId : UUID
  - version : number
  - contenido : string
  - variables : json
  - activa : boolean
}
class Contrato {
  - id : UUID
  - numero : string
  - funcionarioId : UUID
  - plantillaVersionId : UUID
  - version : number
  - estado : EstadoContrato
  - datos : json
  - hashSha256 : string
}
class ContratoPdf {
  - contratoId : UUID
  - contenido : bytea
  - tamanoBytes : number
}
class Correlativo {
  - tipo : string
  - anio : number
  - ultimo : number
}
enum TipoContrato {
  INDEFINIDO
  PLAZO_FIJO
}
enum EstadoContrato {
  VIGENTE
  REEMPLAZADO
}
Plantilla "1" --> "*" PlantillaVersion
PlantillaVersion "1" --> "*" Contrato
Contrato "1" --> "1" ContratoPdf
@enduml`,

    secuencia: `@startuml
title ms-contratos - Secuencia de generación
actor RRHH
participant "API Gateway" as GW
participant "ms-contratos" as CON
participant "ms-personal" as PER
participant "Gotenberg" as GOT
database "PostgreSQL\\ncontratos" as DB
RRHH -> GW : POST /api/v1/contratos
GW -> CON : reenviar + identidad
CON -> PER : GET /internal/funcionarios/:id
PER --> CON : ficha y asignación vigente
CON -> DB : leer plantilla activa y correlativo
CON -> CON : renderizar HTML y snapshot
CON -> GOT : POST /forms/chromium/convert/html
GOT --> CON : PDF
CON -> CON : calcular SHA-256
CON -> DB : guardar contrato, PDF y hash
CON --> GW : 201 contrato
GW --> RRHH : contrato generado
@enduml`,

    actividades: `@startuml
title ms-contratos - Actividad de generación
start
:Seleccionar funcionario y plantilla activa;
:Obtener datos de ms-personal;
if (¿Funcionario de baja?) then (sí)
  :Rechazar generación;
  stop
endif
:Renderizar HTML con variables;
:Convertir HTML a PDF con Gotenberg;
:Calcular hash SHA-256;
:BEGIN transacción;
:Asignar número correlativo;
:Guardar contrato y PDF;
:Marcar contrato anterior como REEMPLAZADO;
:COMMIT;
:Responder contrato generado;
stop
@enduml`,

    procesos: `@startuml
title ms-contratos - Proceso de contrato
|RRHH|
start
:Elegir funcionario y plantilla;
|ms-contratos|
:Consultar datos del funcionario;
:Renderizar contrato;
|Gotenberg|
:Convertir HTML a PDF;
|ms-contratos|
:Calcular hash y guardar;
if (¿Ya existía contrato?) then (sí)
  :Marcar anterior como REEMPLAZADO;
endif
:Responder contrato;
|Funcionario|
:Consultar o descargar contrato;
stop
@enduml`,

    er: `@startuml
title ms-contratos - ER schema contratos
entity "PLANTILLA" as PLA {
  * id : uuid <<PK>>
  --
  * codigo : varchar(30) <<UK>>
  * nombre : varchar(150)
  * tipo : enum
  * activo : boolean
}
entity "PLANTILLA_VERSION" as VER {
  * id : uuid <<PK>>
  --
  * plantilla_id : uuid <<FK>>
  * version : int
  * contenido : text
  * variables : jsonb
  * activa : boolean
  * creado_por : uuid
}
entity "CONTRATO" as CON {
  * id : uuid <<PK>>
  --
  * numero : varchar(20) <<UK>>
  * funcionario_id : uuid
  * plantilla_version_id : uuid <<FK>>
  * version : int
  * estado : enum
  * datos : jsonb
  * hash_sha256 : char(64)
}
entity "CONTRATO_PDF" as PDF {
  * contrato_id : uuid <<PK, FK>>
  --
  * contenido : bytea
  * tamano_bytes : int
}
entity "CORRELATIVO" as COR {
  * tipo : varchar(10) <<PK>>
  * anio : smallint <<PK>>
  --
  * ultimo : int
}
PLA ||--o{ VER : versiona
VER ||--o{ CON : se usa en
CON ||--|| PDF : archivo
@enduml`,

    despliegue: `@startuml
title ms-contratos - Despliegue
node "Docker Compose" {
  node "gateway :8080" as GW
  node "ms-contratos :3004" as CON
  node "ms-personal :3002" as PER
  node "Gotenberg :3000" as GOT
}
cloud "Supabase" {
  database "PostgreSQL\\ncontratos" as DB
}
GW --> CON : REST
CON --> DB : TypeORM
CON --> PER : consulta interna
CON --> GOT : HTTP multipart
@enduml`,
  },

  'ms-boletas': {
    'casos-uso': `@startuml
left to right direction
actor "RRHH" as RRHH
actor "Funcionario" as FUN
rectangle "ms-boletas" {
  usecase "Configurar conceptos" as UC1
  usecase "Registrar novedades" as UC2
  usecase "Calcular planilla" as UC3
  usecase "Emitir boletas" as UC4
  usecase "Rectificar boleta" as UC5
  usecase "Consultar boletas" as UC6
  usecase "Descargar boleta" as UC7
}
RRHH --> UC1
RRHH --> UC2
RRHH --> UC3
RRHH --> UC4
RRHH --> UC5
RRHH --> UC6
FUN --> UC6
FUN --> UC7
RRHH --> UC7
@enduml`,

    clases: `@startuml
title ms-boletas - Modelo de clases
class Concepto {
  - id : UUID
  - codigo : string
  - nombre : string
  - tipo : TipoConcepto
  - formaCalculo : FormaCalculo
  - valor : number | null
  - automatico : boolean
  - esSistema : boolean
  - orden : number
}
class Periodo {
  - id : UUID
  - anio : number
  - mes : number
  - estado : EstadoPeriodo
}
class Novedad {
  - id : UUID
  - anio : number
  - mes : number
  - funcionarioId : UUID
  - conceptoId : UUID
  - monto : number
}
class Boleta {
  - id : UUID
  - periodoId : UUID
  - funcionarioId : UUID
  - numero : string | null
  - version : number
  - estado : EstadoBoleta
  - totalGanado : number
  - totalDescuentos : number
  - liquidoPagable : number
  - tieneAlerta : boolean
  - hashSha256 : string | null
}
class BoletaDetalle {
  - id : UUID
  - boletaId : UUID
  - conceptoId : UUID
  - conceptoNombre : string
  - monto : number
}
class BoletaPdf {
  - boletaId : UUID
  - contenido : bytea
  - tamanoBytes : number
}
class PlanillaCalculator {
  +calcular(funcionarios, conceptos, novedades) : Boleta[]
}
enum TipoConcepto {
  HABER
  DESCUENTO
}
enum FormaCalculo {
  SISTEMA
  MONTO_FIJO
  PORCENTAJE
}
enum EstadoPeriodo {
  BORRADOR
  EMITIDO
}
enum EstadoBoleta {
  BORRADOR
  EMITIDA
  RECTIFICADA
}
Periodo "1" --> "*" Boleta
Boleta "1" --> "*" BoletaDetalle
Boleta "1" --> "0..1" BoletaPdf
Concepto "1" --> "*" Novedad
Concepto "1" --> "*" BoletaDetalle
@enduml`,

    secuencia: `@startuml
title ms-boletas - Secuencia de cálculo y emisión
actor RRHH
participant "API Gateway" as GW
participant "ms-boletas" as BOL
participant "ms-personal" as PER
participant "Gotenberg" as GOT
database "PostgreSQL\\nboletas" as DB
RRHH -> GW : POST /api/v1/boletas/periodos/:id/calcular
GW -> BOL : reenviar + identidad
BOL -> PER : GET /internal/funcionarios?activos
PER --> BOL : funcionarios del periodo
BOL -> DB : conceptos y novedades
BOL -> BOL : PlanillaCalculator
BOL -> DB : guardar boletas BORRADOR y detalles
BOL --> GW : planilla calculada
RRHH -> GW : POST /api/v1/boletas/periodos/:id/emitir
GW -> BOL : reenviar
BOL -> GOT : PDF por boleta
GOT --> BOL : PDF
BOL -> BOL : SHA-256 y número correlativo
BOL -> DB : estado EMITIDA + PDF + hash
BOL --> GW : boletas emitidas
@enduml`,

    actividades: `@startuml
title ms-boletas - Actividad de cálculo de planilla
start
:Abrir período mensual;
:Obtener funcionarios activos del período;
:Leer conceptos automáticos y novedades;
while (¿Quedan funcionarios del período?) is (sí)
  :Tomar el siguiente funcionario;
  :Calcular días trabajados;
  :Calcular haber básico y conceptos;
  :Calcular descuentos;
  :Calcular líquido pagable;
  if (¿Líquido negativo?) then (sí)
    :Marcar boleta con alerta;
  endif
  :Guardar boleta BORRADOR y detalle;
endwhile (no)
:Mostrar totales y alertas;
stop
@enduml`,

    procesos: `@startuml
title ms-boletas - Proceso de planilla
|RRHH|
start
:Configurar conceptos y novedades;
:Abrir período;
|ms-boletas|
:Obtener funcionarios activos;
:Calcular planilla;
if (¿Hay alertas?) then (sí)
  :Mostrar boletas con alerta;
else (no)
  :Permitir emisión;
endif
|RRHH|
:Emitir período;
|ms-boletas|
:Generar PDF y hash por boleta;
:Bloquear boletas emitidas;
|Funcionario|
:Consultar y descargar boleta;
stop
@enduml`,

    er: `@startuml
title ms-boletas - ER schema boletas
entity "CONCEPTO" as CON {
  * id : uuid <<PK>>
  --
  * codigo : varchar(20) <<UK>>
  * nombre : varchar(100)
  * tipo : enum
  * forma_calculo : enum
  * valor : numeric(12,4)
  * automatico : boolean
  * es_sistema : boolean
  * orden : smallint
  * activo : boolean
}
entity "PERIODO" as PER {
  * id : uuid <<PK>>
  --
  * anio : smallint
  * mes : smallint
  * estado : enum
}
entity "NOVEDAD" as NOV {
  * id : uuid <<PK>>
  --
  * anio : smallint
  * mes : smallint
  * funcionario_id : uuid
  * concepto_id : uuid <<FK>>
  * monto : numeric(12,2)
}
entity "BOLETA" as BOL {
  * id : uuid <<PK>>
  --
  * periodo_id : uuid <<FK>>
  * funcionario_id : uuid
  * numero : varchar(20)
  * version : smallint
  * estado : enum
  * boleta_original_id : uuid <<FK>>
  * datos_funcionario : jsonb
  * dias_trabajados : smallint
  * total_ganado : numeric(12,2)
  * total_descuentos : numeric(12,2)
  * liquido_pagable : numeric(12,2)
  * tiene_alerta : boolean
  * hash_sha256 : char(64)
}
entity "BOLETA_DETALLE" as DET {
  * id : uuid <<PK>>
  --
  * boleta_id : uuid <<FK>>
  * concepto_id : uuid <<FK>>
  * concepto_nombre : varchar(100)
  * monto : numeric(12,2)
}
entity "BOLETA_PDF" as PDF {
  * boleta_id : uuid <<PK, FK>>
  --
  * contenido : bytea
  * tamano_bytes : int
}
PER ||--o{ BOL : contiene
BOL ||--|{ DET : lineas
BOL ||--o| PDF : archivo
CON ||--o{ NOV : aplica
CON ||--o{ DET : se usa en
BOL |o--o| BOL : rectifica
@enduml`,

    despliegue: `@startuml
title ms-boletas - Despliegue
node "Docker Compose" {
  node "gateway :8080" as GW
  node "ms-boletas :3005" as BOL
  node "ms-personal :3002" as PER
  node "Gotenberg :3000" as GOT
}
cloud "Supabase" {
  database "PostgreSQL\\nboletas" as DB
}
GW --> BOL : REST
BOL --> DB : TypeORM
BOL --> PER : consulta interna
BOL --> GOT : HTTP multipart
@enduml`,
  },
};
