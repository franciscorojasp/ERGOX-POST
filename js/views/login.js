// =====================================================
// Login y registro — sin credenciales visibles en la UI.
// =====================================================

import { CFG } from '../config.js';
import { db } from '../core/db.js';
import { escHtml, toast, esEmailValido, passFuerte } from '../core/util.js';
import { NORMATIVAS } from '../content/datos.js';
import { renderDashboard } from './dashboard.js';

let modo = 'login';

export async function renderLogin(c) {
  modo = 'login';
  const enNube = db.nube();
  const paises = Object.keys(NORMATIVAS).map((k) => {
    const n = NORMATIVAS[k];
    return '<option value="' + k + '">' + n.flag + ' ' + n.nombre + '</option>';
  }).join('');

  c.innerHTML =
    '<div style="min-height:92vh;display:flex;align-items:center;justify-content:center;padding:20px">' +
      '<div class="card" style="max-width:460px;width:100%;padding:36px">' +
        '<div style="text-align:center;margin-bottom:24px">' +
          '<div style="font-size:56px;margin-bottom:8px">🛡️</div>' +
          '<h1 style="font-size:26px">ERGOX <span style="color:#EAB308">Post</span></h1>' +
          '<p class="muted">Publicaciones SST multinacional · VE · CO · MX · PE · AR · CL</p>' +
          '<span class="badge badge-info" style="margin-top:8px">' + (enNube ? '☁️ Modo nube (Sheets)' : '💻 Modo demo local') + '</span>' +
        '</div>' +

        '<div id="login-form">' +
          '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">' +
            '<label for="login-email">Correo electrónico</label>' +
            '<input id="login-email" type="email" autocomplete="email" placeholder="correo@empresa.com" />' +
            '<label for="login-pass">Contraseña</label>' +
            '<input id="login-pass" type="password" autocomplete="current-password" placeholder="••••••••" />' +
            '<div id="login-error" style="color:#DC2626;font-size:14px" class="hidden"></div>' +
            '<button class="btn" id="btn-login">🚀 Ingresar</button>' +
          '</div>' +
          '<p class="centrado muted">¿Primera vez? <button class="enlace" id="btn-ir-registro">Crea tu cuenta gratis (10 créditos)</button></p>' +
        '</div>' +

        '<div id="registro-form" class="hidden">' +
          '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">' +
            '<label for="reg-nombre">Nombre de la empresa</label>' +
            '<input id="reg-nombre" placeholder="Ej: Constructora Ávila C.A." />' +
            '<label for="reg-email">Correo electrónico</label>' +
            '<input id="reg-email" type="email" autocomplete="email" placeholder="correo@empresa.com" />' +
            '<label for="reg-pass">Contraseña (mín. 8 caracteres, letras y números)</label>' +
            '<input id="reg-pass" type="password" autocomplete="new-password" placeholder="••••••••" />' +
            '<label for="reg-pais">País principal</label>' +
            '<select id="reg-pais">' + paises + '</select>' +
            '<label for="reg-ref">Código de referido (opcional)</label>' +
            '<input id="reg-ref" placeholder="Ej: empresa@ergox.com" />' +
            '<div id="reg-error" style="color:#DC2626;font-size:14px" class="hidden"></div>' +
            '<button class="btn" id="btn-registro">🎉 Crear cuenta</button>' +
          '</div>' +
          '<p class="centrado muted">¿Ya tienes cuenta? <button class="enlace" id="btn-ir-login">Inicia sesión</button></p>' +
        '</div>' +

        (enNube ? '' :
          '<div style="margin-top:20px;padding:14px;background:var(--bg-alt);border-radius:12px;font-size:12px;color:var(--texto-suave)">' +
            '<p style="font-weight:bold;margin-bottom:6px">🔑 Acceso rápido (demo local)</p>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
              '<button class="btn btn-sm btn-oscuro" id="btn-demo-admin">👑 Admin demo</button>' +
              '<button class="btn btn-sm btn-oscuro" id="btn-demo-empresa">🏗️ Empresa demo</button>' +
            '</div>' +
            '<p style="margin-top:8px">Los datos viven solo en este dispositivo (localStorage). Sin backend desplegado, sin pagos reales.</p>' +
          '</div>') +
      '</div>' +
    '</div>';

  // ---- eventos login ----
  document.getElementById('btn-login').addEventListener('click', doLogin);
  document.getElementById('login-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('btn-ir-registro').addEventListener('click', () => cambiarModo('registro'));
  document.getElementById('btn-ir-login').addEventListener('click', () => cambiarModo('login'));

  const bAdmin = document.getElementById('btn-demo-admin');
  const bEmp = document.getElementById('btn-demo-empresa');
  if (bAdmin) bAdmin.addEventListener('click', () => doLoginDemo(CFG.DEMO_ADMIN.email, CFG.DEMO_ADMIN.pass));
  if (bEmp) bEmp.addEventListener('click', () => doLoginDemo(CFG.DEMO_EMPRESA.email, CFG.DEMO_EMPRESA.pass));

  document.getElementById('btn-registro').addEventListener('click', doRegistro);

  async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    const err = document.getElementById('login-error');
    err.classList.add('hidden');
    if (!esEmailValido(email)) { mostrarErr('Ingresa un correo válido'); return; }
    if (!pass) { mostrarErr('Ingresa tu contraseña'); return; }
    try {
      const r = await db.login(email, pass);
      if (r.ok) {
        toast('Bienvenido, ' + r.user.nombre, 'success');
        renderDashboard(c, r.user);
      } else {
        mostrarErr(r.error || 'Credenciales inválidas');
      }
    } catch (e) {
      mostrarErr(e.message || 'No se pudo iniciar sesión');
    }
  }

  async function doLoginDemo(email, pass) {
    try {
      const r = await db.login(email, pass);
      if (r.ok) { toast('Bienvenido, ' + r.user.nombre, 'success'); renderDashboard(c, r.user); }
    } catch (e) { toast(e.message || 'Error', 'error'); }
  }

  async function doRegistro() {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value;
    const pais = document.getElementById('reg-pais').value;
    const ref = document.getElementById('reg-ref').value.trim().toLowerCase();
    const err = document.getElementById('reg-error');
    err.classList.add('hidden');
    if (!nombre) { mostrarErrReg('Ingresa el nombre de la empresa'); return; }
    if (!esEmailValido(email)) { mostrarErrReg('Correo inválido'); return; }
    if (!passFuerte(pass)) { mostrarErrReg('La contraseña debe tener mínimo 8 caracteres con letras y números'); return; }
    try {
      const r = await db.registro({ nombre, email, pass, pais, ref });
      if (r.ok) {
        toast('Cuenta creada: +' + CFG.CREDITOS_TRIAL + ' créditos', 'success');
        renderDashboard(c, r.user);
      } else {
        mostrarErrReg(r.error || 'No se pudo crear la cuenta');
      }
    } catch (e) {
      mostrarErrReg(e.message || 'No se pudo crear la cuenta');
    }
  }

  function cambiarModo(m) {
    modo = m;
    document.getElementById('login-form').classList.toggle('hidden', m !== 'login');
    document.getElementById('registro-form').classList.toggle('hidden', m !== 'registro');
  }

  function mostrarErr(msg) {
    const err = document.getElementById('login-error');
    err.textContent = msg;
    err.classList.remove('hidden');
  }
  function mostrarErrReg(msg) {
    const err = document.getElementById('reg-error');
    err.textContent = msg;
    err.classList.remove('hidden');
  }
}