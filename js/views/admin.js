// =====================================================
// Admin — usuarios, créditos, parámetros y datos
// =====================================================

import { db, proveedorNube } from '../core/db.js';
import { escHtml, toast, fmtFecha, descargarTexto, esEmailValido, passFuerte } from '../core/util.js';
import { PARAMS_DEFAULT, montosTexto } from '../content/datos.js';
import { showModal, closeModal, confirmar } from '../core/ui.js';

export async function renderAdmin(c, sesion) {
  if (sesion.rol !== 'ADMIN') {
    c.innerHTML = '<div class="card"><p class="muted">Acceso restringido</p></div>';
    return;
  }
  const enNube = proveedorNube();
  const cache = await db.obtenerEstado();
  const users = await db.listarUsuarios();
  const historial = cache.historial || [];
  const leads = cache.leads || [];
  const ingresos = (cache.transacciones || []).filter((t) => t.estado === 'PAGADO').reduce((a, t) => a + (t.montoUsd || 0), 0);

  const pendientes = (cache.transacciones || []).filter((t) => t.estado === 'PENDIENTE');

  const userRows = users.map((u) =>
    '<tr>' +
      '<td><strong>' + escHtml(u.empresa || u.nombre) + '</strong></td>' +
      '<td>' + escHtml(u.email) + '</td>' +
      '<td><span class="badge ' + (u.rol === 'ADMIN' ? 'badge-admin' : 'badge-editor') + '">' + u.rol + '</span></td>' +
      '<td>' + u.cred + '</td>' +
      '<td>' + (u.activo === false ? '<span class="badge badge-alta">Inactivo</span>' : '<span class="badge badge-baja">Activo</span>') + '</td>' +
      '<td><button class="btn btn-sm" data-add-credit="' + escHtml(u.email) + '" style="font-size:11px">+50</button> ' +
      '<button class="btn btn-sm btn-danger" data-toggle-active="' + escHtml(u.email) + '" style="font-size:11px">' + (u.activo === false ? 'Activar' : 'Bloquear') + '</button></td>' +
    '</tr>'
  ).join('');

  const pendRows = pendientes.length === 0
    ? '<tr><td colspan="5" class="muted centrado">Sin pedidos pendientes</td></tr>'
    : pendientes.map((t) =>
        '<tr>' +
          '<td>' + escHtml(t.email || '—') + '</td>' +
          '<td>' + escHtml(t.planId || '') + '</td>' +
          '<td>$' + (t.montoUsd || 0).toFixed(2) + '</td>' +
          '<td><strong>' + escHtml(t.id) + '</strong></td>' +
          '<td><button class="btn btn-sm btn-success" data-confirm-pago="' + escHtml(t.id) + '" style="font-size:11px">✅ Confirmar</button></td>' +
        '</tr>'
      ).join('');

  const params = (await db.params()) || JSON.parse(JSON.stringify(PARAMS_DEFAULT));

  c.innerHTML =
    '<div class="grid-4 fade-in" style="margin-bottom:16px">' +
      '<div class="stat-card" style="background:#1F2937"><div class="icon">👥</div><div class="num">' + users.length + '</div><div class="label">Usuarios</div></div>' +
      '<div class="stat-card" style="background:#2563EB"><div class="icon">📸</div><div class="num">' + historial.length + '</div><div class="label">Posts generados</div></div>' +
      '<div class="stat-card" style="background:#7C3AED"><div class="icon">🧲</div><div class="num">' + leads.length + '</div><div class="label">Leads</div></div>' +
      '<div class="stat-card" style="background:#059669"><div class="icon">💰</div><div class="num">$' + ingresos.toFixed(2) + '</div><div class="label">Ingresos confirmados</div></div>' +
    '</div>' +

    '<div class="card fade-in" style="margin-bottom:16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
        '<h3 style="font-size:16px">💰 Pagos pendientes de confirmar (' + pendientes.length + ')</h3>' +
      '</div>' +
      '<div style="overflow-x:auto"><table><thead><tr><th>Usuario</th><th>Plan</th><th>Monto</th><th>Referencia</th><th>Acción</th></tr></thead><tbody>' + pendRows + '</tbody></table></div>' +
    '</div>' +

    '<div class="card fade-in" style="margin-bottom:16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
        '<h3 style="font-size:16px">🏢 Empresas registradas</h3>' +
        '<button class="btn btn-sm btn-blue" id="btn-add-user">➕ Nuevo usuario</button>' +
      '</div>' +
      '<div style="overflow-x:auto"><table><thead><tr><th>Empresa</th><th>Email</th><th>Rol</th><th>Créditos</th><th>Estado</th><th>Acción</th></tr></thead><tbody>' + userRows + '</tbody></table></div>' +
    '</div>' +

    '<div class="card fade-in" style="margin-bottom:16px">' +
      '<h3 style="font-size:16px;margin-bottom:12px">📐 Parámetros financieros y legales</h3>' +
      '<div class="grid-4" style="margin-bottom:12px">' +
        '<div><label for="pm-ut">UT VE (Bs)</label><input id="pm-ut" type="number" step="0.01" value="' + (params.ut[new Date().getFullYear()] || 320) + '" /></div>' +
        '<div><label for="pm-smm">SMMLV CO (COP)</label><input id="pm-smm" type="number" value="' + (params.smmlv[new Date().getFullYear()] || 1523500) + '" /></div>' +
        '<div><label for="pm-uma">UMA MX (MXN)</label><input id="pm-uma" type="number" step="0.01" value="' + (params.uma[new Date().getFullYear()] || 130.87) + '" /></div>' +
        '<div><label for="pm-uit">UIT PE (PEN)</label><input id="pm-uit" type="number" value="' + (params.uit[new Date().getFullYear()] || 5750) + '" /></div>' +
        '<div><label for="pm-utm">UTM CL (CLP)</label><input id="pm-utm" type="number" value="' + (params.utm[new Date().getFullYear()] || 67500) + '" /></div>' +
        '<div><label for="pm-ves">Tasa Bs/USD (manual)</label><input id="pm-ves" type="number" step="0.01" value="' + ((params.tasasManual && params.tasasManual.ves) || '') + '" placeholder="auto" /></div>' +
      '</div>' +
      '<label for="pm-disclaimer">Descargo legal de las publicaciones</label>' +
      '<textarea id="pm-disclaimer" rows="2" style="margin-top:8px;margin-bottom:12px">' + escHtml(params.disclaimer) + '</textarea>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<button class="btn btn-sm" id="btn-save-params">💾 Guardar parámetros</button>' +
        '<span class="muted">Ejemplo de multa VE: ' + escHtml(montosTexto('VE', params)) + '</span>' +
      '</div>' +
    '</div>' +

    '<div class="card fade-in">' +
      '<h3 style="font-size:16px;margin-bottom:12px">🛠️ Herramientas</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (enNube ? '' : '<button class="btn btn-sm btn-danger" id="btn-reset-data">🔄 Resetear datos locales</button>') +
        '<button class="btn btn-sm btn-blue" id="btn-export-state">💾 Exportar estado (JSON)</button>' +
      '</div>' +
      '<p class="muted" style="margin-top:12px">' + (enNube ? '☁️ Backend activo: Sheets' : '💻 Modo local: los datos viven en este dispositivo') + '</p>' +
    '</div>';

  // ---- eventos ----
  c.querySelectorAll('[data-add-credit]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.getAttribute('data-add-credit');
      await db.agregarCreditos(email, 50, 'Ajuste de admin', sesion.email);
      toast('+50 créditos a ' + email, 'success');
      renderAdmin(c, sesion);
    });
  });

  c.querySelectorAll('[data-toggle-active]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.getAttribute('data-toggle-active');
      const u = users.find((x) => x.email === email);
      await db.cambiarActivo(email, u.activo === false);
      toast(u.activo === false ? 'Usuario activado' : 'Usuario bloqueado', 'info');
      renderAdmin(c, sesion);
    });
  });

  c.querySelectorAll('[data-confirm-pago]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-confirm-pago');
      confirmar('Confirmar pago', '¿El pago con referencia ' + id + ' fue recibido? Se acreditarán los créditos al usuario.', async () => {
        await db.confirmarPago(id, id, sesion.email);
        toast('Pago confirmado: créditos acreditados', 'success');
        renderAdmin(c, sesion);
      }, 'Sí, confirmar pago');
    });
  });

  const bAdd = document.getElementById('btn-add-user');
  bAdd.addEventListener('click', () => {
    showModal(
      '<h2 style="font-size:18px;margin-bottom:16px">➕ Nuevo usuario</h2>' +
      '<label for="nu-nombre">Nombre</label><input id="nu-nombre" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="nu-email">Email</label><input id="nu-email" type="email" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="nu-pass">Contraseña (mín. 8 con letras y números)</label><input id="nu-pass" type="password" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="nu-empresa">Empresa</label><input id="nu-empresa" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="nu-cred">Créditos iniciales</label><input id="nu-cred" type="number" value="20" style="margin-bottom:12px;margin-top:8px" />' +
      '<label for="nu-rol">Rol</label>' +
      '<select id="nu-rol" style="margin-bottom:16px;margin-top:8px"><option value="EDITOR">✏️ EDITOR</option><option value="ADMIN">👑 ADMIN</option></select>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn" style="flex:1" id="btn-nu-save">Guardar</button>' +
        '<button class="btn btn-gris btn-sm" id="btn-nu-cancel">Cancelar</button>' +
      '</div>',
      () => {
        document.getElementById('btn-nu-cancel').addEventListener('click', closeModal);
        document.getElementById('btn-nu-save').addEventListener('click', async () => {
          const nombre = document.getElementById('nu-nombre').value.trim();
          const email = document.getElementById('nu-email').value.trim().toLowerCase();
          const pass = document.getElementById('nu-pass').value;
          const empresa = document.getElementById('nu-empresa').value.trim();
          const cred = parseInt(document.getElementById('nu-cred').value || '0', 10);
          const rol = document.getElementById('nu-rol').value;
          if (!nombre || !email || !pass) { toast('Completa los campos obligatorios', 'error'); return; }
          if (!esEmailValido(email)) { toast('Email inválido', 'error'); return; }
          if (!passFuerte(pass)) { toast('Contraseña débil (mín. 8 con letras y números)', 'error'); return; }
          const r = await db.crearUsuarioAdmin({ nombre, email, pass, empresa, cred, rol });
          if (r && r.ok === false) { toast(r.error || 'No se pudo crear', 'error'); return; }
          closeModal();
          toast('Usuario ' + nombre + ' creado', 'success');
          renderAdmin(c, sesion);
        });
      }
    );
  });

  document.getElementById('btn-save-params').addEventListener('click', async () => {
    const anno = new Date().getFullYear();
    const leer = (id, def) => { const v = document.getElementById(id).value; return v === '' ? def : Number(v); };
    params.ut[anno] = leer('pm-ut', 320);
    params.smmlv[anno] = leer('pm-smm', 1523500);
    params.uma[anno] = leer('pm-uma', 130.87);
    params.uit[anno] = leer('pm-uit', 5750);
    params.utm[anno] = leer('pm-utm', 67500);
    if (!params.tasasManual) params.tasasManual = {};
    const vves = document.getElementById('pm-ves').value;
    params.tasasManual.ves = vves === '' ? null : Number(vves);
    params.disclaimer = document.getElementById('pm-disclaimer').value.trim();
    await db.guardarParams(params);
    toast('Parámetros guardados', 'success');
    renderAdmin(c, sesion);
  });

  const bReset = document.getElementById('btn-reset-data');
  if (bReset) bReset.addEventListener('click', () => {
    confirmar('Resetear todos los datos', 'Se eliminará todo (usuarios, historial, leads). Esta acción no se puede deshacer.', async () => {
      await db.resetLocal();
      const { renderLogin } = await import('./login.js');
      document.getElementById('app-header').classList.add('hidden');
      document.getElementById('app-nav').classList.add('hidden');
      renderLogin(document.getElementById('app'));
      toast('Datos locales reseteados', 'info');
    }, 'Sí, resetear todo');
  });

  const bExp = document.getElementById('btn-export-state');
  bExp.addEventListener('click', async () => {
    const cache = await db.obtenerEstado();
    descargarTexto(JSON.stringify({ version: '3.0', exportado: new Date().toISOString(), ...cache, usuarios: await db.listarUsuarios() }, null, 2), 'ERGOX_Estado_' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
    toast('Estado exportado', 'success');
  });
}