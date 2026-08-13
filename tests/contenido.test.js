import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NORMATIVAS, PLANES, montosTexto, valorAnual, generarObligaciones, plantilla, hashtags, PARAMS_DEFAULT, MEJORES_HORARIOS } from '../js/content/datos.js';

test('existen los 6 países con normativa', () => {
  for (const p of ['VE', 'CO', 'MX', 'PE', 'AR', 'CL']) {
    assert.ok(NORMATIVAS[p], 'falta ' + p);
    assert.ok(NORMATIVAS[p].leyes.length >= 2, 'leyes ' + p);
    assert.ok(NORMATIVAS[p].temas.length >= 4, 'temas ' + p);
  }
});

test('temas incluyen ergonomía (ADN ERGOX)', () => {
  const temasVE = NORMATIVAS.VE.temas.map((t) => t.tema.toLowerCase()).join(' ');
  assert.match(temasVE, /ergonom|pausas activas|cargas/);
});

test('planes coherentes en precio por crédito', () => {
  for (const p of PLANES) {
    assert.ok(p.creditos > 0);
    assert.ok(p.precio / p.creditos < 2, 'precio por post razonable');
  }
});

test('montosTexto produce montos dinámicos por año', () => {
  const texto = montosTexto('CO', PARAMS_DEFAULT, 2026);
  assert.match(texto, /hasta/);
  assert.match(texto, /\d/);
  const ve = montosTexto('VE', PARAMS_DEFAULT, 2026);
  assert.match(ve, /UT/);
  const ar = montosTexto('AR', PARAMS_DEFAULT, 2026);
  assert.match(ar, /multas/);
});

test('valorAnual cae al último año disponible', () => {
  assert.equal(valorAnual('smmlv', 2027, PARAMS_DEFAULT), 1523500);
  assert.equal(valorAnual('smmlv', 2024, PARAMS_DEFAULT), null);
});

test('calendario genera obligaciones recurrentes del año actual', () => {
  const o = generarObligaciones('VE');
  assert.ok(o.length >= 4, 'al menos 4 obligaciones VE');
  for (const e of o) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(e.fecha), 'fecha ISO ' + e.fecha);
    assert.ok(e.titulo && e.ley && e.urgencia);
  }
  const oCo = generarObligaciones('CO');
  assert.ok(oCo.length >= 3);
});

test('plantilla genera texto con empresa, multa y disclaimer', () => {
  const ctx = {
    tema: 'Pausas activas',
    empresa: 'Empresa X',
    norm: NORMATIVAS.VE,
    rifLabel: 'RIF', rif: 'J-1', dir: 'Caracas', tel: '', email: '', contacto: '',
    multa: montosTexto('VE', PARAMS_DEFAULT),
    disclaimer: '*informativo',
  };
  const txt = plantilla('VE', 'conciencia', 'Pausas activas', ctx);
  assert.match(txt, /Empresa X/);
  assert.match(txt, /Pausas activas/);
  assert.match(txt, /\*informativo/);
  assert.match(txt, /UT/);
});

test('hashtags por tipo', () => {
  const h = hashtags('MX', 'conciencia');
  assert.ok(h.includes('#México'.replace('é', 'é')) || h.length >= 5);
  assert.ok(h.includes('#SST'));
});

test('mejores horarios disponibles para las 5 redes', () => {
  for (const r of ['instagram', 'facebook', 'linkedin', 'tiktok', 'whatsapp']) {
    assert.ok(MEJORES_HORARIOS[r].length >= 1, r);
  }
});