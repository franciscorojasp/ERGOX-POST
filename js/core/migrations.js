// =====================================================
// ERGOX POST — Migraciones de estado versionadas.
// A diferencia de v2 (que borraba todo si la versión cambiaba),
// aquí cada versión aplica una migración incremental.
// =====================================================

const MIGRACIONES = {
  // v2 -> v3: los usuarios pasan a tener hash+salt; se conserva el historial,
  // leads y leadMagnets tal cual; se agrega el ledger de transacciones.
  '2.0': function (estado) {
    const s = estado || {};
    s._version = '3.0';
    if (!s.transacciones) s.transacciones = [];
    (Object.keys(s.usuarios || {}) || []).forEach((email) => {
      const u = s.usuarios[email];
      if (!u) return;
      if (u.pass && !u.hash) {
        // No podemos hashear aquí (migración síncrona): se conserva en claro
        // únicamente como respaldo y se re-hashea en el primer login.
        u.legacyPass = true;
      }
      if (!u.perfil) {
        u.perfil = perfilDefault();
      }
      if (!u.creado) u.creado = new Date().toISOString();
      if (!u.activo) u.activo = true;
    });
    if (!s.estadoLeadsCatalogados) {
      // Los leads v2 no registran consentimiento: se marcan como legado.
      (s.leads || []).forEach((l) => { if (!l.consentimiento) l.consentimiento = 'legacy-v2'; });
    }
    return s;
  },
};

export function perfilDefault() {
  return {
    nombreEmpresa: '', rif: '', logoUrl: '', direccionFiscal: '',
    telefono: '', emailContacto: '', personaContacto: '', pais: 'VE',
  };
}

// Recibe un objeto de estado y lo lleva a la versión actual.
// Devuelve { estado, migrado } — nunca borra datos conocidos.
export function aplicarMigraciones(estado, versionActual, versionesConocidas) {
  if (!estado || typeof estado !== 'object') {
    return { estado: null, migrado: false };
  }
  if (typeof estado._version === 'undefined' && !estado.usuarios) {
    return { estado: null, migrado: false }; // no parece estado nuestro
  }
  const versionInicial = estado._version || '1.0';
  if (versionInicial === versionActual) {
    return { estado: estado, migrado: false };
  }
  let s = estado;
  let migrado = false;
  const idx = versionesConocidas.indexOf(versionInicial);
  if (idx === -1) {
    // versión desconocida: conserva los datos y solo actualiza la versión
    s = Object.assign({}, s, { _version: versionActual });
    return { estado: s, migrado: true };
  }
  // aplica la cadena de migraciones desde la versión inicial hasta la actual
  for (let i = idx; i < versionesConocidas.length - 1; i++) {
    const mig = MIGRACIONES[versionesConocidas[i]];
    if (mig) {
      s = mig(s);
      migrado = true;
    }
  }
  s._version = versionActual;
  return { estado: s, migrado: migrado };
}