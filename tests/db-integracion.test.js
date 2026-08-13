import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// polyfill mínimo de localStorage para Node
function polyfillStorage() {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.window = { addEventListener: () => {} };
  if (!globalThis.navigator) globalThis.navigator = {};
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
}

let db;

before(async () => {
  polyfillStorage();
  db = await import('../js/core/db.js');
  await db.dbIniciar();
});

test('flujo end-to-end a través del contrato db', async () => {
  assert.equal(db.db.nube(), false, 'sin endpoint → modo local');

  // registro
  const reg = await db.db.registro({ nombre: 'Clínica Salud', email: 'clinica@x.com', pass: 'Clave1234', pais: 'PE', ref: '' });
  assert.equal(reg.ok, true);
  assert.equal(reg.user.rol, 'EDITOR');

  // sesión persistente
  const sesion = await db.db.sesion();
  assert.equal(sesion.email, 'clinica@x.com');

  // créditos trial
  let cred = await db.db.creditos('clinica@x.com');
  assert.equal(cred, 10);

  // consumir crédito y guardar post
  const cons = await db.db.consumirCredito('clinica@x.com', 1);
  assert.equal(cons.cred, 9);
  const post = { id: 'p-e2e', caption: 'test', tema: 'T', tipo: 'educativo', pais: 'PE', hashtags: ['#SST'], fecha: new Date().toISOString() };
  await db.db.guardarPost(post);

  // estado via caché
  const estado = await db.db.obtenerEstado();
  assert.equal(estado.historial[0].id, 'p-e2e');

  // lead magnet público (landing)
  const lm = { id: 'lm-e2e', titulo: 'Guía', url: 'https://x.com/g.pdf', leads: 0, creado: new Date().toISOString() };
  await db.db.crearLeadMagnet(lm);
  const pub = await db.db.obtenerLmPublico('lm-e2e');
  assert.equal(pub.lm.titulo, 'Guía');
  const lead = await db.db.capturarLead('lm-e2e', { nombre: 'Ana', email: 'ana@z.com', consent: true });
  assert.equal(lead.ok, true);

  // compra + confirmación admin
  const compra = await db.db.comprarPlan({ id: 'starter', precio: 9.99, creditos: 10 }, 'clinica@x.com');
  assert.equal(compra.intento.estado, 'PENDIENTE');
  await db.db.confirmarPago(compra.intento.id, 'REF-X', 'admin@ergox.com');
  cred = await db.db.creditos('clinica@x.com');
  assert.equal(cred, 9 + 10);

  // perfil
  const perfil = await db.db.perfil('clinica@x.com');
  assert.ok(perfil);
  await db.db.setPerfil('clinica@x.com', { ...perfil, nombreEmpresa: 'Clínica Salud S.A.C.', telefono: '+51 999888777' });
  const perfil2 = await db.db.perfil('clinica@x.com');
  assert.equal(perfil2.telefono, '+51 999888777');

  // logout y cierre de sesión
  await db.db.cerrarSesion();
  const sesionFinal = await db.db.sesion();
  assert.equal(sesionFinal, null);
});