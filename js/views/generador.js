// =====================================================
// Generador de publicaciones
// =====================================================

import { db } from '../core/db.js';
import { CFG } from '../config.js';
import { escHtml, toast, copiar, urlValida } from '../core/util.js';
import { NORMATIVAS, PARAMS_DEFAULT, RIF_LABELS, plantilla, hashtags, montosTexto } from '../content/datos.js';
import { actualizarChipCreditos } from './dashboard.js';
import { showModal, closeModal } from '../core/ui.js';

const KEY_ULTIMO = 'ergox_ultimo';
const KEY_PAIS = 'ergox_pais';
const KEY_TIPO = 'ergox_tipo';

export async function renderGenerador(c, sesion) {
  const pais = localStorage.getItem(KEY_PAIS) || (sesion && sesion.pais) || 'VE';
  const tipo = localStorage.getItem(KEY_TIPO) || 'educativo';
  const norm = NORMATIVAS[pais] || NORMATIVAS.VE;
  const params = (await db.params()) || PARAMS_DEFAULT;
  const perfil = (await db.perfil(sesion.email)) || {};
  const ultimo = leerUltimo();

  const paisBtns = Object.keys(NORMATIVAS).map((k) => {
    const n = NORMATIVAS[k];
    return '<button class="btn btn-sm' + (k === pais ? '' : ' btn-gris') + '" data-pais="' + k + '">' + n.flag + ' ' + n.nombre + '</button>';
  }).join('');

  const tipoBtns = [
    { id: 'educativo', icon: '📚', label: 'Educativo', color: 'btn-blue' },
    { id: 'promocional', icon: '📢', label: 'Promocional', color: 'btn-success' },
    { id: 'conciencia', icon: '⚠️', label: 'Concienciación', color: 'btn-danger' },
  ].map((t) => {
    return '<button class="btn btn-sm ' + (t.id === tipo ? t.color : 'btn-gris') + '" data-tipo="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
  }).join('');

  const temaBtns = norm.temas.map((t) =>
    '<button class="badge badge-ve" style="cursor:pointer;border:none" data-tema="' + escHtml(t.tema) + '">' + t.label + '</button>'
  ).join('');

  const multa = montosTexto(pais, params);
  const anno = new Date().getFullYear();

  let preview = '';
  if (ultimo && ultimo.pais === pais) {
    const p = ultimo;
    preview =
      '<div class="post-preview">' + escHtml(p.caption) + '</div>' +
      '<div style="color:var(--azul);font-size:13px;margin-bottom:12px">' + p.hashtags.join(' ') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn-sm" id="btn-copiar">📋 Copiar</button>' +
        '<button class="btn btn-sm btn-success" id="btn-whatsapp">💬 WhatsApp</button>' +
        '<button class="btn btn-sm btn-blue" id="btn-telegram">✈️ Telegram</button>' +
        '<button class="btn btn-sm btn-purple" id="btn-placa">🎨 Placa visual</button>' +
        '<button class="btn btn-sm" id="btn-leadmagnet">🧲 Lead Magnet</button>' +
      '</div>';
  } else {
    preview =
      '<div class="centrado" style="padding:40px 0">' +
        '<div style="font-size:48px;margin-bottom:16px">📱</div>' +
        '<h3 class="muted">Vista previa</h3>' +
        '<p style="font-size:14px;color:var(--borde-fuerte)">Genera tu primera publicación</p>' +
      '</div>';
  }

  c.innerHTML =
    '<div class="grid-2">' +
      '<div class="card fade-in">' +
        '<h2 style="font-size:18px;margin-bottom:16px">📸 Generar publicación</h2>' +

        '<label>🌍 País / Normativa</label>' +
        '<div class="grid-4" style="margin-bottom:16px;margin-top:8px" id="pais-btns">' + paisBtns + '</div>' +

        '<div class="aviso" style="margin-bottom:16px">' +
          '<strong>' + norm.flag + ' Normativa aplicable:</strong><br>' +
          norm.leyes.map((l) => '• ' + l).join('<br>') +
          (multa ? '<br><br>⚠️ Sanciones estimadas ' + anno + ': ' + escHtml(multa) : '') +
        '</div>' +

        '<label>📚 Tipo de publicación</label>' +
        '<div class="grid-3" style="margin-bottom:16px;margin-top:8px" id="tipo-btns">' + tipoBtns + '</div>' +

        '<label for="tema-input">✏️ Tema o asunto</label>' +
        '<input id="tema-input" placeholder="Ej: Cómo implementar el PSST según LOPCYMAT" value="' + escHtml(ultimo && ultimo.pais === pais ? ultimo.tema : '') + '" style="margin-bottom:12px;margin-top:8px" />' +

        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px" id="tema-btns">' + temaBtns + '</div>' +

        '<button class="btn" style="width:100%" id="btn-generar">🚀 Generar publicación ' + norm.flag + ' <span class="muted" style="color:#fff;font-weight:normal">(-1 crédito)</span></button>' +
      '</div>' +

      '<div class="card fade-in" id="preview-card">' + preview + '</div>' +
    '</div>';

  // ---- eventos ----
  c.querySelectorAll('#pais-btns .btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(KEY_PAIS, btn.getAttribute('data-pais'));
      renderGenerador(c, sesion);
    });
  });

  c.querySelectorAll('#tipo-btns .btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(KEY_TIPO, btn.getAttribute('data-tipo'));
      renderGenerador(c, sesion);
    });
  });

  c.querySelectorAll('#tema-btns .badge').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('tema-input').value = btn.getAttribute('data-tema');
    });
  });

  const btnGenerar = document.getElementById('btn-generar');
  btnGenerar.addEventListener('click', async () => {
    const tema = document.getElementById('tema-input').value.trim();
    if (!tema) { toast('Escribe un tema', 'error'); return; }
    try {
      const r = await db.consumirCredito(sesion.email, CFG.CREDITOS_POR_POST);
      if (!r.ok) { toast(r.error || 'Créditos insuficientes. Compra más en la pestaña Créditos.', 'error'); return; }
      const rifLabel = RIF_LABELS[pais] || 'RIF';
      const ctx = {
        tema,
        empresa: perfil.nombreEmpresa || sesion.empresa || 'Tu Empresa',
        norm,
        rifLabel,
        rif: perfil.rif || '',
        dir: perfil.direccionFiscal || '',
        tel: perfil.telefono || '',
        email: perfil.emailContacto || '',
        contacto: perfil.personaContacto || '',
        multa,
        disclaimer: params.disclaimer,
      };
      const post = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        caption: plantilla(pais, tipo, tema, ctx),
        tema,
        tipo,
        pais,
        hashtags: hashtags(pais, tipo),
        fecha: new Date().toISOString(),
        metricas: { alcance: 0, likes: 0, comentarios: 0 },
      };
      await db.guardarPost(post);
      guardarUltimo(post);
      actualizarChipCreditos(sesion);
      toast('Publicación generada (-1 crédito)', 'success');
      renderGenerador(c, sesion);
    } catch (e) {
      toast(e.message || 'Error al generar', 'error');
    }
  });

  const bCopiar = document.getElementById('btn-copiar');
  if (bCopiar) bCopiar.addEventListener('click', async () => {
    const p = ultimo;
    if (await copiar(p.caption + '\n\n' + p.hashtags.join(' '))) toast('Texto copiado al portapapeles', 'success');
    else toast('No se pudo copiar', 'error');
  });

  const bWa = document.getElementById('btn-whatsapp');
  if (bWa) bWa.addEventListener('click', () => {
    const p = ultimo;
    const tel = String(perfil.telefono || '').replace(/[^\d]/g, '');
    const texto = encodeURIComponent(p.caption.slice(0, 300) + '\n\n' + p.hashtags.join(' '));
    window.open(tel ? 'https://wa.me/' + tel + '?text=' + texto : 'https://wa.me/?text=' + texto, '_blank', 'noopener');
    toast('Abriendo WhatsApp…', 'info');
  });

  const bTg = document.getElementById('btn-telegram');
  if (bTg) bTg.addEventListener('click', () => {
    const p = ultimo;
    const texto = encodeURIComponent(p.caption.slice(0, 300));
    const url = encodeURIComponent(window.location.href);
    window.open('https://t.me/share/url?url=' + url + '&text=' + texto, '_blank', 'noopener');
    toast('Abriendo Telegram…', 'info');
  });

  const bPlaca = document.getElementById('btn-placa');
  if (bPlaca) bPlaca.addEventListener('click', async () => {
    const { renderPlacaCard } = await import('../marketing/diseno.js');
    renderPlacaCard(document.getElementById('preview-card'), { post: ultimo, perfil, norm, params });
  });

  const bLm = document.getElementById('btn-leadmagnet');
  if (bLm) bLm.addEventListener('click', () => abrirLeadMagnet(sesion));

  function leerUltimo() {
    try {
      const raw = sessionStorage.getItem(KEY_ULTIMO);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function guardarUltimo(p) {
    try { sessionStorage.setItem(KEY_ULTIMO, JSON.stringify(p)); } catch (e) {}
  }
}

export function abrirLeadMagnet(sesion) {
  showModal(
    '<h2 style="font-size:18px;margin-bottom:16px">🧲 Crear Lead Magnet</h2>' +
    '<p class="muted" style="margin-bottom:16px">Genera una página de captura real: el visitante deja sus datos y descarga tu recurso.</p>' +
    '<label for="lm-title">Título del recurso</label>' +
    '<input id="lm-title" placeholder="Ej: Checklist LOPCYMAT 2026" value="Checklist SST" style="margin-bottom:12px;margin-top:8px" />' +
    '<label for="lm-url">URL del PDF / recurso</label>' +
    '<input id="lm-url" placeholder="https://drive.google.com/… o https://ejemplo.com/recurso.pdf" style="margin-bottom:16px;margin-top:8px" />' +
    '<div style="display:flex;gap:8px">' +
      '<button class="btn" style="flex:1" id="btn-lm-save">🔗 Generar link</button>' +
      '<button class="btn btn-gris btn-sm" id="btn-lm-cancel">Cancelar</button>' +
    '</div>' +
    '<div id="lm-result" class="hidden" style="margin-top:12px;padding:12px;background:#D1FAE5;border-radius:10px;font-size:13px;color:#065F46"></div>',
    () => {
      document.getElementById('btn-lm-cancel').addEventListener('click', closeModal);
      document.getElementById('btn-lm-save').addEventListener('click', async () => {
        const titulo = document.getElementById('lm-title').value.trim();
        const url = document.getElementById('lm-url').value.trim();
        if (!titulo || !url) { toast('Completa todos los campos', 'error'); return; }
        if (!urlValida(url)) { toast('La URL debe ser http(s) válida', 'error'); return; }
        const lm = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), titulo, url, leads: 0, creado: new Date().toISOString(), pais: localStorage.getItem('ergox_pais') || 'VE' };
        await db.crearLeadMagnet(lm);
        const link = window.location.origin + window.location.pathname.replace(/index\.html$/, '') + 'lead.html?id=' + lm.id;
        await copiar(link);
        const res = document.getElementById('lm-result');
        res.classList.remove('hidden');
        res.innerHTML = '✅ Link generado y copiado:<br><strong>' + escHtml(link) + '</strong><br><br>Compártelo en tu bio y en las publicaciones. Los leads quedarán en la pestaña Leads.';
        toast('Link copiado al portapapeles', 'success');
      });
    }
  );
}