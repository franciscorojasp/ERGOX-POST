// =====================================================
// Generador de publicaciones — UI minimalista
// Patrón Canva/Buffer/Predis: rail de controles + vista previa
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
const KEY_PLANTA = 'ergox_placa_layout';
const MIN_SKELETON_MS = 380;

const PLANTAS = [
  { id: 'clasico', nombre: 'Clásico', cls: 'mini-clasico' },
  { id: 'minimal', nombre: 'Minimal', cls: 'mini-minimal' },
  { id: 'oscuro', nombre: 'Corporativo', cls: 'mini-oscuro' },
];

export async function renderGenerador(c, sesion) {
  const pais = localStorage.getItem(KEY_PAIS) || (sesion && sesion.pais) || 'VE';
  const tipo = localStorage.getItem(KEY_TIPO) || 'educativo';
  const planta = localStorage.getItem(KEY_PLANTA) || 'clasico';
  const norm = NORMATIVAS[pais] || NORMATIVAS.VE;
  const params = (await db.params()) || PARAMS_DEFAULT;
  const perfil = (await db.perfil(sesion.email)) || {};
  const ultimo = leerUltimo();

  const paisChips = Object.keys(NORMATIVAS).map((k) => {
    const n = NORMATIVAS[k];
    return '<button class="gen-chip' + (k === pais ? ' activo' : '') + '" data-pais="' + k + '"><span aria-hidden="true">' + n.flag + '</span> ' + n.nombre + '</button>';
  }).join('');

  const tipoChips = [
    { id: 'educativo', icon: '🎓', label: 'Educativo' },
    { id: 'promocional', icon: '📣', label: 'Promocional' },
    { id: 'conciencia', icon: '🛡️', label: 'Concienciación' },
  ].map((t) => {
    return '<button class="gen-chip' + (t.id === tipo ? ' activo' : '') + '" data-tipo="' + t.id + '"><span aria-hidden="true">' + t.icon + '</span> ' + t.label + '</button>';
  }).join('');

  const temaChips = norm.temas.map((t) =>
    '<button class="gen-chip gen-tema-btn" data-tema="' + escHtml(t.tema) + '">' + t.label + '</button>'
  ).join('');

  const plantasHtml = PLANTAS.map((p) =>
    '<div class="gen-planta' + (planta === p.id ? ' activo' : '') + '" data-planta="' + p.id + '" role="button" tabindex="0" aria-pressed="' + (planta === p.id) + '">' +
      '<div class="miniatura ' + p.cls + '"><i></i><i></i><i></i></div>' +
      '<div class="nombre">' + p.nombre + '</div>' +
      '<div class="check" aria-hidden="true">✓</div>' +
    '</div>'
  ).join('');

  const multa = montosTexto(pais, params);
  const anno = new Date().getFullYear();
  const cred = sesion.cred !== undefined ? sesion.cred : CFG.CREDITOS_TRIAL;

  let preview;
  if (ultimo && ultimo.pais === pais) {
    const p = ultimo;
    const inicial = String((perfil.nombreEmpresa || sesion.empresa || 'ERGOX')).trim().charAt(0).toUpperCase() || 'E';
    preview =
      '<div class="gen-preview-titulo">' +
        '<h3>Vista previa</h3>' +
        '<span class="gen-pill">' + norm.flag + ' ' + norm.nombre + '</span>' +
      '</div>' +
      '<div class="gen-post gen-entra" id="gen-post">' +
        '<div class="gen-post-cabeza">' +
          '<div class="gen-post-avatar">' + escHtml(inicial) + '</div>' +
          '<div>' +
            '<div class="nom">' + escHtml(perfil.nombreEmpresa || sesion.empresa || 'Tu Empresa') + '</div>' +
            '<div class="sub">' + new Date(p.fecha).toLocaleDateString('es', { day: 'numeric', month: 'long' }) + ' · SST · ' + escHtml(p.tema.slice(0, 34)) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="gen-post-foto">' + escHtml(p.tema) + '</div>' +
        '<div class="gen-post-body" id="gen-body">' + escHtml(p.caption) + '</div>' +
        '<div class="gen-post-hashtags">' + p.hashtags.map((h) => '<span class="gen-tag">' + escHtml(h) + '</span>').join('') + '</div>' +
        '<div class="gen-meta">' +
          '<span id="gen-contador">' + p.caption.length + ' caracteres</span>' +
          '<span>Plantilla: ' + (PLANTAS.find((x) => x.id === planta) || PLANTAS[0]).nombre + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="gen-acciones">' +
        '<button class="gen-accion" id="btn-copiar"><span aria-hidden="true">📋</span> Copiar</button>' +
        '<button class="gen-accion" id="btn-whatsapp"><span aria-hidden="true">💬</span> WhatsApp</button>' +
        '<button class="gen-accion" id="btn-telegram"><span aria-hidden="true">✈️</span> Telegram</button>' +
        '<button class="gen-accion gen-primaria" id="btn-placa"><span aria-hidden="true">🎨</span> Portada</button>' +
        '<button class="gen-accion" id="btn-leadmagnet"><span aria-hidden="true">🧲</span> Lead Magnet</button>' +
      '</div>';
  } else {
    preview =
      '<div class="gen-preview-titulo">' +
        '<h3>Vista previa</h3>' +
        '<span class="gen-pill">' + norm.flag + ' ' + norm.nombre + '</span>' +
      '</div>' +
      '<div class="gen-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
          '<circle cx="12" cy="10" r="3.5"/>' +
          '<path d="M8.5 18.5l2.5-2.5 2 2 2.5-2.5" opacity="0.55"/>' +
        '</svg>' +
        '<h3>Tu publicación aparecerá aquí</h3>' +
        '<p>Elige país, tipo y tema, luego pulsa «Generar» para crear tu copy con la normativa vigente y tu portada.</p>' +
      '</div>';
  }

  c.innerHTML =
    '<div id="gen-vista">' +
      '<div class="gen-grid">' +
        '<div class="gen-rail">' +
          '<div class="gen-panel">' +
            '<h2 class="gen-titulo"><span aria-hidden="true">✨</span> Generar publicación <span class="gen-mini">' + cred + ' créditos</span></h2>' +
            '<div class="gen-seccion"><span aria-hidden="true">🌍</span> País / Normativa</div>' +
            '<div class="gen-chips" id="pais-chips">' + paisChips + '</div>' +
            '<div class="gen-seccion" style="margin-top:18px"><span aria-hidden="true">📚</span> Tipo de publicación</div>' +
            '<div class="gen-chips" id="tipo-chips">' + tipoChips + '</div>' +
            '<div class="gen-seccion" style="margin-top:18px"><span aria-hidden="true">✏️</span> Tema</div>' +
            '<input class="gen-input" id="tema-input" placeholder="Ej: Cómo implementar el PSST según LOPCYMAT" value="' + escHtml(ultimo && ultimo.pais === pais ? ultimo.tema : '') + '" />' +
            '<div class="gen-chips" style="margin-top:10px" id="tema-chips">' + temaChips + '</div>' +
          '</div>' +
          '<div class="gen-panel">' +
            '<div class="gen-seccion"><span aria-hidden="true">🎨</span> Plantilla de portada</div>' +
            '<div class="gen-plantas" id="gen-plantas">' + plantasHtml + '</div>' +
          '</div>' +
          '<button class="gen-generar" id="btn-generar">🚀 Generar publicación <span class="gen-costo" id="gen-costo"></span></button>' +
          '<div class="aviso gen-aviso">' +
            '<strong>' + norm.flag + ' Normativa aplicable:</strong><br>' +
            norm.leyes.map((l) => '• ' + l).join('<br>') +
            (multa ? '<br><br>⚠️ Sanciones estimadas ' + anno + ': ' + escHtml(multa) : '') +
          '</div>' +
        '</div>' +
        '<div class="gen-preview">' +
          '<div class="gen-panel" id="preview-panel">' + preview + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  const costo = document.getElementById('gen-costo');
  if (costo) costo.textContent = '(−1 crédito)';

  // ---- eventos: selector de país / tipo ----
  c.querySelectorAll('#pais-chips .gen-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(KEY_PAIS, btn.getAttribute('data-pais'));
      renderGenerador(c, sesion);
    });
  });

  c.querySelectorAll('#tipo-chips .gen-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(KEY_TIPO, btn.getAttribute('data-tipo'));
      renderGenerador(c, sesion);
    });
  });

  c.querySelectorAll('#tema-chips .gen-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('tema-input').value = btn.getAttribute('data-tema');
      document.getElementById('tema-input').focus();
    });
  });

  // ---- eventos: fichas de plantilla ----
  c.querySelectorAll('#gen-plantas .gen-planta').forEach((ficha) => {
    const select = () => {
      localStorage.setItem(KEY_PLANTA, ficha.getAttribute('data-planta'));
      c.querySelectorAll('#gen-plantas .gen-planta').forEach((f) => {
        const act = f === ficha;
        f.classList.toggle('activo', act);
        f.setAttribute('aria-pressed', String(act));
      });
    };
    ficha.addEventListener('click', select);
    ficha.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
  });

  // ---- generar ----
  const btnGenerar = document.getElementById('btn-generar');
  btnGenerar.addEventListener('click', async () => {
    const tema = document.getElementById('tema-input').value.trim();
    if (!tema) { toast('Escribe un tema', 'error'); document.getElementById('tema-input').focus(); return; }
    const panel = document.getElementById('preview-panel');
    btnGenerar.disabled = true;
    btnGenerar.innerHTML = '<span class="spinner"></span> Generando…';
    const inicio = Date.now();
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
      // efímero de carga: esqueleto → resultado
      panel.innerHTML =
        '<div class="gen-preview-titulo"><h3>Vista previa</h3><span class="gen-pill">' + norm.flag + ' ' + norm.nombre + '</span></div>' +
        '<div class="gen-skeleton" style="height:200px;margin-bottom:14px"></div>' +
        '<div class="gen-skeleton" style="height:13px;width:92%;margin-bottom:8px"></div>' +
        '<div class="gen-skeleton" style="height:13px;width:74%;margin-bottom:8px"></div>' +
        '<div class="gen-skeleton" style="height:13px;width:60%"></div>';
      const restante = MIN_SKELETON_MS - (Date.now() - inicio);
      if (restante > 0) await new Promise((res) => setTimeout(res, restante));
      toast('Publicación generada (−1 crédito)', 'success');
      renderGenerador(c, sesion);
    } catch (e) {
      toast(e.message || 'Error al generar', 'error');
      btnGenerar.disabled = false;
      btnGenerar.innerHTML = '🚀 Generar publicación <span class="gen-costo" id="gen-costo"></span>';
      const costo2 = document.getElementById('gen-costo');
      if (costo2) costo2.textContent = '(−1 crédito)';
    }
  });

  // ---- acciones sobre el post generado ----
  const bCopiar = document.getElementById('btn-copiar');
  if (bCopiar) bCopiar.addEventListener('click', async () => {
    const p = ultimo;
    if (!p) return;
    if (await copiar(p.caption + '\n\n' + p.hashtags.join(' '))) toast('Texto copiado al portapapeles', 'success');
    else toast('No se pudo copiar', 'error');
  });

  const bWa = document.getElementById('btn-whatsapp');
  if (bWa) bWa.addEventListener('click', () => {
    const p = ultimo;
    if (!p) return;
    const tel = String(perfil.telefono || '').replace(/[^\d]/g, '');
    const texto = encodeURIComponent(p.caption.slice(0, 300) + '\n\n' + p.hashtags.join(' '));
    window.open(tel ? 'https://wa.me/' + tel + '?text=' + texto : 'https://wa.me/?text=' + texto, '_blank', 'noopener');
    toast('Abriendo WhatsApp…', 'info');
  });

  const bTg = document.getElementById('btn-telegram');
  if (bTg) bTg.addEventListener('click', () => {
    const p = ultimo;
    if (!p) return;
    const texto = encodeURIComponent(p.caption.slice(0, 300));
    const url = encodeURIComponent(window.location.href);
    window.open('https://t.me/share/url?url=' + url + '&text=' + texto, '_blank', 'noopener');
    toast('Abriendo Telegram…', 'info');
  });

  const bPlaca = document.getElementById('btn-placa');
  if (bPlaca) bPlaca.addEventListener('click', async () => {
    const p = ultimo;
    if (!p) return;
    const { renderPlacaCard } = await import('../marketing/diseno.js');
    renderPlacaCard(document.getElementById('preview-panel'), { post: ultimo, perfil, norm, params });
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