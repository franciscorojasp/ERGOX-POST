// =====================================================
// ERGOX POST — Arranque de la aplicación
// =====================================================

import { dbArrancar, db, dbSincronizarPendientes } from './core/db.js';
import { toast } from './core/util.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';

const app = document.getElementById('app');

function aplicarTema() {
  try {
    const tema = localStorage.getItem('ergox_tema');
    if (tema === 'oscuro') document.documentElement.setAttribute('data-tema', 'oscuro');
  } catch (e) {}
}

function registrarSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

async function render() {
  const sesion = await db.sesion();
  if (sesion && sesion.email) {
    await renderDashboard(app, sesion);
  } else {
    renderLogin(app);
  }
}

async function arrancar() {
  aplicarTema();
  registrarSW();

  await dbArrancar();

  window.addEventListener('online', async () => {
    const banner = document.getElementById('offline-banner');
    if (banner) banner.classList.add('hidden');
    const n = await dbSincronizarPendientes();
    if (n > 0) toast(n + ' cambio(s) sincronizado(s) con el backend', 'info');
    const sesion = await db.sesion();
    if (sesion) render();
  });

  window.addEventListener('offline', () => {
    const banner = document.getElementById('offline-banner');
    if (banner) banner.classList.remove('hidden');
  });

  await render();
}

arrancar();