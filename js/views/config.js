// =====================================================
// Configuración de la empresa — datos que alimentan los posts
// =====================================================

import { db } from '../core/db.js';
import { NORMATIVAS, RIF_LABELS } from '../content/datos.js';
import { escHtml, toast, urlValida } from '../core/util.js';
import { confirmar } from '../core/ui.js';

export async function renderConfiguracion(c, sesion) {
  const email = sesion.email;
  const perfil = (await db.perfil(email)) || {};
  const normLabels = RIF_LABELS;

  const logoSection = perfil.logoUrl
    ? '<div style="margin-bottom:16px;text-align:center">' +
      '<img src="' + escHtml(perfil.logoUrl) + '" alt="Logo de la empresa" style="max-width:120px;max-height:120px;border-radius:12px;border:2px solid var(--ambar);object-fit:contain;background:#fff" />' +
      '<br><button class="btn btn-sm btn-danger" style="margin-top:8px" id="btn-remove-logo">🗑️ Quitar logo</button>' +
    '</div>'
    : '';

  const paisSelect = Object.keys(NORMATIVAS).map((k) => {
    const n = NORMATIVAS[k];
    return '<option value="' + k + '"' + ((perfil.pais || 'VE') === k ? ' selected' : '') + '>' + n.flag + ' ' + n.nombre + '</option>';
  }).join('');

  c.innerHTML =
    '<div class="grid-2 fade-in">' +
      '<div class="card">' +
        '<h2 style="font-size:18px;margin-bottom:16px">⚙️ Configuración de la empresa</h2>' +
        '<p class="muted" style="margin-bottom:20px">Estos datos se usan en las publicaciones generadas y en la información de contacto.</p>' +

        logoSection +

        '<label for="cfg-logo">📷 Logo de la empresa (URL)</label>' +
        '<input id="cfg-logo" placeholder="https://ejemplo.com/logo.png" value="' + escHtml(perfil.logoUrl || '') + '" style="margin-bottom:12px;margin-top:8px" />' +

        '<label for="cfg-pais">🌍 País</label>' +
        '<select id="cfg-pais" style="margin-bottom:12px;margin-top:8px">' + paisSelect + '</select>' +

        '<label for="cfg-nombre">🏢 Nombre de la empresa</label>' +
        '<input id="cfg-nombre" placeholder="Ej: Constructora Ávila C.A." value="' + escHtml(perfil.nombreEmpresa || sesion.empresa || '') + '" style="margin-bottom:12px;margin-top:8px" />' +

        '<label for="cfg-rif">🔢 Número / Registro fiscal</label>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;margin-top:8px">' +
          '<span id="cfg-rif-label" style="font-weight:bold;font-size:14px;white-space:nowrap;padding:12px 16px;border-radius:12px;background:var(--bg-alt);border:1px solid var(--borde)">' + (normLabels[perfil.pais] || 'RIF') + '</span>' +
          '<input id="cfg-rif" placeholder="Ej: J-12345678-9" value="' + escHtml(perfil.rif || '') + '" />' +
        '</div>' +

        '<label for="cfg-direccion">📍 Dirección fiscal</label>' +
        '<textarea id="cfg-direccion" rows="2" placeholder="Av. Principal, Edificio A, Piso 3, Caracas, Venezuela" style="margin-bottom:12px;margin-top:8px;resize:vertical">' + escHtml(perfil.direccionFiscal || '') + '</textarea>' +

        '<label for="cfg-telefono">📞 Teléfono (WhatsApp)</label>' +
        '<input id="cfg-telefono" placeholder="+58 212-555-1234" value="' + escHtml(perfil.telefono || '') + '" style="margin-bottom:12px;margin-top:8px" />' +

        '<label for="cfg-email">📧 Correo electrónico</label>' +
        '<input id="cfg-email" type="email" placeholder="contacto@empresa.com" value="' + escHtml(perfil.emailContacto || '') + '" style="margin-bottom:12px;margin-top:8px" />' +

        '<label for="cfg-contacto">👤 Persona de contacto</label>' +
        '<input id="cfg-contacto" placeholder="Nombre y Apellido" value="' + escHtml(perfil.personaContacto || '') + '" style="margin-bottom:20px;margin-top:8px" />' +

        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn" style="flex:1" id="btn-save-config">💾 Guardar configuración</button>' +
          '<button class="btn btn-danger btn-sm" id="btn-clear-config">🗑️ Limpiar</button>' +
        '</div>' +
      '</div>' +

      '<div>' +
        '<div class="card" style="margin-bottom:16px">' +
          '<h3 style="font-size:16px;margin-bottom:12px">👁️ Vista previa — cómo se verá tu info en los posts</h3>' +
          '<div id="config-preview">' + buildPreview(perfil) + '</div>' +
        '</div>' +
        '<div class="card">' +
          '<h3 style="font-size:16px;margin-bottom:12px">🔗 Tu enlace de WhatsApp</h3>' +
          '<p class="muted" style="margin-bottom:12px">Se usa en el botón de compartir del generador.</p>' +
          '<input id="cfg-walink" readonly value="' + escHtml((perfil.telefono ? 'https://wa.me/' + String(perfil.telefono).replace(/[^\d]/g, '') : 'Sin teléfono configurado')) + '" />' +
        '</div>' +
      '</div>' +
    '</div>';

  document.getElementById('cfg-pais').addEventListener('change', () => {
    const p = document.getElementById('cfg-pais').value;
    document.getElementById('cfg-rif-label').textContent = normLabels[p] || 'RIF';
  });

  document.getElementById('btn-remove-logo').addEventListener('click', async () => {
    const p = leerForm();
    p.logoUrl = '';
    await db.setPerfil(email, p);
    toast('Logo eliminado', 'info');
    renderConfiguracion(c, sesion);
  });

  document.getElementById('btn-save-config').addEventListener('click', async () => {
    const p = leerForm();
    if (p.logoUrl && !urlValida(p.logoUrl)) { toast('La URL del logo debe ser http(s)', 'error'); return; }
    if (!p.nombreEmpresa) { toast('Ingresa el nombre de la empresa', 'error'); return; }
    await db.setPerfil(email, p);
    toast('Configuración guardada', 'success');
    renderConfiguracion(c, sesion);
  });

  document.getElementById('btn-clear-config').addEventListener('click', () => {
    confirmar('Limpiar configuración', 'Se borrarán los datos del perfil de empresa. ¿Continuar?', async () => {
      const { perfilDefault } = await import('../core/migrations.js');
      await db.setPerfil(email, perfilDefault());
      toast('Configuración limpiada', 'info');
      renderConfiguracion(c, sesion);
    });
  });

  function leerForm() {
    return {
      nombreEmpresa: document.getElementById('cfg-nombre').value.trim(),
      rif: document.getElementById('cfg-rif').value.trim(),
      logoUrl: document.getElementById('cfg-logo').value.trim(),
      direccionFiscal: document.getElementById('cfg-direccion').value.trim(),
      telefono: document.getElementById('cfg-telefono').value.trim(),
      emailContacto: document.getElementById('cfg-email').value.trim(),
      personaContacto: document.getElementById('cfg-contacto').value.trim(),
      pais: document.getElementById('cfg-pais').value,
    };
  }
}

function buildPreview(perfil) {
  const label = RIF_LABELS[perfil.pais] || 'RIF';
  const flag = (NORMATIVAS[perfil.pais] || NORMATIVAS.VE).flag;
  const nombre = perfil.nombreEmpresa || 'Nombre de tu empresa';
  const rif = perfil.rif ? label + ': ' + perfil.rif : '';
  const logo = perfil.logoUrl
    ? '<div style="text-align:center;margin-bottom:12px"><img src="' + escHtml(perfil.logoUrl) + '" alt="Logo" style="max-width:80px;max-height:80px;border-radius:10px;object-fit:contain;background:#fff" /></div>'
    : '';
  return '<div style="background:var(--card);border:1px solid var(--borde);border-radius:12px;padding:16px;font-size:13px">' +
    logo +
    '<div style="text-align:center;margin-bottom:12px">' +
      '<p style="font-weight:bold;font-size:16px">' + escHtml(nombre) + '</p>' +
      (rif ? '<p style="color:var(--ambar-oscuro);font-weight:bold">' + flag + ' ' + escHtml(rif) + '</p>' : '') +
    '</div>' +
    (perfil.direccionFiscal ? '<p style="margin-bottom:4px">📍 ' + escHtml(perfil.direccionFiscal) + '</p>' : '') +
    (perfil.telefono ? '<p style="margin-bottom:4px">📞 ' + escHtml(perfil.telefono) + '</p>' : '') +
    (perfil.emailContacto ? '<p style="margin-bottom:4px">📧 ' + escHtml(perfil.emailContacto) + '</p>' : '') +
    (perfil.personaContacto ? '<p style="margin-bottom:4px">👤 ' + escHtml(perfil.personaContacto) + '</p>' : '') +
    (!perfil.direccionFiscal && !perfil.telefono && !perfil.emailContacto && !perfil.rif
      ? '<p class="muted centrado" style="padding:12px">Completa los campos para ver la vista previa</p>' : '') +
  '</div>';
}