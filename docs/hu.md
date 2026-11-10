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
   - **Regla de negocio visible:** Al elegir `FUNCIONARIO`, la interfaz despliega un selector obligatorio para vincular la cuenta a un funcionario real del padrón. Seleccionar a cualquiera disponible.
   - Clic en **"Crear Usuario"**.
   - **Resultado:** Se abre un modal de seguridad mostrando la **contraseña temporal autogenerada** (ej. `k9#mP2$xL1`) con botón para copiar al portapapeles.
3. **Modificación de Rol y Desactivación:**
   - En cualquier usuario, clic en el botón **"Rol"**: cambiar el rol de `FUNCIONARIO` a `RRHH` y guardar.
   - Clic en el botón **"Desactivar"**: la cuenta pasa a estado inactivo (badge gris/neutral).
   - *Protección visible:* Intentar desactivar al propio usuario `admin@arca.bo`; el botón aparece deshabilitado ("Un administrador no puede desactivarse a sí mismo").

---

### HU-07: Catálogos de Áreas y Cargos
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal/catalogos`
* **Actor:** Iniciar sesión como `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Navegación Segmentada:**
   - Mostrar el nuevo control segmentado estilo Apple entre **"Áreas"** y **"Cargos"**.
2. **Gestión de Áreas:**
   - En la pestaña "Áreas", clic en **"Nueva Área"**.
   - Código: `TI`, Nombre: `Tecnología e Innovación`. Clic en Guardar.
   - Mostrar cómo aparece inmediatamente en la tabla con su badge de estado.
3. **Gestión de Cargos con Escala Salarial:**
   - Cambiar a la pestaña "Cargos" y hacer clic en **"Nuevo Cargo"**.
   - Área: Seleccionar `Tecnología e Innovación`.
   - Nombre del cargo: `Ingeniero de Software Senior`.
   - Salario Mínimo: `8000`.
   - Salario Máximo: `15000`.
   - Guardar y mostrar cómo la tabla refleja la escala salarial en formato moneda boliviana (`Bs 8.000,00 – Bs 15.000,00`).
   - Clic en el botón **"Desactivar"** de un cargo para ver la transición de estado sin borrar el histórico.

---

### HU-08: Alta de Funcionario con Período de Prueba
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Apertura del Modal de Registro:**
   - Clic en el botón principal **"Nuevo Funcionario"**.
2. **Carga de Datos Personales:**
   - CI: `7492015` | Expedido: `LP (La Paz)`
   - Nombres: `Mariana` | Apellidos: `Ríos Mercado`
   - Fecha de Nacimiento: `1994-06-12` | Sexo: `Femenino`
   - Correo: `mariana.rios@arca.bo` | Teléfono: `70654321`
   - Dirección: `Av. Ballivián #450, Calacoto`
3. **Asignación Laboral y Validación Salarial en Vivo:**
   - Área: `Tecnología e Innovación`.
   - Cargo: `Ingeniero de Software Senior`.
   - **Validación visual:** La UI indica automáticamente la escala del cargo (`Bs 8.000 – Bs 15.000`). Si intentás colocar `5000`, la interfaz o el backend alertan que está fuera de rango. Colocar `9500`.
   - Fecha de Ingreso: Fecha actual.
   - Días de prueba: `90` (valor establecido por ley laboral).
4. **Resultado:**
   - Al guardar, el funcionario aparece inmediatamente en el padrón con el badge ámbar **`EN_PRUEBA`**.

---

### HU-09: Padrón de Funcionarios Paginado y Búsqueda
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal`
* **Actor:** `rrhh@arca.bo` o `direccion@arca.bo`

#### Qué demostrar en la UI:
1. **Búsqueda con Debounce en Servidor:**
   - En la caja de búsqueda, escribir `Ríos` o el CI `7492015`.
   - Explicar que la búsqueda espera a que el usuario termine de escribir y consulta al backend de forma eficiente.
2. **Filtros Combinados:**
   - Selector de Estado: Cambiar a **"Solo en periodo de prueba"** (muestra a Mariana y en prueba).
   - Cambiar a **"Solo personal ratificado"** o **"Personal dado de baja"**.
   - Filtrar adicionalmente por Área ("Tecnología e Innovación") y Cargo.
3. **Paginación Controlada:**
   - Mostrar el pie de tabla: *"Mostrando 1–20 de N funcionarios"*, con navegación de páginas "Anterior" y "Siguiente".

---

### HU-10: Ficha del Funcionario, Historial Laboral y Cambios
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal` -> Botón "Ver Ficha"
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Ficha Integral:**
   - En el funcionario recién creado (Mariana Ríos), clic en **"Ver Ficha"**.
   - Mostrar la tarjeta superior con datos consolidados, fecha de ingreso, días de prueba y contacto.
2. **Historial Laboral con Vigencia:**
   - En la sección inferior de la ficha, mostrar la tabla de asignaciones: tiene el registro inicial con motivo `INGRESO`, fecha de vigencia, cargo y salario.
3. **Acción "Cambiar asignación":**
   - En el pie del modal, hacer clic en **"Cambiar asignación"**.
   - Motivo: Seleccionar `ASCENSO` o `INCREMENTO`.
   - Ajustar remuneración a `11000`. Clic en Guardar.
   - **Impacto:** Al volver a la ficha, se observa el nuevo registro en el historial laboral, manteniendo la trazabilidad inmutable de cuánto ganaba antes y cuánto gana ahora.
4. **Acción "Editar contacto":**
   - Actualizar teléfono a `71234567` y guardar.

---

### HU-11: Alerta y Ratificación de Período de Prueba
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Aviso Preventivo de Vencimiento:**
   - En la parte superior de `/personal`, mostrar el panel de alerta: *"Atención: X funcionario(s) cumplen su período de prueba en los próximos 7 días"*.
   - Explicar que RRHH no necesita calcular manualmente los 90 días; el sistema le avisa proactivamente.
2. **Acción de Ratificar:**
   - En la fila del funcionario en prueba (ej. Mariana Ríos o Daniela Mendoza), hacer clic en el botón limpio **"Ratificar"**.
   - Se abre el modal confirmando la fecha de evaluación.
   - Confirmar la ratificación.
3. **Resultado:**
   - El estado del funcionario cambia a **`RATIFICADO`** (badge verde).
   - Explicar la consecuencia de negocio: **a partir de este momento, el funcionario consolida estabilidad laboral y se habilita su cómputo formal de derechos (vacaciones)**.

---

### HU-12: Registro de Baja de Funcionario
* **Microservicio:** `ms-personal`
* **Ruta Frontend:** `/personal`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Desvinculación Formal:**
   - En un funcionario de prueba o de demostración, hacer clic en el botón **"Baja"** (o desde dentro de su ficha).
2. **Datos de Salida Obligatorios:**
   - Fecha de baja: Fecha actual.
   - Motivo de baja: Seleccionar o escribir `Renuncia voluntaria` o `Término de contrato`.
   - Clic en **"Confirmar Baja"**.
3. **Bloqueo Inmutable:**
   - El funcionario ahora aparece con badge rojo **`BAJA`**.
   - Abrir su ficha: los botones de "Cambiar asignación", "Editar contacto" y "Ratificar" desaparecen o quedan bloqueados.
   - Explicar al evaluador: el sistema garantiza que un empleado cesado no sufra alteraciones post-mortem en sus condiciones laborales.

---

### HU-13: Consulta y Cálculo de Saldo de Vacaciones
* **Microservicio:** `ms-vacaciones`
* **Ruta Frontend:** `/vacaciones`
* **Actor:** Entrar como `funcionario@arca.bo` (o como `rrhh@arca.bo` seleccionando al funcionario)

#### Qué demostrar en la UI:
1. **Tarjeta de Saldo en Días Hábiles:**
   - Mostrar la tarjeta superior del dashboard: **Saldo disponible** (ej. `15 días hábiles`).
   - Mostrar la barra de progreso hacia la siguiente gestión completada.
2. **Regla de Negocio Explicada al Jurado:**
   - El saldo se computa **exclusivamente en días hábiles** (lunes a viernes).
   - No se descuentan fines de semana ni feriados nacionales bolivianos (cargados en la tabla de feriados del sistema).
   - Solo los funcionarios con estado `RATIFICADO` tienen derecho al goce del saldo.

---

### HU-14: Solicitud de Vacaciones con Descuento Inteligente
* **Microservicio:** `ms-vacaciones`
* **Ruta Frontend:** `/vacaciones` -> Botón "Solicitar Vacaciones"
* **Actor:** `funcionario@arca.bo` o `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Simulación en Tiempo Real:**
   - Clic en **"Solicitar Vacaciones"**.
   - Fecha de inicio: Seleccionar un **Lunes** (ej. `16/11/2026`).
   - Fecha de fin: Seleccionar el **Viernes** de esa misma semana (ej. `20/11/2026`).
   - **Resultado en pantalla:** El sistema calcula automáticamente: *"Días hábiles calculados: 5 días"*.
2. **Comprobación de Feriado / Fin de Semana:**
   - Si seleccionás de un viernes a un lunes (4 días calendario), el sistema indicará únicamente 2 días hábiles.
3. **Envío y Tabla de Solicitudes:**
   - Clic en **"Enviar Solicitud"**.
   - La solicitud se agrega de inmediato a la tabla inferior en estado **`PENDIENTE`** o **`APROBADA`**, descontando o reservando los días del saldo.

---

### HU-17: Plantillas Parametrizables de Contrato (Versionadas)
* **Microservicio:** `ms-contratos`
* **Ruta Frontend:** `/contratos`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Catálogo de Plantillas con Segmented Control:**
   - Mostrar la pestaña "Plantillas de Contrato" con el control segmentado estilo Apple.
   - Observar los tipos disponibles (`INDEFINIDO`, `PLAZO_FIJO`) y el indicador de **Versión Activa** (`v1`).
2. **Editor con Variables Handlebars:**
   - Clic en el botón **"Editar"** de la plantilla de Contrato Indefinido.
   - Mostrar el área de texto donde se parametriza el documento utilizando sintaxis de plantilla:
     - `{{funcionario.nombres}}`
     - `{{funcionario.ci}}`
     - `{{asignacion.remuneracion}}`
     - `{{funcionario.dias_prueba}}`
3. **Versionado Inmutable:**
   - Agregar una cláusula o modificar una frase en el texto (ej. *"Lugar de trabajo: Ciudad de La Paz"*).
   - Clic en **"Guardar Nueva Versión"**.
   - **Efecto clave:** La versión activa se incrementa a `v2`.
   - Clic en el botón **"Historial"**: se despliega el historial completo demostrando que la versión `v1` anterior NO se destruyó ni sobreescribió, cumpliendo con la inmutabilidad documental.

---

### HU-20: Conceptos de Planilla y Novedades del Período
* **Microservicio:** `ms-boletas`
* **Ruta Frontend:** `/boletas`
* **Actor:** `rrhh@arca.bo`

#### Qué demostrar en la UI:
1. **Catálogo de Conceptos Paramétricos:**
   - En la pestaña **"Conceptos de Planilla"**, mostrar la tabla de fórmulas salariales:
     - `HABER_BASICO` (Haber, cálculo automático por sistema).
     - `APORTE_LABORAL` (Descuento, 12.71% sobre Total Ganado).
   - Clic en **"Nuevo Concepto"**:
     - Código: `BONO_PRODUCCION`
     - Nombre: `Bono por Desempeño y Producción`
     - Tipo: `HABER`
     - Forma de cálculo: `MONTO_FIJO`
     - Automático: Desmarcado (es un concepto variable aplicable por novedad).
     - Guardar.
2. **Carga de Novedades del Período:**
   - Cambiar a la pestaña **"Novedades del Período"**.
   - Filtrar período: Año `2026`, Mes `10` (Octubre).
   - Clic en **"Registrar Novedad"**:
     - Seleccionar al funcionario (ej. Carlos Mamani o Mariana Ríos).
     - Concepto: `BONO_PRODUCCION`.
     - Monto en Bs: `750.00`.
     - Descripción: `Cumplimiento de objetivos del Sprint 2`.
     - Clic en Guardar.
3. **Resultado:**
   - La novedad aparece listada en la tabla con su monto destacado en verde/teal.
   - Explicar al jurado: **esta novedad queda lista para alimentar el motor de cálculo de liquidación y emisión de boletas**.

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
