# Manual De Usuario - Diseño Cerrado

## Objetivo
Publicar un manual de usuario dentro de la app con el mismo estilo visual, cabecera y tono amigable/no legal.

## Decisiones Cerradas
- Formato: página HTML interna de la app.
- Ruta: `#/manual`.
- Acceso: protegido con la misma clave general de la app.
- Entrada al manual: enlace en el footer (sin botón en cabecera).
- Idiomas: CAS y VAL usando el selector de idioma actual.
- Descarga: botón para descargar en `HTML` (no PDF).
- Cobertura: bloques para usuario y admin.
- Tono: práctico, cercano y ligero.

## Contenido Del Manual
- Qué puede hacer la persona usuaria:
  - Apuntarse, editar, borrar, ver calendario, abrir detalle y añadir a Google Calendar (si hay datos completos).
- Límites actuales:
  - Nombre y apellido obligatorios.
  - Máximo 5 personas por envío.
  - Sin cuentas de usuario ni login individual.
- Acceso y PIN:
  - Clave general de app.
  - PIN de evento posible en enlaces directos.
- Datos y privacidad:
  - Solo nombre y apellidos.
  - Sin seguridad reforzada por ahora.
  - Recomendación de no introducir datos sensibles.
- Funciones admin:
  - Crear, editar, cerrar y duplicar eventos.
  - Lista de asistentes y compartir.
  - Acumulados en modelos `extended`.
  - Compartir enlace directo de evento.
- FAQ breve orientada a uso diario.

## Implementación
- `index.html`
  - Nueva sección `#user-manual`.
  - Botón `#manual-download-btn`.
  - Enlace footer `#footer-manual-link`.
- `router.js`
  - Nueva ruta `manual`.
- `app.js`
  - Render de ruta manual y protección.
  - Generación y descarga de HTML (`manual-falla-castielfabib-es|val.html`).
- `i18n.js`
  - Claves CAS/VAL para todo el contenido del manual.
- `styles.css`
  - Estilos de tarjetas, bloques y acciones para la vista manual.
