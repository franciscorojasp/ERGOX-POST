// =====================================================
// ERGOX POST — Landing de captura de leads
// lead.html?id=<id> → formulario con consentimiento
// Mejoras: badges de confianza, recurso inexistente,
// pantalla de gracias con descarga directa.
// =====================================================

import { CFG } from '../config.js';
import { db, dbIniciar } from '../core/db.js';
import { escHtml, esEmailValido, urlValida } from '../core/util.js';

const $ = (id) => document.getElementById(id);

async function main() {
  const body = $('landing-body');
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    body.innerHTML =
      '<div class="centrado" style="padding:24px 8px">' +
        '<div style="font-size:52px">🔗</div>' +
        '<h2 style="font-size:18px;margin:12px 0 6px">Enlace inválido</h2>' +
        '<p class="muted" style="margin-bottom:18px">El enlace no incluye el identificador del recurso. Solicita el enlace correcto a la empresa.</p>' +
        '<a class="btn" style="display:inline-block;text-decoration:none" href="./">← Volver al inicio</a>' +
      '</div>';
    return;
  }

  body.innerHTML = '<p class="muted centrado" style="padding:30px">⏳ Cargando recurso…</p>';
  await dbIniciar();

  // obtiene la info pública del recurso (título + url)
  let lm = null;
  try {
    const r = await db.obtenerLmPublico(id);
    if (r) {
      if (r.ok === false) { lm = null; }
      else if (r.lm && typeof r.lm === 'object') lm = r.lm;
      else if (r.id || r.titulo || r.url) lm = r;
    }
  } catch (e) { lm = null; }
  if (!lm) {
    // fallback local/demo: busca en el caché del dispositivo
    try {
      const cache = await db.obtenerEstado();
      lm = (cache.leadMagnets || []).find((x) => x.id === id) || null;
    } catch (e2) { lm = null; }
  }

  if (!lm) {
    body.innerHTML =
      '<div class="centrado" style="padding:24px 8px">' +
        '<div style="font-size:52px">🔍</div>' +
        '<h2 style="font-size:18px;margin:12px 0 6px">Recurso no disponible</h2>' +
        '<p class="muted" style="margin-bottom:18px">Este recurso no existe o ya no está activo. Verifica el enlace con la empresa que te lo compartió.</p>' +
        '<a class="btn" style="display:inline-block;text-decoration:none" href="./">← Volver al inicio</a>' +
      '</div>';
    return;
  }

  const titulo = lm.titulo || 'Descarga tu recurso SST';
  body.innerHTML =
    '<h2 style="font-size:17px;margin-bottom:6px">📥 ' + escHtml(titulo) + '</h2>' +
    '<p class="muted" style="margin-bottom:14px">Completa tus datos para recibir el enlace de descarga por email o WhatsApp.</p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
      '<span class="l-badge" style="background:var(--ambar-claro);color:var(--ambar-oscuro)">🎁 Recurso gratis</span>' +
      '<span class="l-badge" style="background:var(--ambar-claro);color:var(--ambar-oscuro)">🔒 Respeta tu privacidad</span>' +
    '</div>' +
    '<form id="lead-form" novalidate>' +
      '<label for="l-nombre">Nombre completo</label>' +
      '<input id="l-nombre" name="nombre" required autocomplete="name" aria-label="Nombre completo" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="l-email">Correo electrónico</label>' +
      '<input id="l-email" type="email" name="email" required autocomplete="email" aria-label="Correo electrónico" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="l-empresa">Empresa</label>' +
      '<input id="l-empresa" name="empresa" autocomplete="organization" aria-label="Empresa" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="l-tel">WhatsApp (opcional)</label>' +
      '<input id="l-tel" type="tel" name="telefono" autocomplete="tel" aria-label="WhatsApp opcional" style="margin-bottom:16px;margin-top:8px" />' +
      '<label style="display:flex;gap:10px;align-items:start;font-weight:normal;font-size:13px;margin-bottom:16px">' +
        '<input type="checkbox" id="l-consent" style="width:auto;margin-top:2px" aria-required="true" />' +
        '<span>' + escHtml(CFG.CONSENT_TEXTO) + ' <a href="' + escHtml(CFG.PRIVACIDAD_URL) + '" target="_blank" rel="noopener" style="color:var(--azul)">Ver política</a></span>' +
      '</label>' +
      '<div id="l-error" class="hidden" role="alert" style="color:#DC2626;font-size:13px;margin-bottom:10px"></div>' +
      '<button class="btn" style="width:100%" id="l-submit" type="submit">🔓 Descargar recurso</button>' +
    '</form>';

  $('lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = $('l-nombre').value.trim();
    const email = $('l-email').value.trim();
    const empresa = $('l-empresa').value.trim();
    const telefono = $('l-tel').value.trim();
    const consent = $('l-consent').checked;
    const err = $('l-error');
    const btn = $('l-submit');
    err.classList.add('hidden');
    if (!nombre) { err.textContent = 'Ingresa tu nombre'; err.classList.remove('hidden'); $('l-nombre').focus(); return; }
    if (!esEmailValido(email)) { err.textContent = 'Ingresa un correo válido'; err.classList.remove('hidden'); $('l-email').focus(); return; }
    if (!consent) { err.textContent = 'Debes aceptar la política de privacidad'; err.classList.remove('hidden'); $('l-consent').focus(); return; }
    btn.disabled = true;
    btn.textContent = '⏳ Registrando…';
    try {
      const r = await db.capturarLead(id, { nombre, email, empresa, telefono, consent: true });
      if (!r.ok) { err.textContent = r.error || 'No se pudo registrar'; err.classList.remove('hidden'); btn.disabled = false; btn.textContent = '🔓 Descargar recurso'; return; }
      mostrarGracias(body, nombre, lm);
    } catch (ex) {
      err.textContent = ex.message || 'Error al registrar. Intenta de nuevo.';
      err.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '🔓 Descargar recurso';
    }
  });
}

function mostrarGracias(body, nombre, lm) {
  const url = lm && lm.url && urlValida(lm.url) ? lm.url : null;
  body.innerHTML =
    '<div class="l-exito">' +
      '<div style="font-size:64px;line-height:1">🎉</div>' +
      '<h2 style="font-size:20px;margin:12px 0 6px">¡Gracias, ' + escHtml(nombre) + '!</h2>' +
      '<p class="muted" style="margin-bottom:18px">Tu acceso a <strong>' + escHtml(lm.titulo || 'tu recurso') + '</strong> está listo.</p>' +
      (url
        ? '<a class="btn btn-success" style="display:block;text-align:center;text-decoration:none;margin-bottom:10px" ' +
          'href="' + escHtml(url) + '" target="_blank" rel="noopener" aria-label="Descargar el recurso ' + escHtml(lm.titulo || '') + '">⬇️ Descargar ahora</a>' +
          '<p class="muted" style="font-size:12px">Si el botón no funciona, revisa también tu correo.</p>'
        : '<p class="muted" style="margin-bottom:10px">La empresa te enviará el enlace de descarga por correo o WhatsApp.</p>') +
      '<button type="button" class="btn btn-gris btn-sm" style="width:100%;margin-top:12px" id="btn-volver" aria-label="Volver al inicio">← Volver al inicio</button>' +
    '</div>';
  const volver = $('btn-volver');
  if (volver) volver.addEventListener('click', () => { window.location.href = './'; });
}

main();
