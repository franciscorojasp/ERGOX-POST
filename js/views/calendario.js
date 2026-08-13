// =====================================================
// Calendario de cumplimiento — fechas dinámicas por año
// =====================================================

import { NORMATIVAS, generarObligaciones } from '../content/datos.js';
import { escHtml, toast, fmtFechaCorta, diasRestantes } from '../core/util.js';

export async function renderCalendario(c, sesion) {
  const pais = localStorage.getItem('ergox_pais') || 'VE';
  const norm = NORMATIVAS[pais] || NORMATIVAS.VE;
  const obligaciones = generarObligaciones(pais);

  const filterBtns = Object.keys(NORMATIVAS).map((k) => {
    const n = NORMATIVAS[k];
    return '<button class="btn btn-sm' + (k === pais ? '' : ' btn-gris') + '" data-cal-pais="' + k + '">' + n.flag + '</button>';
  }).join('');

  const items = obligaciones.map((ev) => {
    const dias = diasRestantes(ev.fecha);
    const diasHtml = dias > 0
      ? '<span style="font-size:12px;color:' + (dias <= 30 ? 'var(--rojo)' : 'var(--texto-suave)') + '">' + dias + ' días restantes</span>'
      : '<span style="font-size:12px;color:var(--rojo);font-weight:bold">VENCIDO</span>';
    const color = ev.urgencia === 'alta' ? '#EF4444' : ev.urgencia === 'media' ? '#EAB308' : '#059669';
    const badge = ev.urgencia === 'alta' ? 'badge-alta' : ev.urgencia === 'media' ? 'badge-media' : 'badge-baja';
    return '<div style="padding:16px;border-left:4px solid ' + color + ';margin-bottom:8px;background:var(--bg-alt);border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<div style="flex:1;min-width:220px">' +
        '<p style="font-weight:bold;font-size:14px">' + ev.titulo + '</p>' +
        '<p style="font-size:12px;color:var(--texto-suave)">' + ev.ley + ' · <span class="badge ' + badge + '">' + ev.urgencia + '</span> · ' + ev.tipo + '</p>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<p style="font-weight:bold;font-size:14px">' + fmtFechaCorta(new Date(ev.fecha + 'T12:00:00')) + '</p>' +
        diasHtml +
        '<br><button class="btn btn-sm" style="font-size:11px;padding:4px 12px;margin-top:4px" data-cal-post="' + escHtml(ev.titulo) + '">📸 Post</button>' +
      '</div>' +
    '</div>';
  }).join('');

  c.innerHTML =
    '<div class="card fade-in">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">' +
        '<div>' +
          '<h2 style="font-size:18px">📆 Calendario de cumplimiento SST — ' + new Date().getFullYear() + '</h2>' +
          '<p class="muted">' + norm.flag + ' ' + norm.nombre + ' · obligaciones recurrentes calculadas automáticamente</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<div style="display:flex;gap:6px" id="cal-filter-btns">' + filterBtns + '</div>' +
          '<button class="btn btn-sm btn-blue" id="btn-notif" aria-label="Activar recordatorios del calendario">🔔 Recordatorios</button>' +
        '</div>' +
      '</div>' +
      items +
      '<p class="muted" style="margin-top:16px">ℹ️ Fechas orientativas: cada empresa debe verificar plazos exactos según su actividad y los organismos locales (INPSASEL, ARL, STPS, Sunafil, SRT, ISL).</p>' +
    '</div>';

  c.querySelectorAll('[data-cal-pais]').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem('ergox_pais', btn.getAttribute('data-cal-pais'));
      renderCalendario(c, sesion);
    });
  });

  c.querySelectorAll('[data-cal-post]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const titulo = btn.getAttribute('data-cal-post');
      localStorage.setItem('ergox_tab', 'generador');
      const nav = document.getElementById('app-nav');
      nav.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      const gen = nav.querySelector('[data-tab="generador"]');
      if (gen) gen.classList.add('active');
      renderGeneradorDesdeCalendario(titulo);
      toast('Tema cargado en el generador', 'info');
    });
  });

  const bNotif = document.getElementById('btn-notif');
  bNotif.addEventListener('click', async () => {
    if (!('Notification' in window)) { toast('Este navegador no soporta notificaciones', 'error'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      // programar una notificación para la obligación más próxima (ventana de 48h)
      const proxima = obligaciones.find((o) => diasRestantes(o.fecha) >= 0 && diasRestantes(o.fecha) <= 2);
      new Notification('📆 ERGOX Post — Cumplimiento SST', {
        body: proxima
          ? 'Recuerda: ' + proxima.titulo + ' (' + fmtFechaCorta(new Date(proxima.fecha + 'T12:00:00')) + ')'
          : 'Revisa tu calendario de cumplimiento SST en ERGOX Post.',
        icon: 'icons/icon-192.svg',
      });
      toast('Recordatorio activado. Revisa tu calendario cada semana.', 'success');
    } else {
      toast('Notificaciones no permitidas', 'info');
    }
  });
}

async function renderGeneradorDesdeCalendario(titulo) {
  const { renderTabContent } = await import('./dashboard.js');
  await renderTabContent(document.getElementById('app'), null);
  setTimeout(() => {
    const input = document.getElementById('tema-input');
    if (input) input.value = titulo;
  }, 60);
}