// =====================================================
// ERGOX POST — Utilidades puras (testeables en Node)
// =====================================================

export function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('es-VE');
}

export function fmtMoney(n, moneda) {
  const v = Number(n || 0);
  return (moneda ? moneda + ' ' : '$') + v.toFixed(2).replace('.', ',');
}

export function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtFechaCorta(d) {
  if (!d) return '—';
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
}

export function diasRestantes(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const t = new Date(fecha);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((t - hoy) / (1000 * 60 * 60 * 24));
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function onlyDigits(s) {
  return String(s || '').replace(/[^\d]/g, '');
}

export function urlValida(url) {
  try {
    const u = new URL(String(url || ''));
    return (u.protocol === 'http:' || u.protocol === 'https:');
  } catch (e) {
    return false;
  }
}

export function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

// Fuerza mínimo de contraseña: >= 8 chars, letra, número
export function passFuerte(pass) {
  const p = String(pass || '');
  return p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

// ---- DOM (solo navegador) ----

export function qs(sel, root) {
  return (root || document).querySelector(sel);
}

export function qsa(sel, root) {
  return Array.from((root || document).querySelectorAll(sel));
}

export function on(sel, ev, fn, root) {
  qsa(sel, root).forEach((el) => el.addEventListener(ev, fn));
}

// ---- Toast ----
export function toast(msg, tipo, opts) {
  if (typeof document === 'undefined') return;
  const o = opts || {};
  tipo = tipo || 'success';
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast toast-' + tipo;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.innerHTML = '<span>' + (icons[tipo] || '') + '</span><span></span>';
  el.querySelector('span:last-child').textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, o.duration || 3500);
}

// ---- Descarga de archivos ----
export function descargarTexto(contenido, nombre, mime) {
  const blob = new Blob([contenido], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function descargarDataUrl(dataUrl, nombre) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = nombre;
  a.click();
}

export function toCsv(filas) {
  if (!filas.length) return '';
  const cab = filas[0].map(escCsv);
  const lineas = filas.map((f) => f.map(escCsv).join(';'));
  return [cab.join(';')].concat(lineas).join('\r\n');
  function escCsv(v) {
    const s = String(v === undefined || v === null ? '' : v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
}

// ---- Copiar al portapapeles ----
export async function copiar(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  } catch (e) {
    return false;
  }
}