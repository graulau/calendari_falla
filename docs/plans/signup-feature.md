# Signup Feature Redesign

Fecha: 2026-02-14

## Contexto
La inscripción actual no es suficientemente usable, sobre todo en eventos `extended` donde cada persona necesita su propia categoría.

## Sección 1: UX cerrada

Decisiones validadas:
- Un único flujo visual para `basic` y `extended`.
- Selector de cantidad con `+ / -` entre 1 y 5 personas.
- Render dinámico de filas según cantidad.
- Cada fila:
  - Nombre y apellidos (obligatorio, mínimo 2 palabras).
  - En `extended`: categoría obligatoria por persona.
- Errores por fila (inline + borde rojo).
- Duplicados:
  - no bloquean todo el formulario
  - solo bloquean las filas afectadas
- Envío parcial:
  - se envían filas válidas
  - quedan en pantalla las filas con error para corregir
  - feedback agregado: enviadas vs pendientes.

## Sección 2: Modelo de datos y contrato API

### Objetivo técnico
Permitir envío parcial por fila, manteniendo token único para las filas válidas enviadas en la misma acción.

### Payload frontend -> backend
`action=signup_batch`

Parámetros:
- `event_id`
- `allow_duplicate` (`0/1`)
- `entries` (JSON array), donde cada item:
  - `name`
  - `extra` (solo se usa en `extended`; en `basic` puede ir vacío)
  - `client_row_id` (identificador temporal para mapear errores por fila)

Ejemplo:
```json
[
  { "client_row_id": "r1", "name": "Laura Martí", "extra": "Pizza" },
  { "client_row_id": "r2", "name": "Pau", "extra": "Hamburguesa" },
  { "client_row_id": "r3", "name": "Ana López", "extra": "" }
]
```

### Respuesta backend -> frontend
```json
{
  "ok": true,
  "event_id": "abc123",
  "token": "sharedtoken...",
  "saved_count": 1,
  "errors": [
    { "client_row_id": "r2", "code": "invalid_name", "message": "Nombre incompleto" },
    { "client_row_id": "r3", "code": "missing_extra", "message": "Categoría obligatoria" }
  ]
}
```

Reglas:
- Si al menos una fila válida se guarda:
  - `ok=true`
  - se devuelve `token` para esas filas guardadas.
- Si ninguna fila es válida:
  - `ok=false`
  - `token` ausente
  - `errors` con detalle por fila.

### Validación por fila (backend)
- `invalid_name`: menos de 2 palabras.
- `duplicate`: ya existe para ese evento.
- `missing_extra`: evento `extended` con categoría vacía.
- `full`: no hay plazas suficientes para esa fila.

### Compatibilidad
- Mantener endpoint actual `signup` temporalmente para no romper versiones desplegadas antiguas.
- Frontend nuevo usará `signup_batch`.
- En fase de estabilización, decidir si se depreca `signup`.
