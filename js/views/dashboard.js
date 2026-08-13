// =====================================================
// Dashboard: encabezado, navegación y enrutador de pestañas
// =====================================================

import { db } from '../core/db.js';
import { escHtml, toast } from '../core/util.js';
import { renderLogin } from './login.js';
import { renderGenerador } from './generador.js';
import { renderHistorial } from './historial.js';
import { renderLeads } from './leads.js';
import { renderCalendario } from './calendario.js';
import { renderPlanner } from './planner.js';
import { renderCreditos } from './creditos.js';
import { renderConfiguracion } from './config.js';
import { renderAdmin } from './admin.js';
import { renderInforme } from './informe.js';

const TABS = [
  { id: 'generador', icon: '📸', label: 'Generar' },
  { id: 'historial', icon: '📋', label: 'Historial' },
  { id: 'leads', icon: '🧲', label: 'Leads' },
  { id: 'calendario', icon: '📆', label: 'Cumplimiento' },
  { id: 'planner', icon: '🗓️', label: 'Planner' },
  { id: 'creditos', icon: '💳', label: 'Créditos' },
  { id: 'config', icon: '⚙️', label: 'Configuración' },
];

export async function renderDashboard(c, sesion) {
  const esAdmin = sesion.rol === 'ADMIN';
  const tabs = esAdmin ? TABS.concat([{ id: 'admin', icon: '👑', label: 'Admin' }, { id: 'informe', icon: '📊', label: 'Informe' }]) : TABS;
  const cred = await db.creditos(sesion.email);
  const activo = localStorage.getItem('ergox_tab') || 'generador';
  if (!tabs.some((t) => t.id === activo)) localStorage.setItem('ergox_tab', 'generador');

  // Encabezado
  const header = document.getElementById('app-header');
  header.classList.remove('hidden');
  header.innerHTML =
    '<div class="titulo">🛡️ <span>ERGOX Post</span>' +
    '<span class="subtitulo" style="display:block;font-weight:normal">' + escHtml(sesion.empresa || '') + '</span></div>' +
    '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<span class="chip" id="chip-creditos">🪙 ' + cred + ' créditos</span>' +
      '<span style="font-size:14px;color:#fff">' + escHtml(sesion.nombre) + '</span>' +
      '<span class="badge" style="background:rgba(255,255,255,0.25);color:#fff">' + (esAdmin ? '👑 ADMIN' : '✏️ EDITOR') + '</span>' +
      '<button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff" id="btn-tema" aria-label="Cambiar tema claro/oscuro">' + (document.documentElement.getAttribute('data-tema') === 'oscuro' ? '☀️' : '🌙') + '</button>' +
      '<button class="btn btn-sm" style="background:#EF4444;color:#fff" id="btn-logout">Salir</button>' +
    '</div>';

  // Navegación
  const nav = document.getElementById('app-nav');
  nav.classList.remove('hidden');
  nav.innerHTML = tabs.map((t) =>
    '<button class="tab-btn' + (t.id === activo ? ' active' : '') + '" data-tab="' + t.id + '" role="tab">' + t.icon + ' ' + t.label + '</button>'
  ).join('');

  nav.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem('ergox_tab', btn.getAttribute('data-tab'));
      nav.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderTabContent(c, sesion);
    });
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await db.cerrarSesion();
    toast('Sesión cerrada', 'info');
    header.classList.add('hidden');
    nav.classList.add('hidden');
    renderLogin(document.getElementById('app'));
  });

  const btnTema = document.getElementById('btn-tema');
  btnTema.addEventListener('click', () => {
    const actual = document.documentElement.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
    document.documentElement.setAttribute('data-tema', actual);
    try { localStorage.setItem('ergox_tema', actual); } catch (e) {}
    btnTema.textContent = actual === 'oscuro' ? '☀️' : '🌙';
  });

  renderTabContent(c, sesion);
}

export async function renderTabContent(c, sesion) {
  const tab = localStorage.getItem('ergox_tab') || 'generador';
  c.classList.add('fade-in');
  try {
    switch (tab) {
      case 'generador': await renderGenerador(c, sesion); break;
      case 'historial': await renderHistorial(c, sesion); break;
      case 'leads': await renderLeads(c, sesion); break;
      case 'calendario': await renderCalendario(c, sesion); break;
      case 'planner': await renderPlanner(c, sesion); break;
      case 'creditos': await renderCreditos(c, sesion); break;
      case 'config': await renderConfiguracion(c, sesion); break;
      case 'admin': await renderAdmin(c, sesion); break;
      case 'informe': await renderInforme(c, sesion); break;
      default: await renderGenerador(c, sesion);
    }
  } catch (e) {
    console.error('Error al renderizar pestaña', tab, e);
    c.innerHTML = '<div class="card"><h2>⚠️ Error</h2><p class="muted">' + escHtml(String(e.message || e)) + '</p></div>';
  }
}

export async function actualizarChipCreditos(sesion) {
  const chip = document.getElementById('chip-creditos');
  if (!chip || !sesion) return;
  const cred = await db.creditos(sesion.email);
  chip.innerHTML = '🪙 ' + cred + ' créditos';
}