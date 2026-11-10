# Guía de Demostración - Sprint 2 (HU-06 a HU-20)
## Sistema de Gestión Humana — ARCA Ltda.

Esta guía detalla el **guión de exposición paso a paso** para demostrar todas las Historias de Usuario (HU) del **Sprint 2** directamente desde la interfaz web (Frontend), destacando las reglas de negocio implementadas y el nuevo diseño limpio estilo Apple.

---

## 1. Credenciales de Demostración y Roles

Para la presentación es ideal tener preparadas las credenciales de los diferentes actores del sistema:

| Rol | Correo | Contraseña | Alcance en la Demo |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@arca.bo` | `Admin123!` | HU-06 (Gestión de usuarios y asignación de roles). |
| **RRHH** | `rrhh@arca.bo` | `Rrhh123!` | HU-07 a HU-12, HU-13, HU-14, HU-17 y HU-20 (Operación central). |
| **FUNCIONARIO** | `funcionario@arca.bo` | `Funcionario123!` | HU-10 (Auto-consulta de ficha), HU-13 y HU-14 (Saldo y solicitudes). |
| **DIRECCIÓN** | `direccion@arca.bo` | `Direccion123!` | Dashboard ejecutivo y consulta consolidada. |

> [!TIP]
> **Estrategia de Exposición Recomendada (Storytelling):**  
> En lugar de mostrar pantallas aisladas, presentá la demo siguiendo el **Ciclo de Vida del Empleado**:
> 1. Configuración previa (Usuarios, Áreas y Cargos).
> 2. Ingreso y Padrón (Alta, Búsqueda, Ficha, Ascenso).
> 3. Evaluación de Prueba y Salida (Alerta de vencimiento, Ratificación y Baja).
> 4. Beneficios y Vacaciones (Cálculo de días hábiles, Feriados y Solicitud).
> 5. Contratos y Planillas (Plantillas Handlebars versionadas y Conceptos/Novedades salariales).

---

## 2. Guión Paso a Paso por Historia de Usuario

---

### HU-06: Gestión de Usuarios del Sistema
* **Microservicio:** `ms-auth`
* **Ruta Frontend:** `/usuarios`
* **Actor:** Iniciar sesión como `admin@arca.bo`

#### Qué demostrar en la UI:
1. **Listado y Filtros de Cuentas:**
   - Mostrar la tabla de usuarios con sus correos, roles (`ADMIN`, `RRHH`, `DIRECCION`, `FUNCIONARIO`), estado activo/inactivo y fecha de último acceso.
   - Probar el filtro por rol y el filtro de estado ("Solo activos" / "Inactivos").
2. **Crear Nuevo Usuario (Alta):**
   - Clic en el botón **"Nuevo Usuario"**.
   - Ingresar correo: `nuevo.analista@arca.bo`.
   - Seleccionar rol: `FUNCIONARIO`.
   - **Regla de negocio e integración inter-servicio:** Al elegir `FUNCIONARIO`, la interfaz despliega un selector obligatorio para vincular la cuenta a un funcionario real de `ms-personal`. El backend valida esta relación vía cliente HTTP interno sin acoplar schemas de base de datos.
   - Clic en **"Crear Usuario"**.
   - **Resultado:** Se genera una contraseña temporal criptográficamente segura con hash `bcrypt` (costo 10) y se presenta en pantalla una sola vez con botón para copiar al portapapeles.
3. **Modificación de Rol y Desactivación:**
   - En cualquier usuario, clic en el botón **"Rol"**: cambiar el rol de `FUNCIONARIO` a `RRHH` y guardar.
   - Clic en el botón **"Desactivar"**: la cuenta pasa a estado inactivo (badge neutral).
   - **Regla de auto-protección:** Intentar desactivar al propio usuario `admin@arca.bo`; el botón aparece deshabilitado (*"Un administrador no puede desactivarse a sí mismo"*).

---

### HU-07: Catálogos de Áreas y Cargos
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal/catalogos`
* **Actor:** Iniciar sesión como `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Navegación Segmentada:**
   - Mostrar el control segmentado estilo Apple entre **"Áreas"** y **"Cargos"**.
2. **Gestión de Áreas:**
   - En la pestaña "Áreas", clic en **"Nueva Área"**.
   - Código: `TI`, Nombre: `Tecnología e Innovación`. Clic en Guardar.
   - Mostrar cómo aparece inmediatamente en la tabla con su badge de estado.
3. **Gestión de Cargos con Escala Salarial Estricta:**
   - Cambiar a la pestaña "Cargos" y hacer clic en **"Nuevo Cargo"**.
   - Área: Seleccionar `Tecnología e Innovación`.
   - Nombre del cargo: `Ingeniero de Software Senior`.
   - Salario Mínimo: `8000`.
   - Salario Máximo: `15000`.
   - **Regla de negocio:** La escala salarial (`salario_min <= salario_max`) actúa como restricción (*CHECK constraint*) en base de datos para gobernar las contrataciones de la HU-08.
   - Clic en el botón **"Desactivar"** de un cargo para ver la transición de estado sin borrar el histórico (baja lógica).

---

### HU-08: Alta de Funcionario con Período de Prueba
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Apertura del Modal de Registro:**
   - Clic en el botón principal **"Nuevo Funcionario"**.
2. **Carga de Datos Personales:**
   - CI: `7492015` | Expedido: `LP (La Paz)` (validación de departamentos bolivianos).
   - Nombres: `Mariana` | Apellidos: `Ríos Mercado`
   - Fecha de Nacimiento: `1994-06-12` | Sexo: `Femenino`
   - Correo: `mariana.rios@arca.bo` | Teléfono: `70654321`
   - Dirección: `Av. Ballivián #450, Calacoto`
3. **Asignación Laboral y Validación Salarial en Vivo:**
   - Área: `Tecnología e Innovación`.
   - Cargo: `Ingeniero de Software Senior`.
   - **Validación de banda salarial:** La UI y el backend verifican que la remuneración esté dentro de la escala (`Bs 8.000 – Bs 15.000`). Si se ingresa un monto fuera de rango, el sistema bloquea el registro. Ingresar `9500`.
   - Fecha de Ingreso: Fecha actual.
   - Días de prueba: `90` días de ley laboral.
4. **Resultado:**
   - Al guardar, el funcionario queda registrado en la base de datos con estado **`EN_PRUEBA`** (badge ámbar) y genera su primera asignación laboral con motivo `INGRESO`.

---

### HU-09: Padrón de Funcionarios Paginado y Búsqueda
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal`
* **Actor:** `rrhh@arca.bo` o `direccion@arca.bo`

#### Qué demostrar en la UI:
1. **Búsqueda con Debounce en Servidor:**
   - En la caja de búsqueda, escribir `Ríos` o el CI `7492015`.
   - La búsqueda espera a que el usuario termine de escribir (300 ms de *debounce*) y consulta directamente al backend vía parámetros `?q=...` sin sobrecargar la red.
2. **Filtros Combinados:**
   - Selector de Estado: Filtrar por **"Solo en periodo de prueba"**, **"Solo personal ratificado"** o **"Personal dado de baja"**.
   - Filtros adicionales por catálogo: Área y Cargo.
3. **Paginación Controlada:**
   - Paginación server-side fija de **20 en 20 registros** (`limit=20&offset=...`) con controles de navegación "Anterior" y "Siguiente".

---

### HU-10: Ficha del Funcionario, Historial Laboral y Cambios
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal` -> Botón "Ver Ficha"
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Ficha Integral:**
   - Clic en **"Ver Ficha"** en el funcionario Mariana Ríos.
   - Mostrar datos consolidados: personales, contacto y asignación vigente.
2. **Historial Laboral Inmutable:**
   - Mostrar la tabla de asignaciones: contiene el registro inicial con motivo `INGRESO`, fecha de vigencia, cargo y salario.
   - **Regla de auditoría:** Nunca se hace `UPDATE` destructivo del sueldo anterior; cada cambio crea una nueva fila histórica con su respectiva fecha de vigencia.
3. **Acción "Cambiar asignación":**
   - Clic en **"Cambiar asignación"**.
   - Motivo: `ASCENSO` o `INCREMENTO`.
   - Nueva remuneración: `11000`. Clic en Guardar.
   - **Impacto:** Al volver a la ficha, se visualiza la línea de tiempo completa, preservando cuánto ganaba antes y cuánto gana a partir de la nueva vigencia.
4. **Acción "Editar contacto":**
   - Actualizar teléfono o dirección sin afectar los datos contractuales.

---

### HU-11: Alerta y Ratificación de Período de Prueba
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Aviso Preventivo de Vencimiento:**
   - En la parte superior de `/personal`, mostrar el panel de alerta: *"Atención: X funcionario(s) cumplen su período de prueba en los próximos 7 días"*.
   - El sistema calcula: $\text{fechaFinPrueba} = \text{fechaIngreso} + \text{diasPrueba}$ y alerta si está dentro de la ventana preventiva.
2. **Acción de Ratificar:**
   - Clic en el botón **"Ratificar"**.
   - Se abre el modal confirmando la fecha de evaluación superada.
3. **Consecuencia Legal y de Negocio:**
   - El estado cambia a **`RATIFICADO`** (badge verde).
   - **Efecto multiplicador:** Este cambio desbloquea formalmente la estabilidad laboral y permite que `ms-vacaciones` comience a computar el derecho al goce del saldo vacacional.

---

### HU-12: Registro de Baja de Funcionario
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Desvinculación Formal:**
   - En un funcionario de prueba o demo, clic en el botón **"Baja"**.
2. **Datos de Salida Obligatorios:**
   - Fecha de baja y motivo obligatorio (`Renuncia voluntaria`, `Término de contrato`, etc.).
3. **Bloqueo Inmutable (Terminal State):**
   - El estado pasa a **`BAJA`** (badge rojo).
   - Al abrir su ficha, quedan deshabilitados o removidos los botones de cambio de asignación, edición y ratificación.
   - El empleado queda bloqueado para solicitar vacaciones o recibir nuevas novedades en boletas, preservando su historial íntegro para auditorías e impuestos.

---

### HU-13: Consulta y Cálculo Inteligente de Saldo de Vacaciones
* **Microservicio:** `ms-vacaciones`
* **Ruta Frontend:** `/vacaciones`
* **Actor:** `funcionario@arca.bo` o `rrhh@arca.bo`

#### Qué demostrar en la UI y Reglas de Negocio Exactas:
1. **¿Cómo se calcula la Antigüedad y los Días Ganados?**
   - La antigüedad se mide en **gestiones (años completos cumplidos)** desde la `fechaIngreso` hasta la fecha actual (aniversario laboral):
     $$\text{Días Ganados} = \text{Gestiones Cumplidas} \times 15\text{ días hábiles}$$
   - Según el supuesto de negocio `S-08`, cada año cumplido otorga **15 días hábiles fijos**.
2. **Las 3 Condiciones Obligatorias de Elegibilidad:**
   - **Estar RATIFICADO:** Un empleado `EN_PRUEBA` no puede gozar de vacaciones.
   - **No estar de BAJA.**
   - **Tener al menos 1 gestión completada ($\ge 1\text{ año}$):** Si tiene menos de 365 días en la empresa, el sistema informa: *"Debe cumplir al menos un año desde su fecha de ingreso"*.
3. **Fórmula del Saldo Disponible en Pantalla:**
   $$\text{Días Disponibles} = \text{Días Ganados} - \text{Días Usados (Aprobadas)} - \text{Días Reservados (Pendientes)}$$
4. **Cálculo Exclusivo en Días Hábiles:**
   - El sistema descuenta solo días laborables (lunes a viernes).
   - Se excluyen automáticamente fines de semana y **feriados nacionales bolivianos** cargados en la base de datos de feriados.

---

### HU-14: Solicitud de Vacaciones con Descuento Inteligente
* **Microservicio:** `ms-vacaciones`
* **Ruta Frontend:** `/vacaciones` -> Botón "Solicitar Vacaciones"
* **Actor:** `funcionario@arca.bo` o `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Simulación Dinámica de Días:**
   - Clic en **"Solicitar Vacaciones"**.
   - Elegir rango de fechas (ej. Lunes 16/11/2026 a Viernes 20/11/2026).
   - **Resultado en tiempo real:** La interfaz consulta al backend y calcula: *"Días hábiles calculados: 5 días"*.
   - Si el rango cruza un feriado de ley o un fin de semana, el sistema descuenta únicamente los días hábiles reales.
2. **Control de Saldo Suficiente:**
   - Si el empleado intenta solicitar más días de los disponibles, el sistema bloquea el envío impidiendo saldos negativos.
3. **Envío y Registro:**
   - La solicitud ingresa a la bitácora con estado **`PENDIENTE`** o **`APROBADA`**, actualizando de inmediato los días reservados del saldo.

---

### HU-17: Plantillas Parametrizables de Contrato (Versionadas)
* **Microservicio:** `ms-contratos`
* **Ruta Frontend:** `/contratos`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI y Mejoras de UX Apple:
1. **Catálogo de Plantillas con Segmented Control:**
   - Mostrar pestañas "Plantillas de Contrato" y "Contratos Emitidos".
   - Tipos de contrato: `INDEFINIDO` y `PLAZO_FIJO`, indicando la **Versión Activa** (`v1`).
2. **Editor Espacioso (Modal XL - 960px):**
   - Clic en **"Editar"** en la plantilla de Contrato Indefinido.
   - El modal se abre en formato extra-ancho (`size="xl"`) diseñado para redacción de documentos legales sin sensación de encierro.
3. **Campos Dinámicos con Etiquetas Humanas (Human-Friendly):**
   - En lugar de obligar al usuario a escribir etiquetas técnicas de código como `{{funcionario.fecha_ingreso}}`, el panel presenta botones legibles:
     - **`+ Fecha de Ingreso ★`**
     - **`+ Remuneración (Sueldo) ★`**
     - **`+ Días de Prueba ★`**
     - **`+ Nombre Completo`**
     - **`+ Cédula de Identidad`**
     - **`+ Cargo`**, **`+ Área`**, **`+ Sueldo en Literal`**
   - Al hacer clic en cualquier botón, el sistema inserta la variable Handlebars en la posición exacta del cursor.
4. **Previsualización de Documento y Selector de Vistas:**
   - Clic en **"Vista Previa"**: el backend compila la plantilla con datos de muestra reales.
   - El resultado se renderiza en una **hoja de contrato legal** (fondo blanco, tipografía serif, interlineado cómodo `1.7`).
   - El usuario puede alternar con el control segmentado entre **"Vista Dividida"**, **"Solo Vista Previa"** (ancho completo) y **"Solo Editor"**.
5. **Versionado Inmutable:**
   - Modificar una cláusula y guardar.
   - La plantilla avanza a versión `v2`.
   - Clic en **"Historial"**: muestra todas las versiones anteriores (`v1`, `v2`) demostrando que las versiones previas permanecen inmutables para contratos emitidos en el pasado.

---

### HU-20: Conceptos de Planilla y Novedades del Período
* **Microservicio:** `ms-boletas`
* **Ruta Frontend:** `/boletas`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI y Regla de Negocio Clave:
1. **Diferencia Fundamental: Automáticos vs Novedades:**
   - **Conceptos Automáticos (`automatico: true`):**
     - Son fórmulas fijas de ley (ej: **Aporte Laboral AFP 12.71% sobre Total Ganado**, o el Haber Básico).
     - **Se calculan 100% solos:** El motor de liquidación mensual los aplica a todos los empleados de la empresa sin que RRHH tenga que cargarlos a mano.
     - **Por regla de negocio, NO aparecen en el selector de novedades** para evitar duplicidades o cobros dobles accidentales.
   - **Novedades del Período (`automatico: false`):**
     - Son incidencias **eventuales, variables o extraordinarias** de un mes puntual (ej: bonos por meta, sanciones por atraso, anticipos).
     - Se registran indicando el funcionario destinatario y el **monto monetario puntual en Bolivianos (Bs. > 0)**.
2. **Catálogo de Conceptos:**
   - En la pestaña "Conceptos de Planilla", mostrar los conceptos base: `HABER_BASICO` (`SISTEMA`) y `APORTE_LABORAL` (`PORCENTAJE` 12.71%).
   - Clic en **"Nuevo Concepto"**:
     - Código: `BONO_PRODUCCION`, Nombre: `Bono por Desempeño`, Tipo: `HABER`, Forma: `MONTO_FIJO`, Automático: `NO`. Guardar.
3. **Carga de Novedades del Período:**
   - Cambiar a la pestaña **"Novedades del Período"**.
   - Período: Año `2026`, Mes `10` (Octubre).
   - Clic en **"Registrar Novedad"**:
     - Seleccionar al funcionario y el concepto `BONO_PRODUCCION`.
     - Ingresar el monto en Bolivianos: `Bs 750.00`.
     - Glosa: `Cumplimiento de objetivos del período`. Guardar.
   - Mostrar cómo queda registrado en la tabla listo para alimentar el cálculo de planilla.

---

## 3. Resumen Rápido para la Presentación (Cheat Sheet)

| Orden | Módulo | Historia | Acción Clave en Pantalla |
| :---: | :--- | :--- | :--- |
| **1** | Usuarios | **HU-06** | Crear usuario funcionario con password temporal y mostrar desactivación. |
| **2** | Personal | **HU-07** | Crear Área y Cargo con escala salarial mín/máx. |
| **3** | Personal | **HU-08** | Registrar nuevo funcionario Mariana Ríos con 90 días de prueba. |
| **4** | Personal | **HU-09** | Buscar por CI con debounce y filtrar por estado/área. |
| **5** | Personal | **HU-10** | Ver Ficha, historial laboral y realizar ascenso salarial. |
| **6** | Personal | **HU-11** | Ver alerta de período de prueba por vencer y ejecutar ratificación a verde. |
| **7** | Personal | **HU-12** | Registrar baja con motivo y mostrar bloqueo inmutable. |
| **8** | Vacaciones | **HU-13** | Explicar saldo de 15 días hábiles y exclusión de feriados/findes. |
| **9** | Vacaciones | **HU-14** | Solicitar vacaciones lun-vie demostrando cálculo exacto de días hábiles. |
| **10** | Contratos | **HU-17** | Editar plantilla Handlebars, guardar y mostrar salto de versión v1 a v2. |
| **11** | Boletas | **HU-20** | Crear concepto salarial y registrar novedad de Bs 750 para el período. |

---

## 4. Recomendaciones Finales para Brillar en la Exposición

1. **Destacá la Arquitectura mientras mostrás la pantalla:**
   - Cuando uses `/usuarios`, mencioná que está conectado al schema `auth` a través del Gateway.
   - Cuando uses `/personal`, mencioná que el catálogo y el padrón viven en el schema `personal`.
   - Cuando uses `/vacaciones`, destacá la independencia del microservicio `ms-vacaciones` que consulta internamente la elegibilidad sin acoplar bases de datos.
2. **Resaltá la Experiencia de Usuario (UI Apple):**
   - Hacé énfasis en la limpieza visual: modales con efecto vidrio esmerilado (*frosted glass*), controles segmentados limpios, ausencia de íconos ruidosos en cada botón de tabla y feedback táctil inmediato.
3. **Tené abiertas 2 pestañas del navegador:**
   - Pestaña 1: Logueado como `rrhh@arca.bo` (para hacer el 90% de la demo).
   - Pestaña 2 (en modo incógnito): Logueado como `admin@arca.bo` (para mostrar la HU-06 de usuarios sin tener que desloguearte en medio de la explicación).
