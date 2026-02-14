# UX: Inscripción Registrada (cerrado)

## Objetivo
Reducir ruido en la pantalla de detalle y concentrar las acciones post-registro en un único punto claro.

## Decisiones UX validadas
- Patrón elegido: modal bloqueante (opción 1).
- Apertura: automática al completar inscripción con éxito.
- Cierre: manual con botón `Cerrar` en la parte inferior.
- Contenido principal:
  - `Inscripción registrada`
  - `Guarda tu inscripción para poder editarla o borrarla más tarde.`
- Acciones del modal:
  - `Guardar inscripción`
  - `Añadir a Google Calendar` (solo si hay datos completos del evento para calendar).
- Comportamiento de guardado:
  - Guarda `Título del evento + link` para distinguir varias inscripciones.
- Navegación tras cierre:
  - Al cerrar, refresco automático del detalle del evento para actualizar asistentes.
- Reemplazo visual:
  - Se elimina el bloque persistente de “inscripción registrada” en la pantalla.

## Reglas de comportamiento
- Si el alta falla, no se abre modal y se mantiene feedback inline de error.
- Durante el alta, se mantiene spinner del botón de enviar.
- El modal bloquea interacción con el fondo.
- En móvil, botones del modal pasan a columna para mejor tactilidad.

## Implementación técnica
- `index.html`
  - Nuevo modal: `#signup-complete-modal`
  - Botones: `#save-signup-access`, `#save-calendar-event`, `#signup-complete-close`
  - Eliminado bloque persistente `#signup-success`.
- `app.js`
  - Nuevas funciones:
    - `openSignupCompleteModal()`
    - `closeSignupCompleteModal({ refresh })`
    - `hasCalendarData(event)`
  - Al éxito de `signup_batch`, se abre modal y se guarda `state.signupSuccess`.
  - `Guardar inscripción` usa `Título + link`.
  - `Añadir a Google Calendar` se oculta si faltan datos mínimos.
  - Al cerrar modal: refresco de evento para mostrar asistentes actualizados.
- `styles.css`
  - Estilos para modal de registro completado y estado `body.modal-open`.
  - Ajustes responsive para botones en móvil.
