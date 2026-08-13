// =====================================================
// UI compartida: modal con foco y cierre con ESC
// =====================================================

import { toast } from './util.js';

let manejadorKey = null;

export function showModal(contenidoHtml, onMount) {
  closeModal();
  const root = document.getElementById('modal-root');
  root.innerHTML =
    '<div class="modal-overlay" id="modal-overlay" role="dialog" aria-modal="true">' +
      '<div class="modal-content" tabindex="-1">' + contenidoHtml + '</div>' +
    '</div>';
  const overlay = document.getElementById('modal-overlay');
  const content = root.querySelector('.modal-content');

  // trampa de foco básica
  const enfocables = () => Array.from(content.querySelectorAll('button, input, select, textarea, a[href]'));
  const primerEl = content.querySelector('input, button, select, textarea');
  if (primerEl) setTimeout(() => primerEl.focus(), 30);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  manejadorKey = function (e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      const els = enfocables();
      if (!els.length) return;
      const primero = els[0];
      const ultimo = els[els.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    }
  };
  document.addEventListener('keydown', manejadorKey);

  if (onMount) onMount();
}

export function closeModal() {
  if (manejadorKey) document.removeEventListener('keydown', manejadorKey);
  manejadorKey = null;
  document.getElementById('modal-root').innerHTML = '';
}

export function confirmar(titulo, mensaje, onAceptar, textoBtn) {
  showModal(
    '<h2 style="font-size:18px;margin-bottom:12px">⚠️ ' + titulo + '</h2>' +
    '<p style="font-size:14px;color:var(--texto-suave);margin-bottom:20px">' + mensaje + '</p>' +
    '<div style="display:flex;gap:8px">' +
      '<button class="btn btn-danger" id="btn-confirmar" style="flex:1">' + (textoBtn || 'Sí, continuar') + '</button>' +
      '<button class="btn btn-gris btn-sm" id="btn-cancelar">Cancelar</button>' +
    '</div>',
    () => {
      document.getElementById('btn-cancelar').addEventListener('click', closeModal);
      document.getElementById('btn-confirmar').addEventListener('click', () => { closeModal(); onAceptar(); });
    }
  );
}

export { toast };