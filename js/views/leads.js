// =====================================================
// Leads — captura real, consentimiento y exportación
// =====================================================

import { db } from '../core/db.js';
import { escHtml, toast, copiar, descargarTexto, fmtFecha, toCsv } from '../core/util.js';
import { showModal, closeModal } from '../core/ui.js';

export async function renderLeads(c, sesion) {
  const cache = await db.obtenerEstado();
  const lms = cache.leadMagnets || [];
  const leads = cache.leads || [];

  const lmRows = lms.length === 0
    ? '<tr><td colspan="4" class="muted centrado" style="padding:20px">Aún no hay recursos. Crea un Lead Magnet desde el generador.</td></tr>'
    : lms.map((lm) => {
        const link = window.location.origin + window.location.pathname.replace(/index\.html$/, '') + 'lead.html?id=' + lm.id;
        return '<tr>' +
          '<td><strong>' + escHtml(lm.titulo) + '</strong></td>' +
          '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(lm.url) + '</td>' +
          '<td>' + (leads.filter((l) => l.lmId === lm.id).length) + '</td>' +
          '<td>' + fmtFecha(lm.creado) + '</td>' +
          '<td><button class="btn btn-sm" data-copiar-link="' + escHtml(link) + '" style="font-size:12px">🔗 Copiar link</button></td>' +
        '</tr>';
      }).join('');

  const leadRows = leads.length === 0
    ? '<tr><td colspan="6" class="muted centrado" style="padding:20px">Aún no hay leads capturados. Comparte los links de tus recursos.</td></tr>'
    : leads.map((l) =>
        '<tr>' +
          '<td>' + escHtml(l.nombre || '—') + '</td>' +
          '<td>' + escHtml(l.email) + '</td>' +
          '<td>' + escHtml(l.empresa || '—') + '</td>' +
          '<td>' + escHtml(l.recurso || '—') + '</td>' +
          '<td><span class="badge ' + (String(l.consentimiento || '').indexOf('si') === 0 ? 'badge-baja' : 'badge-alta') + '">' + (String(l.consentimiento || '').indexOf('si') === 0 ? '✅ Consentimiento' : '⚠️ Sin consent.') + '</span></td>' +
          '<td>' + fmtFecha(l.fecha) + '</td>' +
        '</tr>'
      ).join('');

  c.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">' +
      '<div class="card stat-card" style="background:linear-gradient(135deg,#7C3AED,#6D28D9)">' +
        '<div class="icon">🧲</div><div class="num">' + leads.length + '</div><div class="label">Leads capturados</div>' +
      '</div>' +
      '<div class="card stat-card" style="background:linear-gradient(135deg,#2563EB,#1D4ED8)">' +
        '<div class="icon">🔗</div><div class="num">' + lms.length + '</div><div class="label">Recursos activos</div>' +
      '</div>' +
    '</div>' +
    '<div class="card fade-in" style="margin-bottom:16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
        '<h3 style="font-size:16px">🔗 Recursos (Lead Magnets)</h3>' +
        '<div style="display:flex;gap:8px">' +
          (leads.length ? '<button class="btn btn-sm btn-blue" id="btn-export-leads">📤 Exportar leads (CSV)</button>' : '') +
          '<button class="btn btn-sm" id="btn-nuevo-lm">➕ Nuevo recurso</button>' +
        '</div>' +
      '</div>' +
      '<table><thead><tr><th>Título</th><th>URL</th><th>Leads</th><th>Creado</th><th>Link</th></tr></thead><tbody>' + lmRows + '</tbody></table>' +
    '</div>' +
    '<div class="card fade-in">' +
      '<h3 style="font-size:16px;margin-bottom:12px">📋 Leads capturados</h3>' +
      '<div style="overflow-x:auto"><table><thead><tr><th>Nombre</th><th>Email</th><th>Empresa</th><th>Recurso</th><th>Consentimiento</th><th>Fecha</th></tr></thead><tbody>' + leadRows + '</tbody></table></div>' +
      '<p class="muted" style="margin-top:12px">ℹ️ El consentimiento de datos es obligatorio según la normativa de protección de datos de cada país (LOPDP VE, Ley 1581 CO, LFPDPPP MX, Ley 29733 PE).</p>' +
    '</div>';

  c.querySelectorAll('[data-copiar-link]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (await copiar(btn.getAttribute('data-copiar-link'))) toast('Link copiado', 'success');
    });
  });

  const bExp = document.getElementById('btn-export-leads');
  if (bExp) bExp.addEventListener('click', () => {
    const filas = leads.map((l) => [l.nombre, l.email, l.empresa, l.recurso, l.consentimiento, l.fecha]);
    descargarTexto(toCsv(filas), 'ERGOX_Leads_' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv;charset=utf-8');
    toast('Leads exportados', 'success');
  });

  const bNuevo = document.getElementById('btn-nuevo-lm');
  if (bNuevo) bNuevo.addEventListener('click', () => {
    showModal(
      '<h2 style="font-size:18px;margin-bottom:12px">🧲 Nuevo Lead Magnet</h2>' +
      '<label for="lm2-title">Título del recurso</label>' +
      '<input id="lm2-title" placeholder="Ej: Checklist LOPCYMAT 2026" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="lm2-url">URL del PDF / recurso</label>' +
      '<input id="lm2-url" placeholder="https://ejemplo.com/recurso.pdf" style="margin-bottom:16px;margin-top:8px" />' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn" style="flex:1" id="btn-lm2-save">Guardar</button>' +
        '<button class="btn btn-gris btn-sm" id="btn-lm2-cancel">Cancelar</button>' +
      '</div>',
      () => {
        document.getElementById('btn-lm2-cancel').addEventListener('click', closeModal);
        document.getElementById('btn-lm2-save').addEventListener('click', async () => {
          const titulo = document.getElementById('lm2-title').value.trim();
          const url = document.getElementById('lm2-url').value.trim();
          if (!titulo || !url) { toast('Completa todos los campos', 'error'); return; }
          const lm = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), titulo, url, leads: 0, creado: new Date().toISOString(), pais: localStorage.getItem('ergox_pais') || 'VE' };
          await db.crearLeadMagnet(lm);
          closeModal();
          toast('Recurso creado', 'success');
          renderLeads(c, sesion);
        });
      }
    );
  });
}