# HU-04 – Construir la base del frontend

**Sprint 1 · Responsable:** I4 · **Estado:** implementado y verificado.

## 1. Criterios de aceptación

| CA | Criterio | Estado | Evidencia |
|---|---|:---:|---|
| **CA-01** | Layout principal con barra lateral (Personal, Vacaciones, Contratos, Boletas, Dashboard) y barra superior (usuario y rol) | **Hecho** | `Sidebar.tsx`, `Topbar.tsx` y `AppLayout.tsx`. El layout integra navegación lateral y cabecera con estado de sesión. |
| **CA-02** | Design system mínimo: colores de ARCA, tipografía, tabla, formulario, modal, toast, badge de estado y estado vacío | **Hecho** | Componentes reutilizables en `src/components/ui/` (`Table`, `Input`, `Select`, `Button`, `Modal`, `Toast`, `Badge`/`StatusBadge`, `EmptyState`, `Card`). |
| **CA-03** | Cliente HTTP único que apunta al gateway, adjunta el token y maneja errores comunes | **Hecho** | `ApiService` en `src/services/api.ts` con métodos `get`, `post`, `put`, `patch`, `delete`, inyección automática de Bearer token y manejo de `ApiError` `{ code, message, details }`. |
| **CA-04** | Rutas protegidas redirigen al login si no hay sesión | **Hecho** | `ProtectedRoute.tsx` valida usuario activo; sin token redirige a `/login` preservando `from` para retorno posterior. |
| **CA-05** | El menú muestra u oculta módulos según el rol de la sesión | **Hecho** | `getNavItemsForRole(rol)` en `src/config/navigation.ts` filtra la barra lateral y las rutas protegidas evalúan `allowedRoles` (`ADMIN`, `RRHH`, `DIRECCION`, `FUNCIONARIO`). |
| **CA-06** | Responsive desde 375 px de ancho | **Hecho** | Media queries fluidas en `index.css`, menú hamburguesa desplegable en mobile con backdrop, tablas con scroll horizontal (`overflow-x: auto`) y grids auto-ajustables probados desde 375 px. |
| **CA-07** | Moneda en Bs y fechas en formato dd/mm/aaaa en toda la app | **Hecho** | Módulo de utilidades `src/utils/formatters.ts` (`formatCurrency`, `formatDate`, `formatDateTime`, `formatNumber`) aplicado en tablas, tarjetas y formularios. |

---

## 2. Componentes del Design System (`src/components/`)

- **`Badge` & `StatusBadge`:** Etiquetas semánticas (`brand`, `success`, `warning`, `danger`, `info`, `neutral`). Mapeo automático de estados del dominio:
  - Roles: `ADMIN`, `RRHH`, `DIRECCION`, `FUNCIONARIO`.
  - Personal: `EN_PRUEBA`, `RATIFICADO`, `BAJA`.
  - Vacaciones: `PENDIENTE`, `APROBADA`, `RECHAZADA`.
  - Boletas: `BORRADOR`, `EMITIDA`, `RECTIFICADA`, `PAGADA`.
- **`Button`:** Variantes `primary`, `secondary`, `outline`, `danger`, `ghost` con tamaños `sm`, `md`, `lg`, estados `isLoading` con spinner integrado y soporte de iconos de `lucide-react`.
- **`Input` & `Select`:** Controles de formulario accesibles con etiquetas, mensajes de error semánticos, textos de ayuda e iconos laterales.
- **`Table`:** Contenedor responsivo con soporte para `TableHeader`, `TableBody`, `TableRow`, `TableHead` y `TableCell`.
- **`Modal`:** Diálogo emergente accesible con control por tecla `Escape`, bloqueo de scroll de fondo, backdrop clickeable y botones de acción.
- **`Toast`:** Sistema de notificaciones flotantes contextuales (`ToastProvider` y hook `useToast`) con variantes `success`, `error`, `warning` e `info`.
- **`EmptyState`:** Vista estándar para listas y tablas sin registros, con icono descriptivo, título, mensaje y botón de acción.

---

## 3. Navegación y Control de Acceso por Rol (CA-01 y CA-05)

| Módulo | Ruta | ADMIN | RRHH | DIRECCION | FUNCIONARIO |
|---|---|:---:|:---:|:---:|:---:|
| **Dashboard** | `/` | ✅ | ✅ | ✅ | ✅ |
| **Personal** | `/personal` | ✅ | ✅ | ✅ | ✅ *(Mi Ficha)* |
| **Vacaciones** | `/vacaciones` | — | ✅ | ✅ | ✅ *(Mis Vacaciones)* |
| **Contratos** | `/contratos` | ✅ | ✅ | ✅ | — |
| **Boletas** | `/boletas` | — | ✅ | ✅ | ✅ *(Mis Boletas)* |
| **Auditoría** | `/auditoria` | ✅ | — | — | — |

---

## 4. Verificación y Calidad de Código

Ejecutado satisfactoriamente desde `frontend-arca-main`:

```bash
npm run typecheck     # tsc -b (0 errores de tipado)
npm run lint          # oxlint (0 advertencias, 0 errores en 39 archivos)
npm run format:check  # prettier (100% adherencia de estilo)
npm run build         # vite build (bundle compilado listo para producción)
```

