// =====================================================
// ERGOX POST — Gestión de sesión (token)
// localStorage: 'ergox_sesion' {email, nombre, rol, empresa, token}
// =====================================================

const KEY = 'ergox_sesion';

export function guardarSesion(sesion) {
  try { localStorage.setItem(KEY, JSON.stringify(sesion)); } catch (e) {}
}

export function obtenerSesion() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function limpiarSesion() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}