// =====================================================
// ERGOX POST — Proveedor Google Sheets (Apps Script REST)
// Requiere: CFG.SHEETS_ENDPOINT (URL /exec del Web App) y CFG.SHEETS_API_KEY.
// Contrato de acciones idéntico al backend/Code.gs.
// =====================================================

import { CFG } from '../config.js';

let endpoint = '';
let apiKey = '';

export function configurarSheets(ep, key) {
  endpoint = ep;
  apiKey = key;
}

export function sheetsDisponible() {
  return Boolean(endpoint && apiKey);
}

export async function llamar(action, payload, token) {
  const body = {
    key: apiKey,
    token: token || null,
    action,
    payload: payload || {},
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  const texto = await res.text();
  let data;
  try { data = JSON.parse(texto); } catch (e) { throw new Error('Respuesta inválida del backend'); }
  if (!data.ok) {
    const err = new Error(data.error || 'Error del backend');
    err.code = data.code || 'ERR';
    throw err;
  }
  return data.data;
}

export function crearSheetsProvider() {
  return {
    nombre: 'sheets',
    configurado: sheetsDisponible(),

    async iniciar() {
      if (!sheetsDisponible()) { this.configurado = false; return { ok: false }; }
      try {
        // ping de conectividad con acción pública (salt fake para email inexistente)
        await llamar('GET_SALT', { email: 'ping@verificacion.ergox' });
        this.configurado = true;
      } catch (e) {
        this.configurado = false;
      }
      return { ok: this.configurado };
    },

    async login(email, pass) {
      // dos pasos: salt público -> hash -> auth
      const salt = await llamar('GET_SALT', { email });
      const { sha256Hex } = await import('../core/security.js');
      const hash = await sha256Hex(String(salt.salt) + String(pass));
      return await llamar('AUTH', { email, hash });
    },

    async registro(datos) {
      const { sha256Hex } = await import('../core/security.js');
      const { generarSalt } = await import('../core/security.js');
      const salt = generarSalt();
      const hash = await sha256Hex(String(salt) + String(datos.pass));
      const r = await llamar('REGISTER', {
        email: datos.email, nombre: datos.nombre, empresa: datos.empresa,
        pais: datos.pais, ref: datos.ref || null, salt, hash,
      });
      return r.user ? { ok: true, user: r.user } : r;
    },

    async sesion() {
      const { obtenerSesion } = await import('./sesion.js');
      const s = obtenerSesion();
      if (!s || !s.token) return null;
      try {
        const r = await llamar('SESSION_RESTORE', {}, s.token);
        return r.user;
      } catch (e) {
        return null;
      }
    },

    async cerrarSesion() {
      const { obtenerSesion, limpiarSesion } = await import('./sesion.js');
      const s = obtenerSesion();
      if (s && s.token) { try { await llamar('LOGOUT', {}, s.token); } catch (e) {} }
      limpiarSesion();
      return { ok: true };
    },

    async obtenerEstado() {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('GET_STATE', {}, obtenerSesion().token);
    },

    async guardarPost(post) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('SAVE_POST', { post }, obtenerSesion().token);
    },

    async eliminarPost(id) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('DELETE_POST', { id }, obtenerSesion().token);
    },

    async actualizarMetricas(id, metricas) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('UPDATE_METRICAS', { id, metricas }, obtenerSesion().token);
    },

    async crearLeadMagnet(lm) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('CREATE_LM', { lm }, obtenerSesion().token);
    },

    async capturarLead(lmId, datos) {
      return await llamar('CAPTURE_LEAD', { lmId, datos });
    },

    async obtenerLmPublico(lmId) {
      return await llamar('GET_LM', { lmId });
    },

    async obtenerCreditos(email) {
      const { obtenerSesion } = await import('./sesion.js');
      const r = await llamar('GET_CREDITS', { email }, obtenerSesion().token);
      return r.cred;
    },

    async consumirCredito(email, n) {
      const { obtenerSesion } = await import('./sesion.js');
      const r = await llamar('CONSUME_CREDIT', { email, n, detalle: 'Publicación generada' }, obtenerSesion().token);
      return r.cred !== undefined ? { ok: true, cred: r.cred } : { ok: false, error: 'Créditos insuficientes' };
    },

    async comprarPlan(plan, email) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('BUY_PLAN', { plan, email }, obtenerSesion().token);
    },

    async confirmarPago(intentoId, ref, adminEmail) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('CONFIRM_PAYMENT', { intentoId, ref, adminEmail }, obtenerSesion().token);
    },

    async listarUsuarios() {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('ADMIN_LIST_USERS', {}, obtenerSesion().token);
    },

    async crearUsuarioAdmin(datos) {
      const { obtenerSesion } = await import('./sesion.js');
      const { sha256Hex, generarSalt } = await import('../core/security.js');
      const salt = generarSalt();
      const hash = await sha256Hex(String(salt) + String(datos.pass));
      return await llamar('ADMIN_CREATE_USER', { datos: { ...datos, salt, hash } }, obtenerSesion().token);
    },

    async cambiarActivo(email, activo) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('ADMIN_TOGGLE_ACTIVE', { email, activo }, obtenerSesion().token);
    },

    async agregarCreditos(email, n, motivo, adminEmail) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('ADMIN_ADD_CREDITS', { email, n, motivo, adminEmail }, obtenerSesion().token);
    },

    async setPerfil(email, perfil) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('SET_PERFIL', { perfil }, obtenerSesion().token);
    },

    async obtenerPerfil(email) {
      const { obtenerSesion } = await import('./sesion.js');
      const r = await llamar('GET_STATE', {}, obtenerSesion().token);
      return r.perfil || null;
    },

    async setRol(email, rol, adminEmail) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('ADMIN_SET_ROL', { email, rol, adminEmail }, obtenerSesion().token);
    },

    async guardarParams(params) {
      const { obtenerSesion } = await import('./sesion.js');
      return await llamar('SET_PARAMS', { params }, obtenerSesion().token);
    },

    async lineamiento() {
      return { pagos: 'PENDIENTE' };
    },
  };
}