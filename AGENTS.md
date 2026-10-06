# Reglas y Directivas Críticas del Proyecto (KANT / Román & Delgado)

## 1. Sincronización Multidispositivo (Auto-Draft en la Nube - INVIOLABLE)
> **REGLA DE ORO:** La sincronización multidispositivo en tiempo real entre computadoras y teléfonos móviles **JAMÁS** debe ser eliminada, deshabilitada ni alterada por error.

- **Flujo de trabajo:** Un abogado o empleado puede iniciar su jornada o escribir actuaciones en la PC del despacho, salir al tribunal o a la calle y continuar redactando desde su teléfono móvil, y luego llegar a su casa o a otra PC para revisar y cerrar la bitácora.
- **Componentes clave:**
  - `fetchDraft()` al iniciar sesión / montar componentes en `EmployeeDashboard.tsx` y `AdminDashboard.tsx`.
  - Autoguardado con debounce (`submitToServer('/rd-intranet/v1/draft', ...)`) hacia la tabla `bitacora_drafts` en Supabase.
  - Resolución de versiones mediante sellos de tiempo (`lastUpdated`), donde siempre prevalece la versión más reciente entre la nube y el dispositivo local.
  - Preservación de la hora oficial de entrada (`clockIn`) y la ubicación.

## 2. Gestión de Expedientes y Base de Datos (Supabase)
- **Estructura de la tabla `expedientes`:**
  - Columnas reales: `id`, `numero`, `titulo`, `cliente`, `tribunal`, `materia`, `estado`, `abogado_responsable`, `created_at`, `actuaciones`.
  - **IMPORTANTE:** La tabla `expedientes` NO contiene la columna `tipo`. Cualquier inserción o upsert debe mapear el tipo a `materia` y `tribunal` para evitar errores `PGRST204`.
- **Permisos de eliminación:**
  - **Solo la Jefatura** (Víctor Román, Luis Delgado o usuarios admin) tiene permisos para eliminar expedientes del sistema.
  - En la interfaz de empleados (`EmployeeDashboard`), los botones de eliminar expedientes (`Trash2`) deben permanecer estrictamente ocultos y bloqueados en la API.

## 3. Optimización del Plan Gratuito (Supabase Egress & Free Tier)
- Mantener siempre el consumo de Egress por debajo de los 5 GB mensuales.
- Pausar consultas periódicas en segundo plano cuando la pestaña del navegador esté oculta o inactiva (`document.hidden`).
- Evitar descargar o transferir cadenas masivas (como PDFs en base64) en consultas cotidianas.
