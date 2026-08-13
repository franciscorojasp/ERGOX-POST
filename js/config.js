// =====================================================
// ERGOX POST — Configuración global de la aplicación
// Costo $0: backend opcional vía Google Apps Script (Sheets).
// Si no se despliega, la app opera en modo local/demo.
// =====================================================

export const CFG = {
  VERSION: '3.0',

  // ---- Backend Google Sheets (Apps Script) ----
  // 1) Despliega backend/Code.gs como "Web App" (ejecutar como tú, acceso: cualquiera).
  // 2) Pega aquí la URL /exec y la API_KEY del script.
  // 3) Mientras esté vacío, la app usa el proveedor local (demo, sin nube).
  SHEETS_ENDPOINT: '',
  SHEETS_API_KEY: '',

  // ---- Credenciales de demo (solo modo local) ----
  DEMO_ADMIN: { email: 'admin@ergox.com', pass: 'Admin2026!' },
  DEMO_EMPRESA: { email: 'empresa@ergox.com', pass: 'demo123' },

  // ---- Reglas de negocio ----
  CREDITOS_TRIAL: 10,          // créditos de bienvenida al registrarse
  CREDITOS_POR_POST: 1,
  CREDITOS_REFERIDO_NUEVO: 10, // al referido por registrarse con código
  CREDITOS_REFERENTE: 5,       // al referente por cada referido activo
  SESSION_DIAS: 30,            // vigencia de la sesión en backend

  // ---- API de tasas de cambio (gratuitas, sin clave) ----
  TASAS_URL_DOLARAPI: 'https://dolarapi.com/v1/dolares/oficial', // USD->VES
  TASAS_URL_ERAPI: 'https://open.er-api.com/v6/latest/USD',      // USD->COP/MXN/PEN
  TASAS_CACHE_MIN: 120,         // minutos de caché para tasas

  // ---- PWA / notificaciones ----
  NOTIFICAR_CALENDARIO: true,

  // ---- Privacidad ----
  PRIVACIDAD_URL: 'privacidad.html',
  CONSENT_TEXTO: 'Acepto la política de privacidad y el tratamiento de mis datos personales para recibir información comercial.',
};