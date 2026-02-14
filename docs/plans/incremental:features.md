# Incremental Features (MVP acordado)

Fecha: 2026-02-14

## Decisiones cerradas

### F1. Alta múltiple por envío
- Permitir apuntar hasta 5 personas en un solo envío.
- Todos los nombres de ese envío comparten el mismo token privado.
- Entrada UX: lista de nombres en un único campo (separados por comas o saltos de línea).

### F2. Validación de nombre
- Cada persona debe introducir al menos nombre + apellido.
- Regla: mínimo 2 palabras por nombre (trim + espacios normalizados).

### F3. Integración con Google Calendar
- Opción MVP elegida: botón directo “Añadir a Google Calendar”.
- Sin pedir email, sin login, sin almacenamiento de datos personales extra.
- Se abrirá enlace pre-rellenado con título, fecha/hora, lugar y descripción del evento.

### F4. Seguridad ligera sin usuarios
- Modelo híbrido elegido:
  - Si se entra por la app (`#/`), se pide contraseña global de acceso.
  - Si se entra directamente a un evento (`#/eventos/:id`), se pide PIN del evento.
  - Tras validar PIN del evento, la persona queda dentro de toda la app en esa sesión.
- Sesión en pestaña actual (sessionStorage).
- Bloqueo temporal tras 5 intentos fallidos.

### F5. Opciones por evento (una pregunta)
- Un evento puede tener una única pregunta opcional (ej: “Menú”).
- Si el evento define opciones, se renderiza selector con opciones cerradas.
- Si no define opciones, se mantiene campo de texto libre.

## Alcance técnico implementado
- Frontend:
  - Formulario de inscripción múltiple (hasta 5).
  - Validaciones de formato y límite.
  - CTA “Añadir a Google Calendar”.
  - Gate de acceso por contraseña global / PIN de evento.
  - Soporte de pregunta única por evento con `select` cuando hay opciones.
- Backend Apps Script:
  - `signup` admite múltiples nombres y genera token compartido.
  - `signup_by_token`, `edit`, `delete` operan a nivel grupo (token compartido).
  - Eventos exponen campo `extra_options` (opciones separadas por `|`).
- Admin:
  - Campo editable para opciones del evento (`extra_options`).
- Tests:
  - Cobertura de rutas, UX de alta múltiple, seguridad y opciones de evento.
