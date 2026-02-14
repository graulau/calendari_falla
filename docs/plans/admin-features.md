# Admin Features

## Objetivo
Mejorar la usabilidad del panel admin para operativa diaria y gestión de eventos cerrados.

## Decisiones cerradas
- Tabs de eventos: solo `Activos` y `Cerrados`.
- En `Cerrados`, añadir acción `Duplicar`.
- La lista de participantes se genera en HTML imprimible/compartible.
- Orden de participantes: por orden real de inscripción (`created_at` ascendente).
- En eventos `extended`, mostrar `Nombre - Opción` y acumulados por opción.
- Duplicación: copia configuración del evento, crea `active`, sin participantes y con fecha/hora vacías.

## UX objetivo
1. En `#/admin` mostrar tabs:
   - `Activos (N)`
   - `Cerrados (N)`
2. Cada evento en card con acciones según tab:
   - Activos: `Editar`, `Cerrar`, `Lista`
   - Cerrados: `Editar`, `Duplicar`, `Lista`
3. Acción `Lista`:
   - abre una vista HTML limpia
   - incluye resumen del evento
   - incluye acumulados (si `extended`)
   - incluye lista ordenada por inscripción
   - incluye botón compartir en móvil (fallback copiar/imprimir)

## API backend (Apps Script)
- `action=admin_event_signups`
  - input: `secret`, `id`
  - output: `event`, `signups` ordenados por `created_at`, `extra_totals`
- `action=admin_duplicate`
  - input: `secret`, `id`
  - output: `ok`, `id`
  - lógica: clonar configuración, `status=active`, `date=""`, `time=""`

## Criterios de aceptación
- Gestionar un evento en móvil con 1-2 acciones.
- Generar lista compartible sin edición manual.
- Duplicar desde cerrados crea evento reutilizable (activo, vacío de participantes, sin fecha/hora).
