// =====================================================
// ERGOX POST — Tasas de cambio (APIs gratuitas + override manual)
// USD -> moneda local por país, con caché en localStorage.
// =====================================================

import { CFG } from '../config.js';
import { PARAMS_DEFAULT } from '../content/datos.js';

const KEY_CACHE = 'ergox_tasas_cache';
const VES_DEFAULT = 80;    // respaldo conservador si no hay API ni override
const POR_PAIS = { VE: 'ves', CO: 'cop', MX: 'mxn', PE: 'pen', AR: 'ars', CL: 'clp' };

let enMemoria = null;

async function fetchConTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function leerCache() {
  try {
    const raw = localStorage.getItem(KEY_CACHE);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Date.now() - c.ts < CFG.TASAS_CACHE_MIN * 60000) return c.datos;
    return null;
  } catch (e) { return null; }
}

function guardarCache(datos) {
  try { localStorage.setItem(KEY_CACHE, JSON.stringify({ ts: Date.now(), datos })); } catch (e) {}
}

// Tasas manuales definidas por el admin (params.tasasManual)
function tasasManuales(params) {
  const p = params || PARAMS_DEFAULT;
  const m = p.tasasManual || {};
  const out = {};
  if (m.ves) out.ves = Number(m.ves);
  if (m.cop) out.cop = Number(m.cop);
  if (m.mxn) out.mxn = Number(m.mxn);
  if (m.pen) out.pen = Number(m.pen);
  if (m.ars) out.ars = Number(m.ars);
  if (m.clp) out.clp = Number(m.clp);
  return out;
}

export async function obtenerTasas(params) {
  if (enMemoria) return enMemoria;
  const manual = tasasManuales(params);
  const cache = leerCache();
  if (cache) { enMemoria = { ...manual, ...cache }; return enMemoria; }

  const tasas = {};
  // USD -> VES (dolarapi.com)
  try {
    const d = await fetchConTimeout(CFG.TASAS_URL_DOLARAPI, 6000);
    if (d && d.venta) tasas.ves = Number(d.venta);
  } catch (e) {}
  // USD -> resto (open.er-api)
  if (tasas.ves === undefined) {
    try {
      const r = await fetchConTimeout(CFG.TASAS_URL_ERAPI, 6000);
      if (r && r.rates) {
        for (const [k, v] of Object.entries(POR_PAIS)) {
          if (v === 'ves') continue;
          const rk = k === 'CL' ? 'CLP' : k === 'AR' ? 'ARS' : k === 'PE' ? 'PEN' : k === 'MX' ? 'MXN' : 'COP';
          if (r.rates[rk]) tasas[v] = Number(r.rates[rk]);
        }
      }
    } catch (e) {}
  }

  const final = { ...manual, ...tasas };
  if (!final.ves) final.ves = VES_DEFAULT;
  enMemoria = final;
  guardarCache(final);
  return final;
}

export function monedaDePais(pais) {
  return POR_PAIS[pais] || 'ves';
}