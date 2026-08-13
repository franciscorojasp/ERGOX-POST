// =====================================================
// Vista Planner — delega la implementación al módulo
// js/marketing/planner.js (plan editorial + exportación)
// =====================================================

import { mountPlanner } from '../marketing/planner.js';

export async function renderPlanner(c, sesion) {
  c.innerHTML = '<div id="planner-root" class="fade-in"><div class="card centrado"><p class="muted">Cargando planner…</p></div></div>';
  try {
    await mountPlanner(document.getElementById('planner-root'), { sesion });
  } catch (e) {
    c.innerHTML = '<div class="card"><h2>⚠️ Planner no disponible</h2><p class="muted">' + String(e.message || e) + '</p></div>';
  }
}