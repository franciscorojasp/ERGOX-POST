// =====================================================
// Historial — métricas reales editables (sin datos falsos)
// =====================================================

import { db } from '../core/db.js';
import { escHtml, toast, copiar, descargarTexto, fmtFecha } from '../core/util.js';
import { NORMATIVAS } from '../content/datos.js';
import { confirmar } from '../core/ui.js';

export async function renderHistorial(c, sesion) {
  const cache = await db.obtenerEstado();
  const posts = cache.historial || [];

  const listHtml = posts.length === 0
    ? '<p class="muted centrado" style="padding:40px">Aún no has generado publicaciones</p>'
    : posts.map((p, i) => {
        const norm = NORMATIVAS[p.pais] || NORMATIVAS.VE;
        const m = p.metricas || { alcance: 0, likes: 0, comentarios: 0 };
        return '<div style="padding:16px;border-bottom:1px solid var(--borde)" class="fade-in" data-idx="' + i + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:220px">' +
              '<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">' +
                '<span class="badge badge-ve">' + norm.flag + ' ' + p.tipo + '</span>' +
                '<span class="badge badge-info">' + fmtFecha(p.fecha) + '</span>' +
              '</div>' +
              '<p style="font-size:14px;margin:4px 0;line-height:1.5">' + escHtml(p.caption.slice(0, 200)) + (p.caption.length > 200 ? '…' : '') + '</p>' +
              '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">' +
                '<label class="sr-only" for="met-alcance-' + i + '">Alcance</label>' +
                '<input id="met-alcance-' + i + '" data-metrica="alcance" type="number" min="0" placeholder="Alcance" value="' + (m.alcance || '') + '" style="width:90px;padding:6px 10px;font-size:13px" />' +
                '<label class="sr-only" for="met-likes-' + i + '">Likes</label>' +
                '<input id="met-likes-' + i + '" data-metrica="likes" type="number" min="0" placeholder="Likes" value="' + (m.likes || '') + '" style="width:80px;padding:6px 10px;font-size:13px" />' +
                '<label class="sr-only" for="met-com-' + i + '">Comentarios</label>' +
                '<input id="met-com-' + i + '" data-metrica="comentarios" type="number" min="0" placeholder="Coment." value="' + (m.comentarios || '') + '" style="width:90px;padding:6px 10px;font-size:13px" />' +
                '<button class="btn btn-sm" data-action="guardar-metricas" data-idx="' + i + '" style="font-size:12px">💾 Guardar</button>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-shrink:0">' +
              '<button class="btn btn-sm" data-action="copy" data-idx="' + i + '" aria-label="Copiar publicación">📋</button>' +
              '<button class="btn btn-sm btn-danger" data-action="delete" data-idx="' + i + '" aria-label="Eliminar publicación">🗑️</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

  c.innerHTML =
    '<div class="card fade-in">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">' +
        '<h2 style="font-size:18px">📋 Historial de publicaciones (' + posts.length + ')</h2>' +
        '<div style="display:flex;gap:8px">' +
          (posts.length ? '<button class="btn btn-sm btn-blue" id="btn-export-all">📤 Exportar todo</button>' : '') +
          (posts.length ? '<button class="btn btn-sm btn-danger" id="btn-delete-all">🗑️ Borrar todo</button>' : '') +
        '</div>' +
      '</div>' +
      '<div id="historial-list">' + listHtml + '</div>' +
    '</div>';

  c.querySelectorAll('[data-action="copy"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const p = posts[parseInt(btn.getAttribute('data-idx'), 10)];
      if (p && await copiar(p.caption + '\n\n' + p.hashtags.join(' '))) toast('Publicación copiada', 'success');
      else toast('No se pudo copiar', 'error');
    });
  });

  c.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const p = posts[parseInt(btn.getAttribute('data-idx'), 10)];
      await db.eliminarPost(p.id);
      toast('Publicación eliminada', 'info');
      renderHistorial(c, sesion);
    });
  });

  c.querySelectorAll('[data-action="guardar-metricas"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const p = posts[idx];
      const fila = c.querySelector('[data-idx="' + idx + '"]');
      const metricas = {
        alcance: parseInt(fila.querySelector('[data-metrica="alcance"]').value || '0', 10),
        likes: parseInt(fila.querySelector('[data-metrica="likes"]').value || '0', 10),
        comentarios: parseInt(fila.querySelector('[data-metrica="comentarios"]').value || '0', 10),
      };
      await db.actualizarMetricas(p.id, metricas);
      toast('Métricas guardadas', 'success');
    });
  });

  const exportBtn = document.getElementById('btn-export-all');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const texto = posts.map((p) => {
      const m = p.metricas || {};
      return '--- ' + p.tipo.toUpperCase() + ' (' + (NORMATIVAS[p.pais] || NORMATIVAS.VE).flag + ') ' + fmtFecha(p.fecha) + ' | alcance: ' + (m.alcance || 0) + ' | likes: ' + (m.likes || 0) + ' | comentarios: ' + (m.comentarios || 0) + ' ---\n' + p.caption + '\n' + p.hashtags.join(' ') + '\n';
    }).join('\n');
    descargarTexto(texto, 'ERGOX_Historial_' + new Date().toISOString().slice(0, 10) + '.txt');
    toast('Historial exportado', 'success');
  });

  const delAllBtn = document.getElementById('btn-delete-all');
  if (delAllBtn) delAllBtn.addEventListener('click', () => {
    confirmar('Borrar todo', 'Se eliminarán todas las publicaciones del historial. Esta acción no se puede deshacer.', async () => {
      for (const p of posts) await db.eliminarPost(p.id);
      toast('Historial borrado', 'info');
      renderHistorial(c, sesion);
    }, 'Sí, borrar todo');
  });
}