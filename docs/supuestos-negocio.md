# Supuestos de negocio – Gestión Humana ARCA (HU-01 / CA-06)

Tabla de supuestos. **Decisión del equipo (30/10/2026): se trabaja con la propuesta por defecto** de cada fila; no se espera respuesta del ingeniero para avanzar. Cuando responda, completar las columnas *Respuesta* y *Fecha* y avisar al equipo si cambia algo.

**Estado:** ☑ Propuestas por defecto adoptadas (30/10/2026)  ☐ Revisadas por el ingeniero (opcional)

| ID | Módulo | Pregunta / supuesto | Propuesta por defecto | Impacto si cambia | Respuesta | Fecha |
|----|--------|---------------------|-----------------------|-------------------|-----------|-------|
| S-01 | General | ¿El sistema debe integrarse con el Sistema Core (por ejemplo, para áreas y cargos) o es independiente en el MVP? | Independiente; áreas y cargos se mantienen en el schema `personal` | Contrato extra con Core; ms-personal | | |
| S-02 | General | ¿Qué roles existen y qué puede hacer cada uno (RRHH, Dirección, Funcionario, Admin)? | RRHH: gestiona todo. Dirección: solo lectura/consolidados. Funcionario: solo su información. Admin: usuarios y roles | Reglas de autorización en Gateway y servicios | | |
| S-03 | Personal | ¿Qué datos mínimos tiene la ficha de un funcionario? | Nombres, apellidos, documento de identidad, fecha de ingreso, área, cargo, remuneración | MER (HU-02), formularios | | |
| S-04 | Personal | ¿Qué significa "ratificado"? ¿Se ratifica al terminar el tiempo de prueba? ¿Quién lo registra? | Estados EN_PRUEBA → RATIFICADO (lo registra RRHH con fecha, al cumplirse el periodo de prueba de 90 días por defecto) → BAJA | Elegibilidad de vacaciones | | |
| S-05 | Personal | ¿Se debe conservar historial de cambios de área, cargo y remuneración? | Sí, historial con fecha de vigencia | Tablas de historial; boletas con salario vigente | | |
| S-06 | Personal | En la baja: ¿se piden motivo y fecha de baja? ¿Se calcula finiquito/liquidación en este MVP? | Motivo y fecha obligatorios; sin cálculo de finiquito | Alcance de Boletas | | |
| S-07 | Personal | ¿Se puede reincorporar a un funcionario dado de baja? | No en el MVP | Estados y usuario asociado | | |
| S-08 | Vacaciones | "15 días por gestión completada": ¿son días calendario o hábiles? ¿Aplica una escala por antigüedad según normativa laboral o es fijo? | Días hábiles, fijo 15 por gestión | Regla de cálculo de saldo | | |
| S-09 | Vacaciones | ¿La antigüedad cuenta desde la fecha de ingreso o desde la ratificación? | Desde la fecha de ingreso | Elegibilidad | | |
| S-10 | Vacaciones | ¿Las vacaciones se acumulan entre gestiones? ¿Hay un tope? ¿Existe flujo de aprobación (solicitud → jefe/RRHH)? | Se acumulan sin tope; solicita el funcionario y aprueba RRHH | Estados de solicitud, pantallas | | |
| S-11 | Vacaciones | ¿Los feriados y fines de semana se descuentan del periodo de vacaciones? | Sí, solo cuentan días hábiles; feriados cargados en el schema `vacaciones` | Catálogo de feriados | | |
| S-12 | Contratos | ¿Qué variables debe tener la plantilla parametrizable (además de fecha de ingreso, salario y tiempo de prueba)? ¿Hay varios tipos de contrato? | Dos tipos (plazo indefinido y plazo fijo); variables: datos del funcionario, cargo, área, fecha de ingreso, salario, tiempo de prueba | Modelo de plantillas | | |
| S-13 | Contratos | ¿Se requiere firma o solo el documento generado? ¿Se versionan las plantillas? | Solo documento PDF generado; plantilla versionada | Alcance ms-contratos | | |
| S-14 | Boletas | ¿Periodicidad del pago y moneda? | Mensual, en bolivianos (BOB) | Cálculo de planilla | | |
| S-15 | Boletas | ¿Qué conceptos incluye la boleta (haber básico, bonos, descuentos de ley, aportes, anticipos, horas extra)? ¿Cuáles fórmulas aplican? | Haber básico y descuentos de ley parametrizados; sin horas extra ni asistencia | Complejidad de PlanillaCalculator | | |
| S-16 | Boletas | ¿Cómo se paga el mes de ingreso o de baja (proporcional por días)? | Proporcional por días trabajados | Regla de cálculo, uso de activosDesde/activosHasta | | |
| S-17 | Boletas | ¿El funcionario puede ver y descargar solo sus propias boletas? | Sí | Autorización | | |
| S-18 | Técnico | ¿Hay restricción sobre el proveedor de Postgres en la nube o sobre el frontend (framework)? | Supabase y React + Vite (decidido, ADR-004) | ADR-004, frontend | | |
