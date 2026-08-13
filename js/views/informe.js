// =====================================================
// Informe — resumen de negocio para administración
// =====================================================

import { db } from '../core/db.js';
import { escHtml, toast, descargarTexto, toCsv, fmtNum } from '../core/util.js';
import { NORMATIVAS } from '../content/datos.js';
import { resumenIngresos, filasUso, filasTransacciones } from '../finanzas/reportes.js';

export async function renderInforme(c, sesion) {
  if (sesion.rol !== 'ADMIN') {
    c.innerHTML = '<div class="card"><p class="muted">Acceso restringido</p></div>';
    return;
  }
  const cache = await db.obtenerEstado();
  const transacciones = cache.transacciones || [];
  const historial = cache.historial || [];

  const ing = resumenIngresos(transacciones);
  const uso = filasUso(historial);

  const porPais = {};
  const porTipo = {};
  historial.forEach((p) => {
    porPais[p.pais] = (porPais[p.pais] || 0) + 1;
    porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1;
  });

  const paisHtml = Object.keys(porPais).map((k) =>
    '<tr><td>' + (NORMATIVAS[k] ? NORMATIVAS[k].flag : '') + ' ' + escHtml(k) + '</td><td>' + porPais[k] + '</td></tr>'
  ).join('') || '<tr><td colspan="2" class="muted">Sin datos</td></tr>';

  const tipoHtml = Object.keys(porTipo).map((k) =>
    '<tr><td>' + escHtml(k) + '</td><td>' + porTipo[k] + '</td></tr>'
  ).join('') || '<tr><td colspan="2" class="muted">Sin datos</td></tr>';

  const planHtml = Object.keys(ing.porPlan).map((k) =>
    '<tr><td>' + escHtml(k) + '</td><td>' + ing.porPlan[k].cantidad + '</td><td>$' + ing.porPlan[k].total.toFixed(2) + '</td></tr>'
  ).join('') || '<tr><td colspan="3" class="muted">Sin ventas confirmadas</td></tr>';

  c.innerHTML =
    '<div class="grid-4 fade-in" style="margin-bottom:16px">' +
      '<div class="stat-card" style="background:#059669"><div class="icon">💰</div><div class="num">$' + ing.total.toFixed(2) + '</div><div class="label">Ingresos confirmados</div></div>' +
      '<div class="stat-card" style="background:#EAB308"><div class="icon">⏳</div><div class="num">' + ing.pendientes + '</div><div class="label">Pagos pendientes</div></div>' +
      '<div class="stat-card" style="background:#2563EB"><div class="icon">📸</div><div class="num">' + historial.length + '</div><div class="label">Posts generados</div></div>' +
      '<div class="stat-card" style="background:#7C3AED"><div class="icon">🎯</div><div class="num">' + fmtNum(uso.reduce((a, r) => a + (r[3] || 0), 0)) + '</div><div class="label">Alcance reportado</div></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px" class="fade-in">' +
      '<div class="card"><h3 style="font-size:16px;margin-bottom:12px">📈 Ingresos por plan</h3><div style="overflow-x:auto"><table><thead><tr><th>Plan</th><th>Ventas</th><th>Total</th></tr></thead><tbody>' + planHtml + '</tbody></table></div></div>' +
      '<div class="card"><h3 style="font-size:16px;margin-bottom:12px">🌍 Posts por país</h3><div style="overflow-x:auto"><table><thead><tr><th>País</th><th>Posts</th></tr></thead><tbody>' + paisHtml + '</tbody></table></div></div>' +
      '<div class="card"><h3 style="font-size:16px;margin-bottom:12px">📚 Posts por tipo</h3><div style="overflow-x:auto"><table><thead><tr><th>Tipo</th><th>Posts</th></tr></thead><tbody>' + tipoHtml + '</tbody></table></div></div>' +
    '</div>' +
    '<div class="card fade-in">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
        '<h3 style="font-size:16px">🧾 Transacciones</h3>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-sm btn-blue" id="btn-exp-tx">📤 CSV transacciones</button>' +
          '<button class="btn btn-sm" id="btn-exp-uso">📤 CSV uso de posts</button>' +
        '</div>' +
      '</div>' +
      '<div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Email</th><th>Detalle</th><th>Créditos</th><th>USD</th><th>Estado</th></tr></thead><tbody>' +
        transacciones.slice(0, 30).map((t) =>
          '<tr><td>' + new Date(t.fecha).toLocaleDateString('es-VE') + '</td>' +
          '<td>' + escHtml(t.email || '—') + '</td>' +
          '<td>' + escHtml(t.detalle || t.planId || t.tipo || '') + (t.ref ? ' · ref ' + escHtml(t.ref) : '') + '</td>' +
          '<td>' + (t.monto ? (t.monto > 0 ? '+' : '') + t.monto : '—') + '</td>' +
          '<td>' + (t.montoUsd ? '$' + Number(t.montoUsd).toFixed(2) : '—') + '</td>' +
          '<td><span class="badge ' + (t.estado === 'PAGADO' ? 'badge-baja' : t.estado === 'PENDIENTE' ? 'badge-media' : 'badge-info') + '">' + (t.estado || t.tipo || 'OK') + '</span></td></tr>'
        ).join('') || '<tr><td colspan="6" class="muted centrado">Sin transacciones</td></tr>' +
      '</tbody></table></div>' +
    '</div>';

  document.getElementById('btn-exp-tx').addEventListener('click', () => {
    descargarTexto(toCsv(filasTransacciones(transacciones)), 'ERGOX_Transacciones_' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv;charset=utf-8');
    toast('Transacciones exportadas', 'success');
  });

  document.getElementById('btn-exp-uso').addEventListener('click', () => {
    descargarTexto(toCsv(uso), 'ERGOX_UsoPosts_' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv;charset=utf-8');
    toast('Uso exportado', 'success');
  });
}