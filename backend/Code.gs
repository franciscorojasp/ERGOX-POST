// =====================================================================
// ERGOX POST — Backend (Google Apps Script)
// API REST de costo $0 sobre Google Sheets.
//
// Despliegue: Implementar → Nueva implementación → Aplicación web →
//   Ejecutar como: Tú ("Yo") · Acceso: Cualquier persona.
// La URL resultante (/exec) y la API_KEY se copian en js/config.js
// del frontend (SHEETS_ENDPOINT / SHEETS_API_KEY).
//
// Instrucciones completas en backend/README.md
// =====================================================================

// ---------------------------------------------------------------------
// CONFIGURACIÓN — ¡cambia la API key antes de producción!
// ---------------------------------------------------------------------
var API_KEY = 'cambia-esta-clave-antes-de-producir';
var ADMIN_EMAIL = 'admin@ergox.com';
var ADMIN_PASS_DEFAULT = 'Admin2026!'; // solo para el setup inicial; cámbiala tras el primer acceso
var SESSION_DIAS = 30;                 // vigencia de sesión
var CREDITOS_TRIAL = 10;               // bienvenida al registrarse
var CREDITOS_REFERIDO_NUEVO = 10;      // bonus al nuevo usuario por referido
var CREDITOS_REFERENTE = 5;            // bonus al referente
var MAX_PUBLICAS_HORA = 30;            // rate-limit aprox. por email/lm
var MAX_SESION_HORA = 120;             // rate-limit por token de sesión
var SS_ID_KEY = 'ERGOX_SS_ID';         // propiedad donde se guarda el ID de la hoja

// ---------------------------------------------------------------------
// PUNTO DE ENTRADA (Web App)
// ---------------------------------------------------------------------
function doPost(e) {
  try {
    // El frontend envía JSON en text/plain: {key, action, token, payload}
    var cuerpo = {};
    if (e && e.postData && e.postData.contents) {
      try { cuerpo = JSON.parse(e.postData.contents); } catch (err) { cuerpo = {}; }
    }
    // Soporte adicional: parámetros de formulario / query string
    if (e && e.parameter) {
      for (var k in e.parameter) {
        if (Object.prototype.hasOwnProperty.call(e.parameter, k)) cuerpo[k] = e.parameter[k];
      }
    }
    var key = String(cuerpo.key || '');
    if (key !== API_KEY) return responder(null, false, 'API key inválida', 'BAD_KEY');
    var action = String(cuerpo.action || '');
    var payload = (cuerpo.payload && typeof cuerpo.payload === 'object') ? cuerpo.payload : {};
    var token = String(cuerpo.token || '');
    return ejecutarAccion(action, payload, token);
  } catch (err) {
    Logger.log('doPost interno: ' + (err && err.message ? err.message : err));
    return responder(null, false, 'Error interno del servidor', 'INTERNAL');
  }
}

function doGet() {
  var info = {
    app: 'ERGOX Post API',
    ok: true,
    acciones: Object.keys(ACCIONES).sort(),
    instrucciones: 'Usa POST con JSON {key, action, payload, token} en text/plain.',
  };
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: info }))
    .setMimeType(ContentService.MimeType.TEXT);
}

// ---------------------------------------------------------------------
// ROUTER DE ACCIONES
// pub:  acción pública (sin token). admin: requiere rol ADMIN.
// ---------------------------------------------------------------------
var ACCIONES = {
  GET_SALT:            { pub: true,  fn: accionGetSalt },
  AUTH:                { pub: true,  fn: accionAuth },
  REGISTER:            { pub: true,  fn: accionRegister },
  SESSION_RESTORE:     { pub: false, fn: accionSessionRestore },
  LOGOUT:              { pub: false, fn: accionLogout },
  GET_STATE:           { pub: false, fn: accionGetState },
  SAVE_POST:           { pub: false, fn: accionSavePost },
  DELETE_POST:         { pub: false, fn: accionDeletePost },
  UPDATE_METRICAS:     { pub: false, fn: accionUpdateMetricas },
  CREATE_LM:           { pub: false, fn: accionCreateLm },
  GET_LM:              { pub: true,  fn: accionGetLm },
  CAPTURE_LEAD:        { pub: true,  fn: accionCaptureLead },
  BUY_PLAN:            { pub: false, fn: accionBuyPlan },
  CONFIRM_PAYMENT:     { pub: false, admin: true, fn: accionConfirmPayment },
  GET_CREDITS:         { pub: false, fn: accionGetCredits },
  CONSUME_CREDIT:      { pub: false, fn: accionConsumeCredit },
  SET_PERFIL:          { pub: false, fn: accionSetPerfil },
  ADMIN_LIST_USERS:    { pub: false, admin: true, fn: accionAdminListUsers },
  ADMIN_CREATE_USER:   { pub: false, admin: true, fn: accionAdminCreateUser },
  ADMIN_TOGGLE_ACTIVE: { pub: false, admin: true, fn: accionAdminToggleActive },
  ADMIN_ADD_CREDITS:   { pub: false, admin: true, fn: accionAdminAddCredits },
  ADMIN_SET_ROL:       { pub: false, admin: true, fn: accionAdminSetRol },
  SET_PARAMS:          { pub: false, admin: true, fn: accionSetParams },
  GET_REPORTS:         { pub: false, admin: true, fn: accionGetReports },
};

function ejecutarAccion(action, payload, token) {
  var def = ACCIONES[action];
  if (!def) return responder(null, false, 'Acción desconocida: ' + action, 'UNKNOWN_ACTION');
  var ss = getSS();
  var claveLimite = '';
  var sesion = null;
  if (def.pub) {
    // aproximación de IP: se limita por email o lead magnet involucrado
    claveLimite = 'pub:' + action + ':' + (payload.email || payload.lmId || 'anónimo');
  } else {
    sesion = validarSesion(ss, token);
    if (!sesion) return responder(null, false, 'Sesión inválida o expirada', 'UNAUTHORIZED');
    sesion.token = token;
    if (sesion.user && sesion.user.activo === false) {
      return responder(null, false, 'Cuenta bloqueada. Contacta al administrador', 'ACCOUNT_BLOCKED');
    }
    if (def.admin && sesion.user.rol !== 'ADMIN') {
      return responder(null, false, 'Requiere permisos de administrador', 'FORBIDDEN');
    }
    claveLimite = 'ses:' + token;
  }
  if (!chequearLimite(claveLimite, def.pub ? MAX_PUBLICAS_HORA : MAX_SESION_HORA)) {
    return responder(null, false, 'Demasiadas solicitudes. Intenta más tarde', 'RATE_LIMIT');
  }
  var r = def.fn(ss, payload, sesion);
  if (r && r.error) return responder(null, false, r.error, r.code || 'ERROR');
  return responder(r ? r.data : {}, true);
}

// ---------------------------------------------------------------------
// RESPONDE {ok:true,data} | {ok:false,error,code} como text/plain
// ---------------------------------------------------------------------
function responder(data, ok, error, code) {
  var obj = ok
    ? { ok: true, data: data || {} }
    : { ok: false, error: error || 'Error', code: code || 'ERROR' };
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.TEXT);
}

// ---------------------------------------------------------------------
// CÓDIGO PRINCIPAL DE ACCIONES
// ---------------------------------------------------------------------

// Público: devuelve el salt del usuario o uno FAKE determinista.
function accionGetSalt(ss, p) {
  var email = sanitizarTexto(p.email).toLowerCase();
  var u = usuarioPorEmail(ss, email);
  return { data: { salt: u ? u.salt : saltFalso(email) } };
}

// Público: login {email, hash} → {user, token} (sesión de 30 días)
function accionAuth(ss, p) {
  var email = sanitizarTexto(p.email).toLowerCase();
  var hash = sanitizarTexto(p.hash);
  if (!email || !hash) return { error: 'Faltan credenciales', code: 'BAD_REQUEST' };
  return conLock(function () {
    var u = usuarioPorEmail(ss, email);
    if (!u || String(u.hash).trim() !== String(hash).trim()) {
      return { error: 'Credenciales inválidas', code: 'BAD_CREDENTIALS' };
    }
    if (u.activo === false) return { error: 'Cuenta bloqueada. Contacta al administrador', code: 'ACCOUNT_BLOCKED' };
    var token = crearSesion(ss, email);
    auditar(ss, email, 'AUTH', 'Inicio de sesión');
    return { data: { user: userPublico(u), token: token } };
  });
}

// Público: registro con trial y referidos {email,nombre,empresa,pais,ref,salt,hash}
function accionRegister(ss, p) {
  var email = sanitizarTexto(p.email).toLowerCase();
  var nombre = sanitizarTexto(p.nombre);
  var empresa = sanitizarTexto(p.empresa);
  var pais = sanitizarTexto(p.pais);
  var ref = sanitizarTexto(p.ref).toLowerCase();
  var salt = sanitizarTexto(p.salt);
  var hash = sanitizarTexto(p.hash);
  if (!email || !nombre || !salt || !hash) return { error: 'Faltan datos obligatorios', code: 'BAD_REQUEST' };
  if (!esEmailValido(email)) return { error: 'Correo inválido', code: 'BAD_EMAIL' };
  return conLock(function () {
    if (usuarioPorEmail(ss, email)) return { error: 'El correo ya está registrado', code: 'EMAIL_EXISTS' };
    var referente = null;
    if (ref) {
      var usuarios = leerFilas(ss, HOJAS.USERS);
      for (var i = 0; i < usuarios.length; i++) {
        if (String(usuarios[i].email).toLowerCase() === ref ||
            String(usuarios[i].refCode).toLowerCase() === ref) {
          referente = usuarios[i];
          break;
        }
      }
    }
    var cred = CREDITOS_TRIAL;
    if (referente && String(referente.email).toLowerCase() !== email) {
      cred += CREDITOS_REFERIDO_NUEVO;
      sumarCreditos(ss, referente.email, CREDITOS_REFERENTE, 'Bono por referido: ' + email);
      auditar(ss, referente.email, 'REGISTER_REF', 'Referido activado: ' + email + ' (+' + CREDITOS_REFERENTE + ')');
    }
    var u = crearUsuario(ss, {
      email: email, nombre: nombre, empresa: empresa, rol: 'EDITOR',
      cred: cred, salt: salt, hash: hash, perfil: { pais: pais },
      referidoPor: referente ? referente.email : '',
    });
    var token = crearSesion(ss, email);
    auditar(ss, email, 'REGISTER', 'Cuenta creada con ' + cred + ' créditos');
    return { data: { user: userPublico(u), token: token } };
  });
}

// Sesión: valida token → {user}
function accionSessionRestore(ss, p, sesion) {
  return { data: { user: userPublico(sesion.user) } };
}

// Sesión: borra el token
function accionLogout(ss, p, sesion) {
  borrarSesion(ss, sesion.token);
  return { data: {} };
}

// Sesión: estado completo del usuario
function accionGetState(ss, p, sesion) {
  var u = sesion.user;
  var esAdmin = u.rol === 'ADMIN';
  var posts = leerFilas(ss, HOJAS.POSTS).filter(function (x) { return esAdmin || x.email === u.email; });
  var lms = leerFilas(ss, HOJAS.LEAD_MAGNETS);
  var leads = leerFilas(ss, HOJAS.LEADS);
  var txns = leerFilas(ss, HOJAS.TRANSACCIONES).filter(function (x) { return esAdmin || x.email === u.email; });
  posts.sort(porFechaDesc);
  lms.sort(porFechaDesc);
  leads.sort(porFechaDesc);
  txns.sort(porFechaDesc);
  var params = leerConfig(ss, 'parametros', null);
  if (params && typeof params === 'object' && Object.keys(params).length === 0) params = null;
  return {
    data: {
      historial: posts.map(function (x) { return parseJSON(x.postJSON, {}); }),
      leads: leads,
      leadMagnets: lms,
      transacciones: txns,
      params: params,
      perfil: parseJSON(u.perfilJSON, {}),
      cred: Number(u.cred || 0),
    },
  };
}

// Sesión: guarda un post del usuario e incrementa su contador
function accionSavePost(ss, p, sesion) {
  var post = sanitizarObjeto(p.post);
  if (!post || typeof post !== 'object' || Array.isArray(post)) {
    return { error: 'Post inválido', code: 'BAD_REQUEST' };
  }
  return conLock(function () {
    var id = String(post.id || '');
    if (!id) id = nuevoId('P-');
    if (!post.fecha) post.fecha = new Date().toISOString();
    post.id = id;
    if (buscarFila(ss, HOJAS.POSTS, 'id', id) > 0) return { error: 'El post ya existe', code: 'POST_EXISTS' };
    agregarFila(ss, HOJAS.POSTS, {
      id: id, email: sesion.user.email, postJSON: JSON.stringify(post), fecha: post.fecha,
    });
    var contador = leerConfig(ss, 'contadorPosts', {});
    if (!contador || typeof contador !== 'object') contador = {};
    contador[sesion.user.email] = (Number(contador[sesion.user.email]) || 0) + 1;
    escribirConfig(ss, 'contadorPosts', contador);
    auditar(ss, sesion.user.email, 'SAVE_POST', 'Post ' + id);
    return { data: { post: post } };
  });
}

// Sesión: borra un post propio (o cualquiera si eres admin)
function accionDeletePost(ss, p, sesion) {
  var id = sanitizarTexto(p.id);
  if (!id) return { error: 'Falta el id del post', code: 'BAD_REQUEST' };
  return conLock(function () {
    var fila = buscarFila(ss, HOJAS.POSTS, 'id', id);
    if (fila <= 0) return { error: 'Post no encontrado', code: 'NOT_FOUND' };
    var email = String(hoja(ss, HOJAS.POSTS).getRange(fila, 2).getValue());
    if (email !== sesion.user.email && sesion.user.rol !== 'ADMIN') {
      return { error: 'No autorizado', code: 'FORBIDDEN' };
    }
    hoja(ss, HOJAS.POSTS).deleteRow(fila);
    auditar(ss, sesion.user.email, 'DELETE_POST', 'Post ' + id);
    return { data: {} };
  });
}

// Sesión: actualiza métricas de un post propio
function accionUpdateMetricas(ss, p, sesion) {
  var id = sanitizarTexto(p.id);
  var metricas = sanitizarObjeto(p.metricas || {});
  if (!id) return { error: 'Falta el id del post', code: 'BAD_REQUEST' };
  return conLock(function () {
    var fila = buscarFila(ss, HOJAS.POSTS, 'id', id);
    if (fila <= 0) return { error: 'Post no encontrado', code: 'NOT_FOUND' };
    var h = hoja(ss, HOJAS.POSTS);
    var email = String(h.getRange(fila, 2).getValue());
    if (email !== sesion.user.email && sesion.user.rol !== 'ADMIN') {
      return { error: 'No autorizado', code: 'FORBIDDEN' };
    }
    var post = parseJSON(h.getRange(fila, 3).getValue(), {});
    post.metricas = metricas;
    h.getRange(fila, 3).setValue(JSON.stringify(post));
    return { data: { post: post } };
  });
}

// Sesión: crea un lead magnet {lm:{id,titulo,url,pais,creado}}
function accionCreateLm(ss, p) {
  var lm = sanitizarObjeto(p.lm);
  if (!lm || typeof lm !== 'object' || !lm.titulo) {
    return { error: 'Faltan datos del lead magnet', code: 'BAD_REQUEST' };
  }
  if (!lm.id) lm.id = nuevoId('LM-');
  if (!lm.creado) lm.creado = new Date().toISOString();
  if (!lm.url) lm.url = '';
  agregarFila(ss, HOJAS.LEAD_MAGNETS, {
    id: lm.id, titulo: lm.titulo, url: lm.url, pais: lm.pais || '', creado: lm.creado,
  });
  return { data: { lm: lm } };
}

// Público: info básica de un lead magnet para la landing
function accionGetLm(ss, p) {
  var id = sanitizarTexto(p.lmId);
  if (!id) return { error: 'Falta el id del recurso', code: 'BAD_REQUEST' };
  var lms = leerFilas(ss, HOJAS.LEAD_MAGNETS);
  for (var i = 0; i < lms.length; i++) {
    if (lms[i].id === id) {
      return { data: { lm: { id: lms[i].id, titulo: lms[i].titulo, url: lms[i].url } } };
    }
  }
  return { error: 'Recurso no encontrado', code: 'LM_NOT_FOUND' };
}

// Público: registra un lead {lmId, datos:{nombre,email,empresa,telefono,consentimiento}}
function accionCaptureLead(ss, p) {
  var lmId = sanitizarTexto(p.lmId);
  var datos = sanitizarObjeto(p.datos || {});
  var nombre = String(datos.nombre || '').trim();
  var email = String(datos.email || '').trim().toLowerCase();
  if (!lmId || !nombre || !email) return { error: 'Faltan datos del lead', code: 'BAD_REQUEST' };
  if (!esEmailValido(email)) return { error: 'Correo inválido', code: 'BAD_EMAIL' };
  return conLock(function () {
    var recurso = '';
    var lms = leerFilas(ss, HOJAS.LEAD_MAGNETS);
    for (var i = 0; i < lms.length; i++) {
      if (lms[i].id === lmId) { recurso = String(lms[i].titulo || ''); break; }
    }
    var consent = datos.consentimiento !== undefined ? datos.consentimiento : datos.consent;
    var lead = {
      id: nuevoId('L-'), lmId: lmId, recurso: recurso,
      nombre: nombre, email: email, empresa: String(datos.empresa || ''),
      telefono: String(datos.telefono || ''), consentimiento: consent === true || consent === 'true',
      fecha: new Date().toISOString(),
    };
    agregarFila(ss, HOJAS.LEADS, lead);
    auditar(ss, email, 'CAPTURE_LEAD', recurso ? ('Lead magnet: ' + recurso) : lmId);
    return { data: { lead: lead } };
  });
}

// Sesión: crea un intento de pago PENDIENTE {plan:{id,precio,creditos}, email}
function accionBuyPlan(ss, p, sesion) {
  var plan = sanitizarObjeto(p.plan);
  if (!plan || typeof plan !== 'object' || !plan.id) return { error: 'Plan inválido', code: 'BAD_REQUEST' };
  var email = sanitizarTexto(p.email).toLowerCase();
  if (!email) email = sesion.user.email;
  if (email !== sesion.user.email && sesion.user.rol !== 'ADMIN') {
    return { error: 'No autorizado', code: 'FORBIDDEN' };
  }
  var intento = {
    id: nuevoId('ERGOX-'), email: email, tipo: 'compra',
    detalle: 'Compra plan ' + plan.id, monto: Number(plan.creditos || 0),
    montoUsd: Number(plan.precio || 0), planId: plan.id, estado: 'PENDIENTE',
    ref: '', confirmadoPor: '', fecha: new Date().toISOString(),
  };
  agregarFila(ss, HOJAS.TRANSACCIONES, intento);
  auditar(ss, email, 'BUY_PLAN', 'Plan ' + plan.id + ' $' + Number(plan.precio || 0).toFixed(2) + ' ref ' + intento.id);
  return { data: { intento: intento } };
}

// Admin: confirma un pago, marca PAGADO y acredita créditos → {t}
function accionConfirmPayment(ss, p, sesion) {
  var intentoId = sanitizarTexto(p.intentoId);
  var ref = sanitizarTexto(p.ref) || intentoId;
  var adminEmail = sanitizarTexto(p.adminEmail) || sesion.user.email;
  if (!intentoId) return { error: 'Falta el id del intento', code: 'BAD_REQUEST' };
  return conLock(function () {
    var fila = buscarFila(ss, HOJAS.TRANSACCIONES, 'id', intentoId);
    if (fila <= 0) return { error: 'Intento de pago no encontrado', code: 'TX_NOT_FOUND' };
    var t = filaAObjeto(ss, HOJAS.TRANSACCIONES, fila);
    if (t.estado === 'PAGADO') return { data: { t: t } }; // idempotente
    actualizarFila(ss, HOJAS.TRANSACCIONES, fila, {
      estado: 'PAGADO', ref: ref, confirmadoPor: adminEmail,
    });
    acreditar(ss, t.email, Number(t.monto || 0));
    auditar(ss, adminEmail, 'CONFIRM_PAYMENT', intentoId + ' → ' + t.email + ' +' + String(t.monto || 0) + ' créditos');
    t = filaAObjeto(ss, HOJAS.TRANSACCIONES, fila);
    t.confirmado = t.fecha;
    return { data: { t: t } };
  });
}

// Sesión: créditos de un usuario (propio o admin) → {cred}
function accionGetCredits(ss, p, sesion) {
  var email = sanitizarTexto(p.email).toLowerCase();
  if (!email) email = sesion.user.email;
  if (email !== sesion.user.email && sesion.user.rol !== 'ADMIN') {
    return { error: 'No autorizado', code: 'FORBIDDEN' };
  }
  var u = usuarioPorEmail(ss, email);
  if (!u) return { error: 'Usuario no encontrado', code: 'NOT_FOUND' };
  return { data: { cred: Number(u.cred || 0) } };
}

// Sesión: descuenta créditos; si faltan → error NO_CREDIT
function accionConsumeCredit(ss, p, sesion) {
  var email = sanitizarTexto(p.email).toLowerCase();
  var n = Number(p.n || 1);
  var detalle = sanitizarTexto(p.detalle) || 'Consumo de crédito';
  if (!email) email = sesion.user.email;
  if (email !== sesion.user.email && sesion.user.rol !== 'ADMIN') {
    return { error: 'No autorizado', code: 'FORBIDDEN' };
  }
  if (!(n > 0)) return { error: 'Cantidad inválida', code: 'BAD_REQUEST' };
  return conLock(function () {
    var fila = buscarFila(ss, HOJAS.USERS, 'email', email);
    if (fila <= 0) return { error: 'Usuario no encontrado', code: 'NOT_FOUND' };
    var u = filaAObjeto(ss, HOJAS.USERS, fila);
    if (Number(u.cred || 0) < n) return { error: 'Créditos insuficientes', code: 'NO_CREDIT' };
    var nuevo = Number(u.cred || 0) - n;
    actualizarFila(ss, HOJAS.USERS, fila, { cred: nuevo });
    auditar(ss, email, 'CONSUME_CREDIT', detalle + ' (-' + n + ')');
    return { data: { cred: nuevo } };
  });
}

// Sesión: guarda el perfil del usuario (y la empresa si llega nombreEmpresa)
function accionSetPerfil(ss, p, sesion) {
  var perfil = sanitizarObjeto(p.perfil);
  if (!perfil || typeof perfil !== 'object' || Array.isArray(perfil)) {
    return { error: 'Perfil inválido', code: 'BAD_REQUEST' };
  }
  return conLock(function () {
    var fila = buscarFila(ss, HOJAS.USERS, 'email', sesion.user.email);
    if (fila <= 0) return { error: 'Usuario no encontrado', code: 'NOT_FOUND' };
    var actual = parseJSON(filaAObjeto(ss, HOJAS.USERS, fila).perfilJSON, {});
    var nuevo = {};
    for (var k in actual) {
      if (Object.prototype.hasOwnProperty.call(actual, k)) nuevo[k] = actual[k];
    }
    for (var k2 in perfil) {
      if (Object.prototype.hasOwnProperty.call(perfil, k2)) nuevo[k2] = perfil[k2];
    }
    var cambios = { perfilJSON: JSON.stringify(nuevo) };
    if (perfil.nombreEmpresa) cambios.empresa = perfil.nombreEmpresa;
    actualizarFila(ss, HOJAS.USERS, fila, cambios);
    auditar(ss, sesion.user.email, 'SET_PERFIL', 'Perfil actualizado');
    return { data: { perfil: nuevo } };
  });
}

// Admin: lista de usuarios (array directo, como espera el frontend)
function accionAdminListUsers(ss) {
  var filas = leerFilas(ss, HOJAS.USERS);
  var lista = filas.map(function (u) {
    return {
      email: u.email, nombre: u.nombre, rol: u.rol, empresa: u.empresa,
      cred: Number(u.cred || 0), activo: u.activo !== false, creado: u.creado,
      refCode: u.refCode,
    };
  });
  lista.sort(function (a, b) { return String(a.creado).localeCompare(String(b.creado)); });
  return { data: lista };
}

// Admin: crea usuario con salt/hash provistos por el cliente
function accionAdminCreateUser(ss, p, sesion) {
  var datos = sanitizarObjeto(p.datos || {});
  var email = String(datos.email || '').toLowerCase().trim();
  var nombre = String(datos.nombre || '').trim();
  var rol = datos.rol === 'ADMIN' ? 'ADMIN' : 'EDITOR';
  var salt = String(datos.salt || '').trim();
  var hash = String(datos.hash || '').trim();
  if (!email || !nombre || !salt || !hash) return { error: 'Faltan datos obligatorios', code: 'BAD_REQUEST' };
  if (!esEmailValido(email)) return { error: 'Correo inválido', code: 'BAD_EMAIL' };
  return conLock(function () {
    if (usuarioPorEmail(ss, email)) return { error: 'El correo ya existe', code: 'EMAIL_EXISTS' };
    var u = crearUsuario(ss, {
      email: email, nombre: nombre, empresa: String(datos.empresa || ''),
      rol: rol, cred: Number(datos.cred || 0), salt: salt, hash: hash,
      perfil: {}, referidoPor: '',
    });
    auditar(ss, sesion.user.email, 'ADMIN_CREATE_USER', 'Creado ' + email + ' (' + rol + ')');
    return { data: { user: userPublico(u) } };
  });
}

// Admin: activa/bloquea un usuario
function accionAdminToggleActive(ss, p, sesion) {
  var email = sanitizarTexto(p.email).toLowerCase();
  var activo = p.activo === true || p.activo === 'true';
  if (!email) return { error: 'Falta el email', code: 'BAD_REQUEST' };
  if (email === sesion.user.email) return { error: 'No puedes bloquear tu propia cuenta', code: 'FORBIDDEN' };
  return conLock(function () {
    var fila = buscarFila(ss, HOJAS.USERS, 'email', email);
    if (fila <= 0) return { error: 'Usuario no encontrado', code: 'NOT_FOUND' };
    actualizarFila(ss, HOJAS.USERS, fila, { activo: activo });
    auditar(ss, sesion.user.email, 'ADMIN_TOGGLE_ACTIVE', email + ' → ' + (activo ? 'activo' : 'bloqueado'));
    return { data: { email: email, activo: activo } };
  });
}

// Admin: añade créditos a un usuario (registra movimiento de ajuste)
function accionAdminAddCredits(ss, p, sesion) {
  var email = sanitizarTexto(p.email).toLowerCase();
  var n = Number(p.n || 0);
  var motivo = sanitizarTexto(p.motivo) || 'Ajuste de créditos';
  var adminEmail = sanitizarTexto(p.adminEmail) || sesion.user.email;
  if (!email || n === 0) return { error: 'Faltan datos (email y n)', code: 'BAD_REQUEST' };
  return conLock(function () {
    var fila = buscarFila(ss, HOJAS.USERS, 'email', email);
    if (fila <= 0) return { error: 'Usuario no encontrado', code: 'NOT_FOUND' };
    var cred = sumarCreditos(ss, email, n, motivo + ' (admin: ' + adminEmail + ')');
    auditar(ss, adminEmail, 'ADMIN_ADD_CREDITS', email + ' ' + (n > 0 ? '+' : '') + n + ' — ' + motivo);
    return { data: { cred: cred } };
  });
}

// Admin: cambia el rol de un usuario
function accionAdminSetRol(ss, p, sesion) {
  var email = sanitizarTexto(p.email).toLowerCase();
  var rol = p.rol === 'ADMIN' ? 'ADMIN' : 'EDITOR';
  var adminEmail = sanitizarTexto(p.adminEmail) || sesion.user.email;
  if (!email) return { error: 'Falta el email', code: 'BAD_REQUEST' };
  if (email === sesion.user.email) return { error: 'No puedes cambiar tu propio rol', code: 'FORBIDDEN' };
  return conLock(function () {
    var fila = buscarFila(ss, HOJAS.USERS, 'email', email);
    if (fila <= 0) return { error: 'Usuario no encontrado', code: 'NOT_FOUND' };
    actualizarFila(ss, HOJAS.USERS, fila, { rol: rol });
    auditar(ss, adminEmail, 'ADMIN_SET_ROL', email + ' → ' + rol);
    return { data: { email: email, rol: rol } };
  });
}

// Admin: guarda parámetros globales (JSON libre) en CONFIG
function accionSetParams(ss, p, sesion) {
  var params = sanitizarObjeto(p.params);
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return { error: 'Parámetros inválidos', code: 'BAD_REQUEST' };
  }
  escribirConfig(ss, 'parametros', params);
  auditar(ss, sesion.user.email, 'SET_PARAMS', 'Parámetros guardados');
  return { data: { params: params } };
}

// Admin: reporte global {transacciones, usuarios, totalIngresos}
function accionGetReports(ss) {
  var txns = leerFilas(ss, HOJAS.TRANSACCIONES);
  var usuarios = leerFilas(ss, HOJAS.USERS);
  var totalIngresos = 0;
  for (var i = 0; i < txns.length; i++) {
    if (txns[i].estado === 'PAGADO') totalIngresos += Number(txns[i].montoUsd || 0);
  }
  return {
    data: {
      transacciones: txns,
      usuarios: usuarios.map(function (u) {
        return {
          email: u.email, nombre: u.nombre, rol: u.rol, empresa: u.empresa,
          cred: Number(u.cred || 0), activo: u.activo !== false, creado: u.creado,
        };
      }),
      totalIngresos: totalIngresos,
    },
  };
}

// ---------------------------------------------------------------------
// HOJAS Y ESQUEMA (coinciden con el contrato)
// ---------------------------------------------------------------------
var HOJAS = {
  USERS: 'USERS',
  SESSIONS: 'SESSIONS',
  POSTS: 'POSTS',
  LEADS: 'LEADS',
  LEAD_MAGNETS: 'LEAD_MAGNETS',
  TRANSACCIONES: 'TRANSACCIONES',
  AUDIT_LOG: 'AUDIT_LOG',
  CONFIG: 'CONFIG',
};

function getSS() {
  var id = PropertiesService.getScriptProperties().getProperty(SS_ID_KEY);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* cae al activo */ }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function hoja(ss, nombre) {
  var h = ss.getSheetByName(nombre);
  if (!h) throw new Error('Hoja no encontrada: ' + nombre + '. ¿Ejecutaste setup()?');
  return h;
}

// Lee una hoja y devuelve array de objetos {encabezado: valor}
function leerFilas(ss, nombre) {
  var h = hoja(ss, nombre);
  var valores = h.getDataRange().getValues();
  if (!valores.length) return [];
  var headers = valores[0];
  var filas = [];
  for (var i = 1; i < valores.length; i++) {
    var fila = valores[i];
    if (fila[0] === '' || fila[0] === null || fila[0] === undefined) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var col = String(headers[j]);
      if (col === 'perfilJSON' || col === 'postJSON' || col === 'valorJSON') {
        obj[col] = parseJSON(fila[j], col === 'valorJSON' ? null : {});
      } else {
        obj[col] = fila[j];
      }
    }
    filas.push(obj);
  }
  return filas;
}

// Fila individual (por número de fila en la hoja, 1 = encabezados)
function filaAObjeto(ss, nombre, filaHoja) {
  var h = hoja(ss, nombre);
  var headers = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  var valores = h.getRange(filaHoja, 1, 1, headers.length).getValues()[0];
  var obj = {};
  for (var j = 0; j < headers.length; j++) obj[String(headers[j])] = valores[j];
  return obj;
}

// Anexa una fila mapeando el objeto contra los encabezados
function agregarFila(ss, nombre, datos) {
  var h = hoja(ss, nombre);
  var headers = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  var fila = headers.map(function (c) {
    var v = datos[c];
    if (v === undefined || v === null) v = '';
    if (typeof v === 'object') v = JSON.stringify(v);
    return v;
  });
  h.appendRow(fila);
  return fila;
}

// Actualiza celda(s) de una fila existente (por encabezado)
function actualizarFila(ss, nombre, filaHoja, cambios) {
  var h = hoja(ss, nombre);
  var headers = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  for (var j = 0; j < headers.length; j++) {
    var col = String(headers[j]);
    if (Object.prototype.hasOwnProperty.call(cambios, col)) {
      var v = cambios[col];
      if (v !== null && typeof v === 'object') v = JSON.stringify(v);
      h.getRange(filaHoja, j + 1).setValue(v);
    }
  }
}

// Busca la primera fila (número de fila en la hoja) donde colName == valor
function buscarFila(ss, nombre, colName, valor) {
  var h = hoja(ss, nombre);
  var headers = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  var j = headers.indexOf(colName);
  if (j < 0) return -1;
  var n = h.getLastRow() - 1;
  if (n <= 0) return -1;
  var col = h.getRange(2, j + 1, n, 1).getValues();
  var buscado = String(valor).toLowerCase();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).toLowerCase() === buscado) return i + 2;
  }
  return -1;
}

// ---- CONFIG ----
function leerConfig(ss, clave, def) {
  var filas = leerFilas(ss, HOJAS.CONFIG);
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].clave) === clave) {
      return filas[i].valorJSON !== undefined ? filas[i].valorJSON : def;
    }
  }
  return def;
}

function escribirConfig(ss, clave, valor) {
  var fila = buscarFila(ss, HOJAS.CONFIG, 'clave', clave);
  var v = valor;
  if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
  if (fila > 0) {
    hoja(ss, HOJAS.CONFIG).getRange(fila, 2).setValue(v);
  } else {
    hoja(ss, HOJAS.CONFIG).appendRow([clave, v]);
  }
}

// ---- USERS ----
function usuarioPorEmail(ss, email) {
  var filas = leerFilas(ss, HOJAS.USERS);
  var e = String(email || '').toLowerCase().trim();
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].email).toLowerCase() === e) return filas[i];
  }
  return null;
}

function crearUsuario(ss, u) {
  var fila = {
    email: String(u.email || '').toLowerCase().trim(),
    nombre: String(u.nombre || '').trim(),
    rol: u.rol || 'EDITOR',
    empresa: String(u.empresa || '').trim(),
    cred: Number(u.cred || 0),
    salt: u.salt,
    hash: u.hash,
    perfilJSON: JSON.stringify(u.perfil || {}),
    refCode: u.refCode || nuevoId('ERGOX-'),
    referidoPor: String(u.referidoPor || '').trim(),
    activo: u.activo === false ? false : true,
    creado: new Date().toISOString(),
  };
  agregarFila(ss, HOJAS.USERS, fila);
  return fila;
}

// Suma (o resta) créditos y deja opcionalmente un movimiento de ajuste
function sumarCreditos(ss, email, n, detalle) {
  var nuevo = acreditar(ss, email, n);
  if (nuevo === null) return null;
  if (detalle) {
    agregarFila(ss, HOJAS.TRANSACCIONES, {
      id: nuevoId('ERGOX-'), email: email, tipo: 'ajuste', detalle: detalle,
      monto: Number(n), montoUsd: 0, planId: '', estado: 'OK',
      ref: '', confirmadoPor: '', fecha: new Date().toISOString(),
    });
  }
  return nuevo;
}

function acreditar(ss, email, n) {
  var fila = buscarFila(ss, HOJAS.USERS, 'email', email);
  if (fila <= 0) return null;
  var u = filaAObjeto(ss, HOJAS.USERS, fila);
  var nuevo = Number(u.cred || 0) + Number(n);
  actualizarFila(ss, HOJAS.USERS, fila, { cred: nuevo });
  return nuevo;
}

// ---- SESSIONS ----
function crearSesion(ss, email) {
  var token = generarToken();
  var expira = Date.now() + SESSION_DIAS * 24 * 60 * 60 * 1000;
  agregarFila(ss, HOJAS.SESSIONS, { token: token, email: email, expira: expira });
  return token;
}

function validarSesion(ss, token) {
  if (!token) return null;
  var ahora = Date.now();
  var filas = leerFilas(ss, HOJAS.SESSIONS);
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].token === token) {
      var expira = Number(filas[i].expira || 0);
      if (expira < ahora) { borrarSesion(ss, token); return null; }
      var u = usuarioPorEmail(ss, filas[i].email);
      if (!u) return null;
      return { user: u };
    }
  }
  return null;
}

function borrarSesion(ss, token) {
  try {
    var fila = buscarFila(ss, HOJAS.SESSIONS, 'token', token);
    if (fila > 0) hoja(ss, HOJAS.SESSIONS).deleteRow(fila);
  } catch (e) { /* si ya no existe, nada que hacer */ }
}

// ---- AUDITORÍA ----
function auditar(ss, email, accion, detalle) {
  try {
    agregarFila(ss, HOJAS.AUDIT_LOG, {
      email: email || 'sistema', accion: accion, detalle: detalle || '', fecha: new Date().toISOString(),
    });
  } catch (e) { /* la auditoría nunca debe tumbar una petición */ }
}

// ---------------------------------------------------------------------
// SEGURIDAD
// ---------------------------------------------------------------------
function sha256Hex(texto) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto));
  var hex = '';
  for (var i = 0; i < digest.length; i++) {
    var b = (digest[i] + 256) % 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex;
}

function generarSalt() {
  var bytes = '';
  for (var i = 0; i < 16; i++) {
    bytes += ('0' + Math.floor(Math.random() * 256).toString(16)).slice(-2);
  }
  return bytes;
}

function generarToken() {
  return Utilities.getUuid().replace(/-/g, '') + sha256Hex(Date.now() + Math.random()).slice(0, 16);
}

// Salt falso determinista para emails inexistentes (no revela usuarios)
function saltFalso(email) {
  return sha256Hex('ergox-fake:' + String(email || '').toLowerCase()).slice(0, 32);
}

function nuevoId(prefix) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var s = '';
  for (var i = 0; i < 8; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return prefix + s;
}

function generarHashDemo(pass) {
  var salt = generarSalt();
  var hash = sha256Hex(salt + String(pass));
  Logger.log('salt: ' + salt);
  Logger.log('hash: ' + hash);
  Logger.log('Pégalos en la hoja USERS (columnas salt y hash) del usuario a cambiar.');
  return { salt: salt, hash: hash };
}

// Sanea texto: elimina < y > (anti inyección de HTML/valores)
function sanitizarTexto(v) {
  return String(v === undefined || v === null ? '' : v).replace(/</g, '').replace(/>/g, '').trim();
}

// Sanea recursivamente un objeto/array de strings
function sanitizarObjeto(obj) {
  if (typeof obj === 'string') return sanitizarTexto(obj);
  if (Array.isArray(obj)) return obj.map(sanitizarObjeto);
  if (obj && typeof obj === 'object') {
    var r = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) r[k] = sanitizarObjeto(obj[k]);
    }
    return r;
  }
  return obj;
}

function esEmailValido(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''));
}

function parseJSON(texto, def) {
  if (texto !== null && typeof texto === 'object') return texto;
  if (texto === undefined || texto === null) return def;
  try { return JSON.parse(String(texto)); } catch (e) { return def; }
}

// ---- RATE LIMIT (en memoria por instancia) ----
var _limites = {};
function chequearLimite(clave, max) {
  var ahora = Date.now();
  var l = _limites[clave];
  if (!l || (ahora - l.t) > 3600000) {
    if (Object.keys(_limites).length > 10000) _limites = {}; // evita crecimiento infinito
    _limites[clave] = { t: ahora, n: 1 };
    return true;
  }
  l.n++;
  return l.n <= max;
}

// ---- LOCK (evita condiciones de carrera entre peticiones) ----
function conLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function porFechaDesc(a, b) {
  return String(b.fecha || '').localeCompare(String(a.fecha || ''));
}

function userPublico(u) {
  var perfil = parseJSON(u.perfilJSON, {});
  return {
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    empresa: u.empresa,
    pais: perfil.pais || '',
  };
}

// ---------------------------------------------------------------------
// SETUP (ejecutar UNA vez desde el editor: función setup → Ejecutar)
// Crea hojas, siembra CONFIG y crea el admin inicial admin@ergox.com.
// Idempotente: si el admin ya existe, no lo vuelve a crear.
// ---------------------------------------------------------------------
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Debes abrir este script vinculado a un Spreadsheet (hoja de cálculo).');
  PropertiesService.getScriptProperties().setProperty(SS_ID_KEY, ss.getId());

  crearHojas(ss);
  sembrarConfig(ss);

  var adminCreado = leerConfig(ss, 'adminCreado', false);
  if (!adminCreado) {
    var salt = generarSalt();
    var hash = sha256Hex(salt + ADMIN_PASS_DEFAULT);
    crearUsuario(ss, {
      email: ADMIN_EMAIL, nombre: 'Administrador ERGOX', empresa: 'ERGOX',
      rol: 'ADMIN', cred: 999999, salt: salt, hash: hash,
      perfil: { pais: 'VE' }, refCode: 'ERGOX-ADMIN', referidoPor: '',
    });
    escribirConfig(ss, 'adminCreado', true);
    Logger.log('==================================================');
    Logger.log('ERGOX Post — ADMIN INICIAL CREADO');
    Logger.log('Email:        ' + ADMIN_EMAIL);
    Logger.log('Contraseña:   ' + ADMIN_PASS_DEFAULT);
    Logger.log('CÁMBIALA tras el primer acceso: Admin → Nuevo usuario');
    Logger.log('  (crea otro admin) o usa generarHashDemo(clave) y edita');
    Logger.log('  las columnas salt y hash en la hoja USERS.');
    Logger.log('==================================================');
  } else {
    Logger.log('El admin inicial ya existe. Nada que hacer (setup idempotente).');
  }
  Logger.log('Setup completado. Ahora: Implementar → Nueva implementación → Aplicación web.');
}

function crearHojas(ss) {
  var definiciones = {
    USERS: ['email', 'nombre', 'rol', 'empresa', 'cred', 'salt', 'hash', 'perfilJSON', 'refCode', 'referidoPor', 'activo', 'creado'],
    SESSIONS: ['token', 'email', 'expira'],
    POSTS: ['id', 'email', 'postJSON', 'fecha'],
    LEADS: ['id', 'lmId', 'recurso', 'nombre', 'email', 'empresa', 'telefono', 'consentimiento', 'fecha'],
    LEAD_MAGNETS: ['id', 'titulo', 'url', 'pais', 'creado'],
    TRANSACCIONES: ['id', 'email', 'tipo', 'detalle', 'monto', 'montoUsd', 'planId', 'estado', 'ref', 'confirmadoPor', 'fecha'],
    AUDIT_LOG: ['email', 'accion', 'detalle', 'fecha'],
    CONFIG: ['clave', 'valorJSON'],
  };
  for (var nombre in definiciones) {
    if (!Object.prototype.hasOwnProperty.call(definiciones, nombre)) continue;
    if (ss.getSheetByName(nombre)) continue;
    ss.insertSheet(nombre).appendRow(definiciones[nombre]);
  }
}

function sembrarConfig(ss) {
  var claves = [
    { clave: 'adminCreado', valor: false },
    { clave: 'tasaOverride', valor: '{}' },
    { clave: 'parametros', valor: '{}' },
  ];
  for (var i = 0; i < claves.length; i++) {
    if (buscarFila(ss, HOJAS.CONFIG, 'clave', claves[i].clave) < 0) {
      hoja(ss, HOJAS.CONFIG).appendRow([claves[i].clave, claves[i].valor]);
    }
  }
}