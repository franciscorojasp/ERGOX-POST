// =====================================================
// ERGOX POST — Capa de datos (contrato único)
// Todas las vistas usan db.* — nunca hablan con un provider directo.
// Migrar a Supabase/Firebase = escribir js/providers/supabase.js
// con los mismos métodos y cambiarlo aquí.
// =====================================================

import { CFG } from '../config.js';
import { crearLocalProvider } from '../providers/local.js';
import { crearSheetsProvider, configurarSheets, sheetsDisponible } from '../providers/sheets.js';
import { guardarSesion, obtenerSesion, limpiarSesion } from '../providers/sesion.js';

const KEY_CACHE = 'ergox_cache';
const KEY_COLA = 'ergox_cola';

let provider = null;

// ---- utilidades de persistencia ----
function leerCache() {
  try {
    const raw = localStorage.getItem(KEY_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function guardarCache(c) {
  try { localStorage.setItem(KEY_CACHE, JSON.stringify(c)); } catch (e) {}
}
function leerCola() {
  try {
    const raw = localStorage.getItem(KEY_COLA);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function guardarCola(q) {
  try { localStorage.setItem(KEY_COLA, JSON.stringify(q)); } catch (e) {}
}

function cacheVacio() {
  return { historial: [], leads: [], leadMagnets: [], transacciones: [], params: null };
}

// ---- resolución de proveedor ----
export function proveedorNube() {
  return provider && provider.nombre === 'sheets';
}

export function configurarBackend(ep, key) {
  configurarSheets(ep, key);
}

export async function dbIniciar() {
  const ep = CFG.SHEETS_ENDPOINT;
  const key = CFG.SHEETS_API_KEY;
  if (ep && key) {
    configurarSheets(ep, key);
    try {
      const p = crearSheetsProvider();
      await p.iniciar();
      if (p.configurado) {
        provider = p;
        return provider;
      }
    } catch (e) {
      // backend inalcanzable: modo local (la app sigue funcionando)
    }
  }
  provider = crearLocalProvider();
  await provider.iniciar();
  return provider;
}

// ---- cola offline (solo relevante en modo nube) ----
function encolar(accion, payload) {
  const q = leerCola();
  q.push({ accion, payload, fecha: new Date().toISOString() });
  guardarCola(q);
}

export async function dbSincronizarPendientes() {
  if (!proveedorNube()) { guardarCola([]); return 0; }
  const q = leerCola();
  if (!q.length) return 0;
  let ok = 0;
  for (const item of q.slice()) {
    try {
      await ejecutar(provider, item.accion, item.payload);
      q.splice(q.indexOf(item), 1);
      ok++;
    } catch (e) {
      break; // sigue offline; reintentará al volver la conexión
    }
  }
  guardarCola(q);
  return ok;
}

async function ejecutar(p, accion, payload) {
  switch (accion) {
    case 'guardarPost': return p.guardarPost(payload.post);
    case 'eliminarPost': return p.eliminarPost(payload.id);
    case 'actualizarMetricas': return p.actualizarMetricas(payload.id, payload.metricas);
    case 'crearLeadMagnet': return p.crearLeadMagnet(payload.lm);
    case 'capturarLead': return p.capturarLead(payload.lmId, payload.datos);
    case 'setPerfil': return p.setPerfil(payload.email, payload.perfil);
    case 'guardarParams': return p.guardarParams(payload.params);
    case 'comprarPlan': return p.comprarPlan(payload.plan, payload.email);
    case 'confirmarPago': return p.confirmarPago(payload.intentoId, payload.ref, payload.adminEmail);
    case 'agregarCreditos': return p.agregarCreditos(payload.email, payload.n, payload.motivo, payload.adminEmail);
    case 'cambiarActivo': return p.cambiarActivo(payload.email, payload.activo);
    case 'setRol': return p.setRol(payload.email, payload.rol, payload.adminEmail);
    default: throw new Error('Acción desconocida');
  }
}

// Operación con respaldo offline: intenta en el proveedor; si falla la red,
// encola y aplica optimista al caché.
async function mutar(accion, payload, aplicaCache) {
  try {
    const r = await ejecutar(provider, accion, payload);
    if (r && aplicaCache) aplicaCache(r);
    return r || { ok: true };
  } catch (e) {
    if (proveedorNube() && !navigator.onLine) {
      encolar(accion, payload);
      if (aplicaCache) aplicaCache({ ok: true });
      return { ok: true, offline: true };
    }
    throw e;
  }
}

// =====================================================
// API pública
// =====================================================

export const db = {
  nube: () => proveedorNube(),

  async login(email, pass) {
    const r = await provider.login(email, pass);
    if (r && r.ok && r.user) guardarSesion(r.user);
    return r;
  },

  async registro(datos) {
    const r = await provider.registro(datos);
    if (r && r.ok && r.user) guardarSesion(r.user);
    return r;
  },

  async sesion() {
    let s = obtenerSesion();
    if (!s) return null;
    // valida contra el proveedor (nube) o contra el estado local
    const v = await provider.sesion();
    return v && v.email ? v : null;
  },

  async cerrarSesion() {
    try { await provider.cerrarSesion(); } catch (e) {}
    limpiarSesion();
    return { ok: true };
  },

  // ---- estado (siempre desde caché; refresca desde provider en modo nube) ----
  async obtenerEstado(refrescar) {
    let c = leerCache() || cacheVacio();
    if (proveedorNube() && refrescar !== false) {
      try {
        const r = await provider.obtenerEstado();
        if (r) {
          c = {
            historial: r.historial || [],
            leads: r.leads || [],
            leadMagnets: r.leadMagnets || [],
            transacciones: r.transacciones || [],
            params: r.params || null,
          };
          guardarCache(c);
        }
      } catch (e) {
        // sin conexión: usa caché
      }
    }
    return c;
  },

  guardarCacheLocal(c) { guardarCache(c); },

  async creditos(email) {
    if (proveedorNube()) {
      try { return await provider.obtenerCreditos(email); } catch (e) { return 0; }
    }
    return provider.obtenerCreditos(email);
  },

  async consumirCredito(email, n) {
    const c = leerCache() || cacheVacio();
    try {
      const r = await provider.consumirCredito(email, n);
      return r;
    } catch (e) {
      if (proveedorNube() && !navigator.onLine) {
        encolar('consumirCredito', { email, n });
        return { ok: true, offline: true };
      }
      throw e;
    }
  },

  guardarPost(post) {
    const c = leerCache() || cacheVacio();
    c.historial.unshift(post);
    c.totalPosts = (c.totalPosts || 0) + 1;
    guardarCache(c);
    return mutar('guardarPost', { post });
  },

  eliminarPost(id) {
    const c = leerCache() || cacheVacio();
    c.historial = c.historial.filter((p) => p.id !== id);
    guardarCache(c);
    return mutar('eliminarPost', { id });
  },

  actualizarMetricas(id, metricas) {
    const c = leerCache() || cacheVacio();
    const p = c.historial.find((x) => x.id === id);
    if (p) { p.metricas = metricas; guardarCache(c); }
    return mutar('actualizarMetricas', { id, metricas });
  },

  crearLeadMagnet(lm) {
    const c = leerCache() || cacheVacio();
    c.leadMagnets.unshift(lm);
    guardarCache(c);
    return mutar('crearLeadMagnet', { lm });
  },

  async capturarLead(lmId, datos) {
    const r = await provider.capturarLead(lmId, datos);
    const c = leerCache() || cacheVacio();
    if (r && r.lead) {
      c.leads.unshift(r.lead);
      guardarCache(c);
    }
    return r;
  },

  async obtenerLmPublico(lmId) {
    return provider.obtenerLmPublico(lmId);
  },

  comprarPlan(plan, email) {
    return mutar('comprarPlan', { plan, email }, (r) => {
      if (r && r.intento) {
        const c = leerCache() || cacheVacio();
        c.transacciones.unshift(r.intento);
        guardarCache(c);
      }
    });
  },

  confirmarPago(intentoId, ref, adminEmail) {
    return mutar('confirmarPago', { intentoId, ref, adminEmail }, (r) => {
      if (r && r.t) {
        const c = leerCache() || cacheVacio();
        const t = c.transacciones.find((x) => x.id === r.t.id);
        if (t) Object.assign(t, r.t);
        guardarCache(c);
      }
    });
  },

  async listarUsuarios() { return provider.listarUsuarios(); },

  crearUsuarioAdmin(datos) { return provider.crearUsuarioAdmin(datos); },

  cambiarActivo(email, activo) { return provider.cambiarActivo(email, activo); },

  agregarCreditos(email, n, motivo, adminEmail) {
    return mutar('agregarCreditos', { email, n, motivo, adminEmail }, (r) => {
      if (r && r.cred !== undefined) {
        const c = leerCache() || cacheVacio();
        c.transacciones.unshift({ id: Date.now().toString(36), email, tipo: 'ajuste', monto: n, detalle: motivo + ' (admin)', fecha: new Date().toISOString() });
        guardarCache(c);
      }
    });
  },

  async setPerfil(email, perfil) {
    return mutar('setPerfil', { email, perfil }, (r) => {
      const s = obtenerSesion();
      if (s && s.email === email && perfil.nombreEmpresa) {
        s.empresa = perfil.nombreEmpresa;
        guardarSesion(s);
      }
    });
  },

  setRol(email, rol, adminEmail) { return provider.setRol(email, rol, adminEmail); },

  guardarParams(params) {
    const c = leerCache() || cacheVacio();
    c.params = params;
    guardarCache(c);
    return mutar('guardarParams', { params });
  },

  async params() {
    const c = leerCache();
    return c && c.params ? c.params : null;
  },

  async perfil(email) {
    try {
      const p = await provider.obtenerPerfil(email);
      if (p) {
        try { sessionStorage.setItem('ergox_perfil', JSON.stringify(p)); } catch (e) {}
        return p;
      }
    } catch (e) { /* usa caché local */ }
    try {
      const raw = sessionStorage.getItem('ergox_perfil');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  async resetLocal() {
    try { localStorage.removeItem(KEY_CACHE); } catch (e) {}
    try { localStorage.removeItem(KEY_COLA); } catch (e) {}
    try { localStorage.removeItem('ergox_state'); } catch (e) {}
    limpiarSesion();
  },
};

export async function dbArrancar() {
  await dbIniciar();
  window.addEventListener('online', () => {
    dbSincronizarPendientes().then((n) => {
      if (n > 0 && typeof toast !== 'undefined') {
        // notificación ligera (sin import circular)
      }
    });
  });
  return provider;
}