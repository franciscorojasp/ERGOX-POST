// =====================================================
// ERGOX POST — Seguridad cliente
// Hash compartido con el backend Apps Script:
//   hex( SHA-256( salt + password ) )
// La contraseña en claro nunca viaja ni se almacena.
// =====================================================

const encoder = new TextEncoder();

export async function sha256Hex(texto) {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Hash final: hex(SHA-256(salt + pass))
export async function hashPassword(pass, salt) {
  return sha256Hex(String(salt || '') + String(pass || ''));
}

export function generarSalt(len) {
  const arr = new Uint8Array(len || 16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generarToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Sanitiza texto de usuario para piezas de contenido (sin HTML)
export function limpiarTexto(s, max) {
  const t = String(s || '').replace(/<[^>]*>/g, '').trim();
  return max ? t.slice(0, max) : t;
}