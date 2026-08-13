# ERGOX Post — Backend (Google Apps Script)

API REST de **costo $0** construida sobre **Google Sheets** + **Apps Script**.
Sin dependencias, sin servidores, sin tarjetas de crédito.

Este backend alimenta la PWA `ERGOX Post` (modo nube). Mientras no lo despliegues,
la app funciona en modo local/demo (`js/config.js` vacío).

---

## 1. Requisitos

- Una cuenta de Google (gratis).
- El proyecto del frontend (`js/config.js` para pegar la URL y la API key).

---

## 2. Paso a paso (10 minutos)

### Paso 1 — Crear la hoja y el script

1. Ve a [sheets.new](https://sheets.new) y crea una hoja de cálculo vacía
   (p. ej. «ERGOX Backend»).
2. Menú: **Extensiones → Apps Script**. Se abre el editor con un `Code.gs` vacío.
3. **Borra** el contenido por defecto.

### Paso 2 — Pegar el código

4. Copia **todo** el contenido de `backend/Code.gs` y pégalo en el editor.
5. **Cambia la API key** (línea 1 de configuración):

```js
var API_KEY = 'cambia-esta-clave-antes-de-producir';
```

Pon una clave larga y aleatoria, p. ej. `Xk9f2QpZ81mNvL7wR4sT6uY`. No la compartas:
es la llave de entrada a tu base de datos.

### Paso 3 — Ejecutar `setup()`

6. En la barra de herramientas del editor, selecciona la función **`setup`**
   (desplegable junto a ▶) y pulsa **Ejecutar**.
7. Acepta los permisos que pide Google (el script crea hojas y lee/escribe en
   el spreadsheet). Si aparece la advertencia «Google no verificó esta app»,
   elige **Avanzado → Ir a <tu proyecto> (no seguro)** y autoriza
   (es tu propio script; no hay revisión de Google para proyectos personales).
8. En **Ejecuciones** (panel izquierdo) verás el **admin inicial creado**:

```
ERGOX Post — ADMIN INICIAL CREADO
Email:        admin@ergox.com
Contraseña:   Admin2026!
```

> **Seguridad:** la contraseña del admin solo aparece aquí. Cámbiala tras el
> primer acceso (ver sección 5). `setup()` es **idempotente**: si ya existe el
> admin, no lo vuelve a crear.

### Paso 4 — Implementar como Web App

9. En el editor: **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**
   - Descripción: `v1`
   - **Ejecutar como:** «Yo» (tu cuenta)
   - **Quién tiene acceso:** «Cualquier persona»
10. Pulsa **Implementar** y **copia la URL** que termina en `/exec`
    (algo como `https://script.google.com/macros/s/AKfycb.../exec`).
    **Guárdala bien**: Apps Script no la vuelve a mostrar completa.

> Si Google pide **«Vincular nuevo proyecto»** o muestra *Cloud Platform*,
> acepta el proyecto por defecto (gratuito).

### Paso 5 — Configurar el frontend

11. Abre `js/config.js` del proyecto y pega:

```js
SHEETS_ENDPOINT: 'https://script.google.com/macros/s/TU_ID/exec',
SHEETS_API_KEY: 'Xk9f2QpZ81mNvL7wR4sT6uY',
```

12. Guarda y recarga la PWA. En la pantalla de login verás la insignia
    **«☁️ Modo nube (Sheets)»**.
13. Inicia sesión con `admin@ergox.com` / `Admin2026!` y crea tus usuarios
    desde **Admin → Nuevo usuario** (cada usuario recibe su salt/hash propio).

### Paso 6 — Verificar

- Prueba `GET_SALT` desde el navegador (URL `/exec`): debería devolver
  `{"ok":true,"data":{"app":"ERGOX Post API","acciones":[...]}}`.
- Registra un usuario desde la app, genera una publicación, compra un plan y
  confirma el pago desde **Admin → Pagos pendientes**.

---

## 3. Rotar la API key (si se filtra o por precaución)

1. En `Code.gs` cambia el valor de `API_KEY`.
2. **Guardar** el proyecto.
3. **Implementar → Administrar implementaciones → ✏️ Editar → Nueva versión**
   → Implementar (esto publica la versión nueva del script).
4. Actualiza `SHEETS_API_KEY` en `js/config.js` del frontend.
5. La clave antigua deja de funcionar al instante. Las sesiones abiertas
   (tokens) siguen siendo válidas: para invalidarlas todas, borra las filas
   de la hoja **SESSIONS**.

---

## 4. Hojas que crea `setup()`

| Hoja            | Columnas                                                                                                 | Contenido                                  |
|-----------------|----------------------------------------------------------------------------------------------------------|--------------------------------------------|
| `USERS`         | email, nombre, rol, empresa, cred, salt, hash, perfilJSON, refCode, referidoPor, activo, creado          | Usuarios (hash SHA-256 de salt+clave)      |
| `SESSIONS`      | token, email, expira                                                                                     | Sesiones activas (30 días)                 |
| `POSTS`         | id, email, postJSON, fecha                                                                               | Publicaciones (JSON embebido en la celda)  |
| `LEADS`         | id, lmId, recurso, nombre, email, empresa, telefono, consentimiento, fecha                               | Leads capturados en las landings           |
| `LEAD_MAGNETS`  | id, titulo, url, pais, creado                                                                            | Recursos descargables (lead magnets)       |
| `TRANSACCIONES` | id, email, tipo, detalle, monto, montoUsd, planId, estado, ref, confirmadoPor, fecha                     | Compras y ajustes de créditos              |
| `AUDIT_LOG`     | email, accion, detalle, fecha                                                                            | Bitácora de eventos relevantes             |
| `CONFIG`        | clave, valorJSON                                                                                         | `adminCreado`, `tasaOverride:{}`, `parametros:{}`, contador de posts |

---

## 5. Cambiar la contraseña del admin (o de cualquier usuario)

El backend **nunca** conoce ni guarda contraseñas: solo `salt` + `hash`
(hex de SHA-256 de `salt + clave`). Por eso el cambio de clave es manual:

1. En el editor del script ejecuta la función **`generarHashDemo`** con la
   nueva clave (déjala en el desplegable y escribe el argumento, o edítala en
   el código) y mira la **Ejecución**: te imprime `salt` y `hash`.
2. En la hoja `USERS`, sobre la fila del usuario, pega esos valores en las
   columnas **salt** y **hash**.
3. Guarda y pide al usuario que inicie sesión con la clave nueva.

Alternativa: desde la app, **Admin → Nuevo usuario** con rol ADMIN para el
nuevo dueño, y luego bloquea el anterior en **Admin → Empresas registradas**.

---

## 6. Contrato de acciones (JSON en `POST` a la URL `/exec`)

Formato de petición (igual al que usa `js/providers/sheets.js`):

```json
{ "key": "API_KEY", "action": "AUTH", "payload": { ... }, "token": "..." }
```

Todo el cuerpo viaja como `text/plain` (evita el preflight de CORS).
Toda respuesta: `{"ok":true,"data":{...}}` o `{"ok":false,"error":"...","code":"..."}`.

| Acción              | Acceso   | Payload → Respuesta `data`                                                                  |
|---------------------|----------|---------------------------------------------------------------------------------------------|
| `GET_SALT`          | Público  | `{email}` → `{salt}` (salt fake determinista si el email no existe)                         |
| `AUTH`              | Público  | `{email, hash}` → `{user:{email,nombre,rol,empresa,pais}, token}` (sesión 30 días)          |
| `REGISTER`          | Público  | `{email,nombre,empresa,pais,ref,salt,hash}` → `{user, token}` (EDITOR +10 trial, referido +10/+5) |
| `SESSION_RESTORE`   | Sesión   | `{}` → `{user}` o 401                                                                       |
| `LOGOUT`            | Sesión   | `{}` → `{}` (borra el token)                                                                |
| `GET_STATE`         | Sesión   | `{}` → `{historial, leads, leadMagnets, transacciones, params, perfil, cred}`               |
| `SAVE_POST`         | Sesión   | `{post}` → `{post}` (guarda e incrementa el contador del usuario)                           |
| `DELETE_POST`       | Sesión   | `{id}` → `{}`                                                                               |
| `UPDATE_METRICAS`   | Sesión   | `{id, metricas}` → `{post}`                                                                 |
| `CREATE_LM`         | Sesión   | `{lm:{id,titulo,url,pais,creado}}` → `{lm}`                                                 |
| `GET_LM`            | Público  | `{lmId}` → `{lm:{id,titulo,url}}` (para la landing sin login)                               |
| `CAPTURE_LEAD`      | Público  | `{lmId, datos:{nombre,email,empresa,telefono,consentimiento}}` → `{lead}`                   |
| `BUY_PLAN`          | Sesión   | `{plan:{id,precio,creditos}, email}` → `{intento}` (transacción PENDIENTE)                  |
| `CONFIRM_PAYMENT`   | Admin    | `{intentoId, ref, adminEmail}` → `{t}` (PAGADO + acredita créditos; idempotente)            |
| `GET_CREDITS`       | Sesión   | `{email}` → `{cred}`                                                                        |
| `CONSUME_CREDIT`    | Sesión   | `{email, n, detalle}` → `{cred}`; si no alcanza: error `NO_CREDIT` («Créditos insuficientes») |
| `SET_PERFIL`        | Sesión   | `{perfil}` → `{perfil}` (si trae `nombreEmpresa`, actualiza la empresa)                     |
| `ADMIN_LIST_USERS`  | Admin    | `{}` → `[{email,nombre,rol,empresa,cred,activo,creado}]`                                    |
| `ADMIN_CREATE_USER` | Admin    | `{datos:{nombre,email,empresa,cred,rol,salt,hash}}` → `{user}`                              |
| `ADMIN_TOGGLE_ACTIVE`| Admin   | `{email, activo}` → `{activo}` (no permite bloquearse a uno mismo)                          |
| `ADMIN_ADD_CREDITS` | Admin    | `{email, n, motivo, adminEmail}` → `{cred}` (deja movimiento en TRANSACCIONES)              |
| `ADMIN_SET_ROL`     | Admin    | `{email, rol, adminEmail}` → `{rol}` (no permite cambiarse el propio rol)                   |
| `SET_PARAMS`        | Admin    | `{params}` (JSON libre) → `{params}` (se guarda en CONFIG)                                  |
| `GET_REPORTS`       | Admin    | `{}` → `{transacciones, usuarios, totalIngresos}`                                           |

---

## 7. Seguridad implementada

- **Claves nunca viajan en claro**: el frontend calcula
  `hex(SHA-256(salt + clave))` (`js/core/security.js`) y envía solo el hash.
  El servidor guarda `salt` + `hash` tal cual.
- **Salt falso** en `GET_SALT` para emails inexistentes (no revela usuarios).
- **Sesiones** con token aleatorio (UUID + hash), expiración 30 días,
  borradas en `LOGOUT`.
- **Rate limit** en memoria: ~30 peticiones públicas/hora y ~120 por sesión/hora
  (código `RATE_LIMIT`).
- **Sanitización** de todos los campos de texto (se eliminan `<` y `>`) antes
  de escribir en las hojas.
- **Lock por escritura** (`LockService`) para evitar condiciones de carrera en
  créditos, pagos y registros.
- **try/catch global** en `doPost`: los errores internos no exponen trazas.
- **Bitácora** de eventos en `AUDIT_LOG` (login, registro, pagos, ajustes…).

---

## 8. Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| «Acción desconocida» al abrir la URL /exec en el navegador | Normal: la URL solo responde a `GET` con un mensaje informativo. Las acciones van por `POST`. |
| La app sigue en «Modo demo local» | `SHEETS_ENDPOINT` o `SHEETS_API_KEY` vacíos o con espacios; revisa `js/config.js`. |
| `Error interno del servidor` | Revisa **Ejecuciones** en el editor: ahí está el detalle (el cliente no lo ve). Suele ser falta de `setup()` o permisos incompletos. |
| Pide autorización otra vez | Cambiaste la hoja vinculada; vuelve a ejecutar `setup()` para registrar el ID del spreadsheet. |
| Límite de peticiones (`RATE_LIMIT`) | Espera una hora o revisa que ninguna integración haga llamadas en bucle. |
| Cambiaste la hoja y el Web App apunta a otra | El ID del spreadsheet se guarda en «Configuración del proyecto → Propiedades del script». |

---

## 9. Supuestos de diseño

- `GET_STATE` devuelve el **historial y las transacciones del propio usuario**;
  los **lead magnets y leads son globales** (el esquema no tiene columna de
  dueño; si en el futuro hay varias empresas independientes, añade `email` a
  esas hojas).
- `ADMIN_LIST_USERS` devuelve el array directamente (así lo espera
  `js/views/admin.js`), no un objeto envuelto.
- La confirmación de pago es **manual y acredita el monto de créditos** del
  plan (`t.monto`); el recibo usa la fecha de la transacción como fecha de
  confirmación (la hoja no tiene columna «confirmado» por contrato).
- El rate limit usa una **aproximación de IP**: se limita por email o lead
  magnet implicado en acciones públicas (Apps Script no expone la IP real).
- El sal del `setup()` se genera con `Math.random` (Apps Script no ofrece
  RNG criptográfico nativo); el token de sesión sí combina UUID de Google con
  un hash del tiempo, suficiente para este alcance.
- `CONFIRM_PAYMENT` es idempotente: confirmar dos veces no duplica créditos.
- El admin no puede bloquear su propia cuenta ni cambiarse su propio rol
  (evita encerrarse fuera).
