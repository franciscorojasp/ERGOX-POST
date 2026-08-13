# 🛡️ ERGOX Post — Publicaciones SST multinacional

PWA de costo $0 para generar publicaciones de **Seguridad y Salud en el Trabajo** en
**Venezuela, Colombia, México, Perú, Argentina y Chile**, con captura real de leads,
calendario de cumplimiento dinámico, planner editorial y venta de créditos con
confirmación manual (sin pasarela en la fase actual).

- **Frontend**: PWA vanilla JS (ES modules, sin frameworks, sin build).
- **Backend opcional**: Google Apps Script sobre Google Sheets (costo $0).
- **Migración lista**: toda la app habla con `js/core/db.js` (contrato único);
  migrar a Supabase/Firebase = escribir `js/providers/supabase.js` con los mismos
  métodos y cambiarlo en `dbIniciar()`.

---

## 🚀 Arranque rápido

### Opción A — Solo frontend (modo demo local)
1. Abre `index.html` (con un servidor local por módulos ES:
   `npx serve .` o VS Code Live Server, o depliega en GitHub Pages).
2. Usa los botones de **demo** de la pantalla de login.
3. Todo vive en `localStorage` del dispositivo. **Sin backend los créditos son simulados.**

### Opción B — Con backend real (Google Sheets)
1. Crea un proyecto en [script.google.com](https://script.google.com) y pega
   [`backend/Code.gs`](backend/Code.gs).
2. Cambia la `API_KEY` al inicio del archivo.
3. Ejecuta la función `setup()` (crea las hojas y el admin inicial; las
   credenciales del admin se muestran en **Ejecuciones → Logger**).
4. **Implementar → Nueva implementación → Aplicación web**: ejecutar como *Tú*,
   acceso *Cualquier persona*.
5. Copia la URL `/exec` y la `API_KEY` en [`js/config.js`](js/config.js)
   (`SHEETS_ENDPOINT` / `SHEETS_API_KEY`).
6. Listo: login real, créditos en el servidor, leads con consentimiento, pagos
   pendientes + confirmación desde Admin.

Instrucciones detalladas: [`backend/README.md`](backend/README.md).

### Despliegue PWA
- **GitHub Pages**: ya existe `.github/workflows/pages.yml`.
- **Cloudflare/Netlify** (recomendado a futuro): permiten `_headers` (CSP),
  funciones serverless y no bloquean nada del PWA.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|---|---|
| 🔐 Login/Registro | Hash SHA-256(salt+pass) — la contraseña nunca viaja ni se guarda en claro. Trial de 10 créditos + referidos (+10/+5). |
| 📸 Generador | 6 países × 3 tipos (educativo, promocional, concienciación), temas rápidos **incl. ergonomía** (ADN ERGOX), montos de sanciones calculados por año y descargo legal configurable. |
| 🎨 Placa visual | Canvas sin dependencias: 3 layouts, paleta por país, 3 formatos (feed/story/cuadrado), descarga PNG. |
| 📋 Historial | Métricas reales editables (alcance/likes/comentarios), exportación TXT. |
| 🧲 Leads | Lead magnets con **página de captura real** (`lead.html?id=…`) y consentimiento obligatorio (LOPDP VE, Ley 1581 CO, LFPDPPP MX, Ley 29733 PE, Ley 25.326 AR, Ley 19.628 CL). Export CSV. |
| 📆 Cumplimiento | Calendario recurrente (anual/trimestral/semestral) calculado con el año actual, alertas de vencimiento y recordatorios del navegador. |
| 🗓️ Planner | Vista mensual, mezcla de contenido 40/35/25, mejores horarios por red, export CSV. |
| 💳 Créditos | Planes con conversión a moneda local (APIs gratuitas + override manual), compra → intención PENDIENTE → confirmación por WhatsApp/pago móvil/Zelle → recibo imprimible. |
| 👑 Admin | Usuarios (bloqueo/rol/créditos), confirmación de pagos, parámetros financieros/legales por año, export JSON. |
| 📊 Informe | Ingresos por plan, uso por país/tipo, transacciones; export CSV. |
| 🌐 PWA | Manifest, service worker offline, tema oscuro, accesibilidad AA (focus trap, ESC, aria-live, contraste), `prefers-reduced-motion`. |

---

## 🧪 Pruebas

```bash
npm test          # node --test (22 tests: contenido, migraciones, providers, util)
npm run check     # verifica sintaxis ES en todos los módulos
```

- `tests/checklist.md` — lista de verificación manual end-to-end.

## 🛡️ Seguridad (decisiones de diseño)

- La contraseña se hashea con WebCrypto en el cliente; el backend solo recibe el
  hash. **Migrar a Supabase Auth** elimina por completo la gestión de hashes.
- Los créditos se guardan en el ledger del servidor (nube); en modo local son
  simulados (documentado en la UI).
- `escHtml()` en todas las interpolaciones, URLs de logo/imagen validadas
  (solo http/https), sanitización server-side de campos.
- Sesiones por token con expiración (30 días) y rate-limit por sesión.
- El backend usa una `API_KEY` compartida: **rótala** si se filtra
  (`backend/README.md`).

## 📐 Estructura

```
index.html            → shell de la app
lead.html             → landing de captura de leads
privacidad.html       → política de privacidad multinacional
manifest.json / sw.js / icons/
assets/css/app.css    → sistema de diseño (claro/oscuro, a11y)
js/
  app.js              → arranque (PWA, tema, router)
  config.js           → configuración (endpoint Sheets, reglas)
  core/               → db (contrato), util, security, migrations, ui, tasas
  providers/          → local.js, sheets.js, sesion.js  (+ futuro supabase.js)
  content/datos.js    → países, leyes, plantillas, calendario, montos por año
  views/              → login, dashboard, generador, historial, leads,
                        calendario, planner, creditos, config, admin, informe
  marketing/          → diseno.js (placas), planner.js, landing.js
  finanzas/           → factura.js (recibo), reportes.js (informe/CSV)
backend/
  Code.gs             → API Apps Script (24 acciones)
  README.md           → despliegue paso a paso
tests/                → node --test
legacy/               → PostSST v2.0 (monolito original)
```

## ⏭️ Siguientes pasos (cuando haya presupuesto)

1. Pasarela de pago real (MercadoPago/PayPal + pago móvil/Zelle) y facturación
   electrónica.
2. Migración a Supabase/Firebase (auth + ledger + notificaciones push).
3. Programación directa a redes (Meta Graph API, X API) y analítica real.
4. Generador de documentos PSST/SG-SST y más países.
