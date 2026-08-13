// =====================================================
// ERGOX POST — Proveedor local (demo / offline)
// Implementa el contrato de db.js con almacenamiento localStorage.
// Acepta un adaptador de almacenamiento inyectado (testeable en Node).
// =====================================================

import { CFG } from '../config.js';
import { aplicarMigraciones, perfilDefault } from '../core/migrations.js';
import { hashPassword, generarSalt } from '../core/security.js';
import { uid } from '../core/util.js';

const KEY = 'ergox_state';
const KEY_SESION = 'ergox_sesion';

function makeStorage(adapter) {
  if (adapter) return adapter;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

export function crearLocalProvider(adapter) {
  const storage = makeStorage(adapter);

  // ---- persistencia ----
  function leer() {
    if (!storage) return null;
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function escribir(estado) {
    if (!storage) return;
    try { storage.setItem(KEY, JSON.stringify(estado)); } catch (e) { /* cuota llena */ }
  }

  // estado vivo (cargado una sola vez al crear el proveedor)
  let estado = cargar();

  function estadoBase() {
    const s = {
      _version: CFG.VERSION,
      usuarios: {},
      historial: [],
      leads: [],
      leadMagnets: [],
      transacciones: [],
      params: null,
      totalPosts: 0,
    };
    // credenciales demo
    const adminSalt = generarSalt();
    const emSalt = generarSalt();
    s.usuarios['admin@ergox.com'] = {
      nombre: 'Admin ERGOX', rol: 'ADMIN', empresa: 'Plataforma', cred: 1000,
      hash: 'seed', salt: adminSalt, perfil: perfilDefault(), creado: new Date().toISOString(), activo: true, seedEmail: 'admin@ergox.com',
    };
    s.usuarios['empresa@ergox.com'] = {
      nombre: 'Constructora Venezuela', rol: 'EDITOR', empresa: 'Constructora Ávila C.A.', cred: 100,
      hash: 'seed', salt: emSalt, perfil: perfilDefault(), creado: new Date().toISOString(), activo: true, seedEmail: 'empresa@ergox.com',
    };
    return s;
  }

  function cargar() {
    const raw = leer();
    if (!raw) return estadoBase();
    const { estado, migrado } = aplicarMigraciones(raw, CFG.VERSION, ['2.0', '3.0']);
    if (!estado) return estadoBase();
    if (migrado) escribir(estado);
    return estado;
  }

  // Los usuarios demo se resuelven por credenciales seed (ver credencialesValidas).

  // ref para legado v2 (pass en claro)
  async function credencialesValidas(email, pass) {
    const u = estado.usuarios[email];
    if (!u || u.activo === false) return false;
    if (u.seedEmail) {
      const cfg = email === CFG.DEMO_ADMIN.email ? CFG.DEMO_ADMIN : CFG.DEMO_EMPRESA;
      if ((u.seedEmail === CFG.DEMO_ADMIN.email) && pass === CFG.DEMO_ADMIN.pass) return true;
      if ((u.seedEmail === CFG.DEMO_EMPRESA.email) && pass === CFG.DEMO_EMPRESA.pass) return true;
      return false;
    }
    if (u.hash && u.hash !== 'seed') {
      const h = await hashPassword(pass, u.salt);
      return h === u.hash;
    }
    // legado v2: pass en claro pendiente de hashear en el primer login
    if (u.legacyPass && u.pass && u.pass === pass) {
      const salt = generarSalt();
      u.hash = await hashPassword(pass, salt);
      u.salt = salt;
      u.legacyPass = false;
      delete u.pass;
      escribir(estado);
      return true;
    }
    return false;
  }

  return {
    nombre: 'local',
    configurado: true,

    async iniciar() { return { ok: true }; },

    async login(email, pass) {
      if (await credencialesValidas(email, pass)) {
        const u = estado.usuarios[email];
        const sesion = { email, nombre: u.nombre, rol: u.rol, empresa: u.empresa, token: uid() + uid() };
        if (storage) storage.setItem(KEY_SESION, JSON.stringify(sesion));
        return { ok: true, user: sesion };
      }
      return { ok: false, error: 'Credenciales inválidas' };
    },

    async registro(datos) {
      const email = String(datos.email || '').trim().toLowerCase();
      if (estado.usuarios[email]) return { ok: false, error: 'Ese email ya está registrado' };
      const salt = generarSalt();
      const u = {
        nombre: datos.nombre || email.split('@')[0],
        rol: 'EDITOR',
        empresa: datos.empresa || datos.nombre || 'Mi Empresa',
        cred: CFG.CREDITOS_TRIAL,
        hash: await hashPassword(datos.pass, salt),
        salt,
        perfil: { ...perfilDefault(), nombreEmpresa: datos.empresa || '', pais: datos.pais || 'VE' },
        creado: new Date().toISOString(),
        activo: true,
        referidoPor: datos.ref || null,
        refCode: uid().slice(0, 8),
      };
      estado.usuarios[email] = u;
      registrarTransaccion(email, 'trial', CFG.CREDITOS_TRIAL, 'Créditos de bienvenida');
      if (datos.ref && estado.usuarios[datos.ref]) {
        estado.usuarios[datos.ref].cred += CFG.CREDITOS_REFERENTE;
        registrarTransaccion(datos.ref, 'referido', CFG.CREDITOS_REFERENTE, 'Referido: ' + email);
      }
      escribir(estado);
      return await this.login(email, datos.pass);
    },

    async sesion() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(KEY_SESION);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!estado.usuarios[s.email] || estado.usuarios[s.email].activo === false) return null;
        return s;
      } catch (e) { return null; }
    },

    async cerrarSesion() {
      if (storage) storage.removeItem(KEY_SESION);
      return { ok: true };
    },

    // ---- estado de negocio ----
    async obtenerEstado() {
      return {
        historial: estado.historial,
        leads: estado.leads,
        leadMagnets: estado.leadMagnets,
        totalPosts: estado.totalPosts,
        transacciones: estado.transacciones,
        params: estado.params,
      };
    },

    async guardarPost(post) {
      estado.historial.unshift(post);
      estado.totalPosts = (estado.totalPosts || 0) + 1;
      escribir(estado);
      return { ok: true };
    },

    async eliminarPost(id) {
      const i = estado.historial.findIndex((p) => p.id === id);
      if (i !== -1) estado.historial.splice(i, 1);
      escribir(estado);
      return { ok: true };
    },

    async actualizarMetricas(id, metricas) {
      const p = estado.historial.find((x) => x.id === id);
      if (p) { p.metricas = metricas; escribir(estado); }
      return { ok: true };
    },

    async crearLeadMagnet(lm) {
      estado.leadMagnets.push(lm);
      escribir(estado);
      return { ok: true, lm };
    },

    async capturarLead(lmId, datos) {      const lm = estado.leadMagnets.find((x) => x.id === lmId);
      if (!lm) return { ok: false, error: 'Recurso no encontrado' };
      const lead = {
        id: uid(),
        lmId,
        recurso: lm.titulo,
        email: datos.email,
        nombre: datos.nombre || '',
        empresa: datos.empresa || '',
        telefono: datos.telefono || '',
        consentimiento: datos.consent ? 'si:' + new Date().toISOString().slice(0, 10) : 'no',
        fecha: new Date().toISOString(),
      };
      estado.leads.unshift(lead);
      escribir(estado);
      return { ok: true, lead };
    },

    async obtenerLmPublico(lmId) {
      const lm = estado.leadMagnets.find((x) => x.id === lmId);
      return lm ? { ok: true, lm: { id: lm.id, titulo: lm.titulo, url: lm.url } } : { ok: false, error: 'Recurso no encontrado' };
    },

    // ---- créditos ----
    async obtenerCreditos(email) {
      const u = estado.usuarios[email];
      return u ? u.cred : 0;
    },

    async consumirCredito(email, n) {
      const u = estado.usuarios[email];
      if (!u || u.cred < (n || 1)) return { ok: false, error: 'Créditos insuficientes' };
      u.cred -= (n || 1);
      registrarTransaccion(email, 'post', -(n || 1), 'Publicación generada');
      escribir(estado);
      return { ok: true, cred: u.cred };
    },

    async comprarPlan(plan, email) {
      const intento = {
        id: uid(), email, planId: plan.id, montoUsd: plan.precio, creditos: plan.creditos,
        estado: 'PENDIENTE', fecha: new Date().toISOString(), ref: '',
      };
      estado.transacciones.unshift(intento);
      escribir(estado);
      return { ok: true, intento };
    },

    async confirmarPago(intentoId, ref, adminEmail) {
      const t = estado.transacciones.find((x) => x.id === intentoId);
      if (!t) return { ok: false, error: 'Transacción no encontrada' };
      if (t.estado === 'PAGADO') return { ok: true, t };
      t.estado = 'PAGADO';
      t.ref = ref;
      t.confirmadoPor = adminEmail;
      t.confirmado = new Date().toISOString();
      const u = estado.usuarios[t.email];
      if (u) {
        u.cred += t.creditos;
        registrarTransaccion(t.email, 'compra', t.creditos, 'Compra ' + t.planId + ' (ref ' + ref + ')');
      }
      escribir(estado);
      return { ok: true, t };
    },

    // ---- admin ----
    async listarUsuarios() {
      return Object.keys(estado.usuarios).map((email) => ({
        email,
        nombre: estado.usuarios[email].nombre,
        rol: estado.usuarios[email].rol,
        empresa: estado.usuarios[email].empresa,
        cred: estado.usuarios[email].cred,
        activo: estado.usuarios[email].activo !== false,
        creado: estado.usuarios[email].creado,
      }));
    },

    async crearUsuarioAdmin(datos) {
      const email = String(datos.email || '').trim().toLowerCase();
      if (estado.usuarios[email]) return { ok: false, error: 'Email ya registrado' };
      const salt = generarSalt();
      estado.usuarios[email] = {
        nombre: datos.nombre, rol: datos.rol || 'EDITOR', empresa: datos.empresa || datos.nombre,
        cred: datos.cred || 0, hash: await hashPassword(datos.pass, salt), salt,
        perfil: { ...perfilDefault(), nombreEmpresa: datos.empresa || '' },
        creado: new Date().toISOString(), activo: true,
      };
      escribir(estado);
      return { ok: true };
    },

    async cambiarActivo(email, activo) {
      const u = estado.usuarios[email];
      if (!u) return { ok: false, error: 'Usuario no existe' };
      u.activo = activo;
      escribir(estado);
      if (!activo && storage) {
        try {
          const s = JSON.parse(storage.getItem(KEY_SESION) || 'null');
          if (s && s.email === email) storage.removeItem(KEY_SESION);
        } catch (e) {}
      }
      return { ok: true };
    },

    async agregarCreditos(email, n, motivo, adminEmail) {
      const u = estado.usuarios[email];
      if (!u) return { ok: false, error: 'Usuario no existe' };
      u.cred += n;
      registrarTransaccion(email, motivo === 'compra' ? 'compra' : 'ajuste', n, (motivo || 'Ajuste de admin') + (adminEmail ? ' por ' + adminEmail : ''));
      escribir(estado);
      return { ok: true, cred: u.cred };
    },

    async setPerfil(email, perfil) {
      const u = estado.usuarios[email];
      if (!u) return { ok: false };
      u.perfil = perfil;
      if (perfil.nombreEmpresa) u.empresa = perfil.nombreEmpresa;
      escribir(estado);
      return { ok: true };
    },

    async obtenerPerfil(email) {
      const u = estado.usuarios[email];
      return u && u.perfil ? u.perfil : perfilDefault();
    },

    async guardarParams(params) {
      estado.params = params;
      escribir(estado);
      return { ok: true };
    },

    async setRol(email, rol, adminEmail) {
      const u = estado.usuarios[email];
      if (!u) return { ok: false };
      u.rol = rol;
      escribir(estado);
      return { ok: true };
    },

    async lineamiento() { return {}; },
  };

  function registrarTransaccion(email, tipo, monto, detalle) {
    estado.transacciones.unshift({
      id: uid(), email, tipo, monto, detalle, fecha: new Date().toISOString(),
    });
  }
}