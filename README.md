# Calendari Falla (Netlify + Google Sheets)

Solucion ligera para publicar eventos, ver la lista de apuntados y mantener un calendario compartido.

## Flujo general
- Los eventos se crean/editan en un Google Sheet.
- Las inscripciones se guardan en el mismo Sheet a traves de un Google Apps Script.
- La web es estatica y se despliega en Netlify.

## 1. Crear el Google Sheet
1. Crea un Google Sheet nuevo.
2. Ve a `Extensions > Apps Script` y pega el contenido de `apps_script/Code.gs`.
3. Guarda y ejecuta la funcion `setup()` una vez (autoriza permisos).

## 2. Desplegar el Apps Script
1. En Apps Script, pulsa `Deploy > New deployment`.
2. Selecciona `Web app`.
3. Execute as: `Me`.
4. Who has access: `Anyone`.
5. Copia la URL que te da el deployment.

## 3. Configurar la web
1. Abre `config.js` y pega la URL en `API_URL`.
2. Despliega la web en Netlify.

## Demo (sin Google Sheets)
Para mostrar la web sin backend:
- Deja `API_URL` sin configurar.
- Mantiene `DEMO: true` en `config.js`.
- Los datos se cargan desde `DEMO_EVENTS`.

## 4. Gestionar eventos
La hoja `events` contiene estos campos (una fila = un evento):
- `id`: identificador unico (pon un texto corto, ejemplo `cena2026`).
- `title`: titulo del evento.
- `title_val`: titulo en valenciano (opcional).
- `date`: fecha en formato `YYYY-MM-DD`.
- `time`: hora en `HH:mm` (opcional).
- `place`: lugar (opcional).
- `place_val`: lugar en valenciano (opcional).
- `description`: descripcion corta (opcional).
- `description_val`: descripcion en valenciano (opcional).
- `model`: `basic` o `extended`.
- `extra_label`: texto del campo extra si el modelo es `extended` (ej. `Talla`).
- `extra_label_val`: etiqueta del campo extra en valenciano (opcional).
- `limit`: numero maximo de plazas (opcional).
- `status`: `active`, `closed` o `hidden`.
- `created_at`, `updated_at`: se pueden dejar en blanco.

### Modelos
- `basic`: solo nombre y apellidos.
- `extended`: nombre y un campo extra definido por `extra_label`.

## 5. Gestionar inscripciones
Las inscripciones van a la hoja `signups` automaticamente.
- El admin puede editar o borrar directamente desde el Sheet.

## 6. Enlaces para WhatsApp
- Evento concreto: `https://tu-sitio.netlify.app/#/eventos/ID`
- Edicion por token: la web entrega un enlace privado tras apuntarse.

## Panel admin (misma web)
Accede a `/#/admin` y usa la clave definida en `config.js` y `apps_script/Code.gs` (`ADMIN_SECRET`).
Desde el panel puedes crear, editar y borrar eventos.
El ID se genera automaticamente al guardar un evento nuevo.

## Notas de seguridad
Este flujo es intencionalmente ligero y con poca seguridad. El Apps Script expone un endpoint publico (JSONP).

## Configuracion opcional
- Cambia `ADMIN_EMAIL` en `apps_script/Code.gs` si el correo de aviso es otro.
- Cambia los textos en `i18n.js`.
