// =====================================================
// ERGOX POST — Placa visual (canvas, sin dependencias)
// Contrato: renderPlacaCard(container, ctx), renderPlaca(opts)
// ctx = { post, perfil, norm }
// Mejoras: 3 layouts (clásico/minimal/corporativo),
// paleta por país, 3 aspectos (feed/story/cuadrado),
// logo robusto, texto adaptativo, copiar texto y a11y.
// =====================================================

import { toast, descargarDataUrl, copiar } from '../core/util.js';
import { NORMATIVAS } from '../content/datos.js';

const ASPECTOS = {
  feed: [1080, 1350],
  story: [1080, 1920],
  cuadrado: [1080, 1080],
};

const OPCIONES_ASPECTO = [
  { id: 'feed', label: 'Feed', icon: '📱' },
  { id: 'story', label: 'Story', icon: '📖' },
  { id: 'cuadrado', label: 'Cuadrado', icon: '⬜' },
];

const LAYOUTS = [
  { id: 'clasico', label: 'Clásico', icon: '🎨' },
  { id: 'minimal', label: 'Minimal', icon: '🤍' },
  { id: 'oscuro', label: 'Corporativo', icon: '🌑' },
];

// Paleta por país según normativa: VE ámbar, CO azul, MX púrpura,
// PE verde, AR celeste, CL rojo.
const PALETAS_PAIS = {
  VE: { principal: '#EAB308', profundo: '#92400E', claro: '#FEF3C7', contraste: '#78350F' },
  CO: { principal: '#2563EB', profundo: '#1E3A8A', claro: '#DBEAFE', contraste: '#1E40AF' },
  MX: { principal: '#7C3AED', profundo: '#4C1D95', claro: '#EDE9FE', contraste: '#5B21B6' },
  PE: { principal: '#059669', profundo: '#065F46', claro: '#D1FAE5', contraste: '#047857' },
  AR: { principal: '#0EA5E9', profundo: '#075985', claro: '#E0F2FE', contraste: '#075985' },
  CL: { principal: '#DC2626', profundo: '#7F1D1D', claro: '#FEE2E2', contraste: '#991B1B' },
};

// -----------------------------------------------------
// Utilidades de canvas
// -----------------------------------------------------

function redondear(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function envolver(ctx, texto, maxAncho) {
  const lineas = [];
  let actual = '';
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  for (const palabra of palabras) {
    let p = palabra;
    // palabra única más ancha que el área: cortar por caracteres
    while (ctx.measureText(p).width > maxAncho && p.length > 1) {
      let lo = 1, hi = p.length, mejor = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (ctx.measureText(p.slice(0, mid)).width <= maxAncho) { mejor = mid; lo = mid + 1; }
        else hi = mid - 1;
      }
      if (mejor < 1) break;
      if (actual) { lineas.push(actual); actual = ''; }
      lineas.push(p.slice(0, mejor));
      p = p.slice(mejor);
    }
    const prueba = actual ? actual + ' ' + p : p;
    if (actual && ctx.measureText(prueba).width > maxAncho) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// Envuelve el texto y lo recorta adaptativamente con "…" hasta caber en maxLineas.
function encajar(ctx, texto, maxAncho, maxLineas) {
  let t = String(texto || '').trim() || ' ';
  let recortado = false;
  while (t.length > 1) {
    const lineas = envolver(ctx, t, maxAncho);
    if (lineas.length <= maxLineas) {
      const out = lineas.slice(0, maxLineas);
      if (recortado && out.length) out[out.length - 1] = out[out.length - 1] + ' …';
      return out;
    }
    recortado = true;
    t = t.slice(0, Math.floor(t.length * 0.9)).replace(/\s+\S*$/, '');
  }
  return [t + (recortado ? ' …' : '')];
}

function cargarImagen(url) {
  if (!url) return Promise.resolve(null);
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => res(null); // error silencioso: la placa se genera igual
    img.src = url;
  });
}

function dibujarLogo(ctx, logo, x, y, tam, radio) {
  if (!logo || !logo.width) return;
  ctx.save();
  ctx.globalAlpha = 0.95;
  redondear(ctx, x, y, tam, tam, radio);
  ctx.clip();
  ctx.drawImage(logo, x, y, tam, tam);
  ctx.restore();
}

function paisDeNorma(norm) {
  if (!norm) return 'VE';
  if (norm.id && PALETAS_PAIS[norm.id]) return norm.id;
  for (const k of Object.keys(NORMATIVAS)) {
    if (norm.nombre && NORMATIVAS[k].nombre === norm.nombre) return k;
  }
  return 'VE';
}

function armarDatos(opt) {
  const post = opt.post || {};
  const perfil = opt.perfil || {};
  const norm = opt.norm || {};
  const pais = paisDeNorma(norm);
  const paleta = PALETAS_PAIS[pais] || PALETAS_PAIS.VE;
  let tags = Array.isArray(post.hashtags)
    ? post.hashtags
    : String(post.hashtags || '').split(/\s+/).filter(Boolean);
  tags = tags.slice(0, 4);
  return {
    pais,
    paleta,
    norm,
    titulo: String(post.tema || 'Seguridad y Salud en el Trabajo').toUpperCase(),
    caption: String(post.caption || 'Protegemos a tu equipo con información verificada de Seguridad y Salud en el Trabajo.'),
    empresa: perfil.nombreEmpresa || 'Tu Empresa',
    hashtags: tags,
    logoUrl: perfil.logoUrl || perfil.logo || '',
    nombreNorm: norm.nombre || 'SST',
    flag: norm.flag || '🛡️',
  };
}

function leerPref(clave, defecto) {
  try { return localStorage.getItem(clave) || defecto; } catch (e) { return defecto; }
}
function guardarPref(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) {}
}

// -----------------------------------------------------
// Layouts de placa
// -----------------------------------------------------

const DIBUJOS = {
  // 1) Clásico ámbar: degradado del color del país, contraste alto
  clasico: {
    fondo(ctx, W, H, p) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, p.principal);
      g.addColorStop(0.55, p.profundo);
      g.addColorStop(1, p.profundo);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(W * 0.9, H * 0.1, W * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.1, H * 0.88, W * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    },
    contenido(ctx, W, H, d, logo) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      redondear(ctx, 70, 64, W - 140, 96, 24); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillText(d.flag + ' ' + d.nombreNorm + ' · SST', 110, 132);
      if (logo) dibujarLogo(ctx, logo, W - 190, 80, 120, 16);
      else {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        redondear(ctx, W - 190, 80, 120, 120, 16); ctx.fill();
        ctx.font = '52px system-ui, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('🛡️', W - 130, 170);
      }
      ctx.font = 'bold 58px system-ui, sans-serif';
      const tit = encajar(ctx, d.titulo, W - 180, 3);
      ctx.fillStyle = d.paleta.contraste;
      let y = 300;
      tit.forEach((l) => { ctx.fillText(l, 90, y); y += 74; });
      const yPie = H - 260;
      const yIni = Math.min(y + 40, yPie - 60);
      const maxCap = Math.max(2, Math.floor((yPie - yIni) / 58));
      ctx.font = '40px system-ui, sans-serif';
      const cap = encajar(ctx, d.caption, W - 180, maxCap);
      ctx.fillStyle = '#FFFFFF';
      let cy = yIni + 46;
      cap.forEach((l) => { ctx.fillText(l, 90, cy); cy += 58; });
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillStyle = d.paleta.contraste;
      ctx.fillText(d.empresa, 90, H - 255);
      ctx.font = '32px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(d.hashtags.join('  '), 90, H - 170);
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.fillText('Generado con ERGOX Post 🛡️ · SST multinacional', 90, H - 90);
    },
  },

  // 2) Minimal blanco: fondo claro, acento del país
  minimal: {
    fondo(ctx, W, H, p) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H, 100, W / 2, H, W * 0.95);
      g.addColorStop(0, p.claro);
      g.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = p.principal;
      ctx.fillRect(0, 0, W, 18);
      ctx.strokeStyle = p.claro;
      ctx.lineWidth = 6;
      redondear(ctx, 44, 44, W - 88, H - 88, 36); ctx.stroke();
    },
    contenido(ctx, W, H, d, logo) {
      const chip = d.flag + ' ' + d.nombreNorm + ' · SST';
      ctx.font = 'bold 34px system-ui, sans-serif';
      const anchoChip = Math.min(ctx.measureText(chip).width + 80, W - 360);
      ctx.fillStyle = d.paleta.principal;
      redondear(ctx, 90, 84, anchoChip, 72, 36); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(chip, 130, 134);
      if (logo) {
        dibujarLogo(ctx, logo, W - 210, 84, 120, 16);
        ctx.strokeStyle = d.paleta.principal;
        ctx.lineWidth = 6;
        redondear(ctx, W - 210, 84, 120, 120, 16); ctx.stroke();
      }
      ctx.font = 'bold 58px system-ui, sans-serif';
      const tit = encajar(ctx, d.titulo, W - 200, 3);
      ctx.fillStyle = '#111827';
      let y = 320;
      tit.forEach((l) => { ctx.fillText(l, 100, y); y += 76; });
      ctx.fillStyle = d.paleta.principal;
      ctx.fillRect(100, y - 14, 160, 12);
      const yPie = H - 260;
      const yIni = Math.min(y + 50, yPie - 60);
      const maxCap = Math.max(2, Math.floor((yPie - yIni) / 60));
      ctx.font = '38px system-ui, sans-serif';
      const cap = encajar(ctx, d.caption, W - 200, maxCap);
      ctx.fillStyle = '#374151';
      let cy = yIni + 46;
      cap.forEach((l) => { ctx.fillText(l, 100, cy); cy += 60; });
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillStyle = d.paleta.contraste;
      ctx.fillText(d.empresa, 100, H - 255);
      ctx.font = '32px system-ui, sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(d.hashtags.join('  '), 100, H - 170);
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('ERGOX Post — diseño minimal · SST multinacional', 100, H - 90);
    },
  },

  // 3) Oscuro corporativo: fondo slate, acento del país
  oscuro: {
    fondo(ctx, W, H, p) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0F172A');
      g.addColorStop(1, '#1E293B');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = p.principal;
      ctx.beginPath(); ctx.arc(W * 0.9, H * 0.08, W * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.08, H * 0.85, W * 0.26, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.principal;
      ctx.fillRect(0, 0, W, 14);
    },
    contenido(ctx, W, H, d, logo) {
      const chip = d.flag + ' ' + d.nombreNorm + ' · SST';
      ctx.font = 'bold 34px system-ui, sans-serif';
      const anchoChip = Math.min(ctx.measureText(chip).width + 80, W - 360);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      redondear(ctx, 70, 70, anchoChip, 72, 36); ctx.fill();
      ctx.strokeStyle = d.paleta.principal;
      ctx.lineWidth = 3;
      redondear(ctx, 70, 70, anchoChip, 72, 36); ctx.stroke();
      ctx.fillStyle = d.paleta.claro;
      ctx.fillText(chip, 110, 120);
      if (logo) dibujarLogo(ctx, logo, W - 190, 76, 120, 16);
      ctx.font = 'bold 58px system-ui, sans-serif';
      const tit = encajar(ctx, d.titulo, W - 180, 3);
      ctx.fillStyle = '#F8FAFC';
      let y = 300;
      tit.forEach((l) => { ctx.fillText(l, 90, y); y += 76; });
      ctx.fillStyle = d.paleta.principal;
      ctx.fillRect(90, y - 16, 180, 12);
      const yPie = H - 260;
      const yIni = Math.min(y + 50, yPie - 60);
      const maxCap = Math.max(2, Math.floor((yPie - yIni) / 60));
      ctx.font = '38px system-ui, sans-serif';
      const cap = encajar(ctx, d.caption, W - 180, maxCap);
      ctx.fillStyle = '#CBD5E1';
      let cy = yIni + 46;
      cap.forEach((l) => { ctx.fillText(l, 90, cy); cy += 60; });
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillStyle = d.paleta.principal;
      ctx.fillText(d.empresa, 90, H - 255);
      ctx.font = '32px system-ui, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(d.hashtags.join('  '), 90, H - 170);
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText('ERGOX Post — SST multinacional', 90, H - 90);
    },
  },
};

// -----------------------------------------------------
// API pública
// -----------------------------------------------------

export async function renderPlaca(opt) {
  const o = opt || {};
  const aspecto = ASPECTOS[o.aspecto] ? o.aspecto : 'feed';
  const layout = LAYOUTS.some((l) => l.id === o.layout) ? o.layout : leerPref('ergox_placa_layout', 'clasico');
  const [W, H] = ASPECTOS[aspecto];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Placa visual ' + layout + ' formato ' + aspecto);
  const ctx = canvas.getContext('2d');
  const datos = armarDatos(o);
  const logo = await cargarImagen(datos.logoUrl);
  const dibujo = DIBUJOS[layout] || DIBUJOS.clasico;
  dibujo.fondo(ctx, W, H, datos.paleta);
  dibujo.contenido(ctx, W, H, datos, logo);
  return canvas;
}

export async function renderPlacaCard(container, ctx) {
  const div = document.createElement('div');
  div.style.marginTop = '16px';
  div.setAttribute('role', 'region');
  div.setAttribute('aria-label', 'Generador de placa visual');

  const estado = {
    layout: leerPref('ergox_placa_layout', 'clasico'),
    aspecto: leerPref('ergox_placa_aspecto', 'feed'),
  };

  const filaSel = (label, dataAttr, opciones) =>
    '<div style="margin-bottom:12px">' +
      '<span class="muted" style="display:block;margin-bottom:6px">' + label + '</span>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap" role="group" aria-label="' + label + '">' +
      opciones.map((o) =>
        '<button type="button" class="btn btn-sm' + (o.id === estado[dataAttr] ? ' btn-purple' : ' btn-gris') + '" ' +
        'data-' + dataAttr + '="' + o.id + '" aria-pressed="' + (o.id === estado[dataAttr]) + '" ' +
        'aria-label="' + label + ': ' + o.label + '">' + o.icon + ' ' + o.label + '</button>'
      ).join('') +
      '</div></div>';

  div.innerHTML =
    '<div class="aviso" style="margin-bottom:10px">🎨 Placa visual 1080×1350 (IG/Feed, historias web). El texto se genera del último post.</div>' +
    filaSel('🎨 Estilo de placa', 'layout', LAYOUTS) +
    filaSel('📐 Formato', 'aspecto', OPCIONES_ASPECTO) +
    '<div id="placa-canvas-wrap" class="centrado"></div>' +
    '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
      '<button type="button" class="btn btn-purple" style="flex:1;min-width:160px" id="btn-descargar-placa" aria-label="Descargar la placa en formato PNG">⬇️ Descargar PNG</button>' +
      '<button type="button" class="btn btn-sm btn-blue" style="flex:1;min-width:160px" id="btn-copiar-placa" aria-label="Copiar el texto de la placa al portapapeles">📋 Copiar texto</button>' +
    '</div>';

  container.appendChild(div);

  const wrap = div.querySelector('#placa-canvas-wrap');

  const dibujar = async () => {
    wrap.innerHTML = '<p class="muted" style="padding:16px">Generando placa…</p>';
    try {
      const canvas = await renderPlaca({ ...ctx, layout: estado.layout, aspecto: estado.aspecto });
      wrap.innerHTML = '';
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';
      canvas.style.borderRadius = '12px';
      canvas.style.boxShadow = 'var(--sombra)';
      canvas.setAttribute('aria-label', 'Vista previa de la placa ' + estado.layout + ' en formato ' + estado.aspecto);
      wrap.appendChild(canvas);
    } catch (e) {
      wrap.innerHTML = '<p class="muted" style="padding:16px">No se pudo generar la placa.</p>';
    }
  };

  const actualizarActivos = () => {
    div.querySelectorAll('[data-layout]').forEach((b) => {
      const activo = b.getAttribute('data-layout') === estado.layout;
      b.classList.toggle('btn-purple', activo);
      b.classList.toggle('btn-gris', !activo);
      b.setAttribute('aria-pressed', String(activo));
    });
    div.querySelectorAll('[data-aspecto]').forEach((b) => {
      const activo = b.getAttribute('data-aspecto') === estado.aspecto;
      b.classList.toggle('btn-purple', activo);
      b.classList.toggle('btn-gris', !activo);
      b.setAttribute('aria-pressed', String(activo));
    });
  };

  div.querySelectorAll('[data-layout]').forEach((b) => {
    b.addEventListener('click', () => {
      estado.layout = b.getAttribute('data-layout');
      guardarPref('ergox_placa_layout', estado.layout);
      actualizarActivos();
      dibujar();
    });
  });

  div.querySelectorAll('[data-aspecto]').forEach((b) => {
    b.addEventListener('click', () => {
      estado.aspecto = b.getAttribute('data-aspecto');
      guardarPref('ergox_placa_aspecto', estado.aspecto);
      actualizarActivos();
      dibujar();
    });
  });

  div.querySelector('#btn-descargar-placa').addEventListener('click', () => {
    const canvas = wrap.querySelector('canvas');
    if (!canvas) { toast('La placa aún no está lista', 'error'); return; }
    const d = armarDatos(ctx);
    const nombre = 'ERGOX_Placa_' + String(d.titulo).slice(0, 30).replace(/[^\w]/g, '_') + '_' + estado.layout + '_' + estado.aspecto + '.png';
    descargarDataUrl(canvas.toDataURL('image/png'), nombre);
    toast('Placa descargada', 'success');
  });

  div.querySelector('#btn-copiar-placa').addEventListener('click', async () => {
    const d = armarDatos(ctx);
    const texto =
      '🛡️ ' + d.titulo + '\n\n' +
      d.caption + '\n\n' +
      d.empresa + '\n' +
      d.hashtags.join(' ');
    if (await copiar(texto)) toast('Texto de la placa copiado', 'success');
    else toast('No se pudo copiar', 'error');
  });

  await dibujar();
}
