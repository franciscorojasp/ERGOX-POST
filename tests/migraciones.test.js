import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarMigraciones, perfilDefault } from '../js/core/migrations.js';

test('estado v2 migra a v3 sin perder historial', () => {
  const v2 = {
    _version: '2.0',
    usuarios: {
      'a@b.com': { nombre: 'A', rol: 'EDITOR', pass: '123456', empresa: 'X', cred: 10, perfil: null },
    },
    historial: [{ id: 'h1', caption: 'hola' }],
    leads: [{ email: 'l@l.com', recurso: 'r' }],
    leadMagnets: [{ id: 'lm1' }],
    totalPosts: 1,
  };
  const { estado, migrado } = aplicarMigraciones(v2, '3.0', ['2.0', '3.0']);
  assert.equal(migrado, true);
  assert.equal(estado._version, '3.0');
  assert.equal(estado.historial.length, 1);
  assert.equal(estado.usuarios['a@b.com'].legacyPass, true);
  assert.deepEqual(estado.usuarios['a@b.com'].perfil, perfilDefault());
  assert.deepEqual(estado.transacciones, []);
  assert.equal(estado.leads[0].consentimiento, 'legacy-v2');
});

test('estado ya en v3 no se migra', () => {
  const v3 = { _version: '3.0', historial: [] };
  const { migrado } = aplicarMigraciones(v3, '3.0', ['2.0', '3.0']);
  assert.equal(migrado, false);
});

test('estado vacío devuelve null (no corromper)', () => {
  const { estado } = aplicarMigraciones(null, '3.0', ['2.0', '3.0']);
  assert.equal(estado, null);
});