import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearLocalProvider } from '../js/providers/local.js';
import { hashPassword } from '../js/core/security.js';

// adaptador de almacenamiento en memoria
function memoria() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('flujo completo local: login demo, registro, créditos, post, lead magnet, lead', async () => {
  const p = crearLocalProvider(memoria());

  // demo admin
  const r1 = await p.login('admin@ergox.com', 'Admin2026!');
  assert.equal(r1.ok, true);
  assert.equal(r1.user.rol, 'ADMIN');

  // registro nuevo usuario con trial
  const reg = await p.registro({ nombre: 'Mi Empresa', email: 'cliente@x.com', pass: 'Clave1234', pais: 'CO' });
  assert.equal(reg.ok, true);
  assert.equal(reg.user.rol, 'EDITOR');
  let cred = await p.obtenerCreditos('cliente@x.com');
  assert.equal(cred, 10, 'trial de 10 créditos');

  // consumir crédito
  const cons = await p.consumirCredito('cliente@x.com', 1);
  assert.equal(cons.cred, 9);

  // post
  const post = { id: 'p1', caption: 'hola', hashtags: ['#SST'], tipo: 'educativo', pais: 'CO', fecha: new Date().toISOString() };
  await p.guardarPost(post);
  const estado = await p.obtenerEstado();
  assert.equal(estado.historial.length, 1);

  // lead magnet + captura de lead con consentimiento
  const lm = await p.crearLeadMagnet({ id: 'lm1', titulo: 'Checklist', url: 'https://x.com/a.pdf', creado: new Date().toISOString() });
  assert.equal(lm.ok, true);
  const lr = await p.capturarLead('lm1', { email: 'lead@y.com', nombre: 'N', consent: true });
  assert.equal(lr.ok, true);
  assert.match(lr.lead.consentimiento, /^si:/);

  // obtenerLmPublico
  const pub = await p.obtenerLmPublico('lm1');
  assert.equal(pub.lm.titulo, 'Checklist');

  // compra + confirmación admin
  const compra = await p.comprarPlan({ id: 'profesional', precio: 39.99, creditos: 50 }, 'cliente@x.com');
  assert.equal(compra.intento.estado, 'PENDIENTE');
  const conf = await p.confirmarPago(compra.intento.id, 'REF-1', 'admin@ergox.com');
  assert.equal(conf.t.estado, 'PAGADO');
  cred = await p.obtenerCreditos('cliente@x.com');
  assert.equal(cred, 9 + 50);

  // contraseña incorrecta rechazada
  const mal = await p.login('cliente@x.com', 'MalaClave1');
  assert.equal(mal.ok, false);
});

test('login falla con usuario inexistente', async () => {
  const p = crearLocalProvider(memoria());
  const r = await p.login('nadie@x.com', 'cualquiera1');
  assert.equal(r.ok, false);
});

test('hashPassword es determinista y depende del salt', async () => {
  const a = await hashPassword('Clave1234', 'salt1');
  const b = await hashPassword('Clave1234', 'salt1');
  const c = await hashPassword('Clave1234', 'salt2');
  assert.equal(a, b);
  assert.notEqual(a, c);
});