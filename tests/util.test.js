import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escHtml, fmtNum, diasRestantes, urlValida, esEmailValido, passFuerte, onlyDigits, toCsv } from '../js/core/util.js';

test('escHtml escapa caracteres peligrosos', () => {
  assert.equal(escHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escHtml('"&\''), '&quot;&amp;&#39;');
  assert.equal(escHtml(null), '');
});

test('urlValida solo acepta http/https', () => {
  assert.equal(urlValida('https://x.com/a.png'), true);
  assert.equal(urlValida('http://x.com'), true);
  assert.equal(urlValida('javascript:alert(1)'), false);
  assert.equal(urlValida('ftp://x.com'), false);
  assert.equal(urlValida(''), false);
});

test('validaciones de email y contraseña', () => {
  assert.equal(esEmailValido('a@b.co'), true);
  assert.equal(esEmailValido('abc'), false);
  assert.equal(passFuerte('Admin2026!'), true);
  assert.equal(passFuerte('12345678'), false);
  assert.equal(passFuerte('abcdefgh'), false);
  assert.equal(passFuerte('corto1'), false);
});

test('diasRestantes calcula diferencia', () => {
  const manana = new Date(Date.now() + 24 * 3600 * 1000);
  const iso = manana.toISOString().slice(0, 10);
  assert.ok(diasRestantes(iso) >= 0 && diasRestantes(iso) <= 2);
});

test('toCsv escapa comas/puntos y comas con comillas', () => {
  const csv = toCsv([['a;b', 'c'], ['x"y', 'z']]);
  assert.match(csv, /"a;b"/);
});

test('onlyDigits limpia teléfonos', () => {
  assert.equal(onlyDigits('+58 412-123 4567'), '584121234567');
});

test('fmtNum formatea números', () => {
  assert.ok(fmtNum(1523500).length > 0);
});