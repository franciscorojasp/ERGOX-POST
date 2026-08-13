// =====================================================
// Créditos — planes, intención de pago y confirmación manual
// =====================================================

import { db } from '../core/db.js';
import { PLANES, PARAMS_DEFAULT } from '../content/datos.js';
import { escHtml, toast, copiar, fmtNum } from '../core/util.js';
import { obtenerTasas, monedaDePais } from '../core/tasas.js';
import { showModal, closeModal } from '../core/ui.js';
import { actualizarChipCreditos } from './dashboard.js';

export async function renderCreditos(c, sesion) {
  const cred = await db.creditos(sesion.email);
  const params = (await db.params()) || PARAMS_DEFAULT;
  const tasas = await obtenerTasas(params);
  const pais = localStorage.getItem('ergox_pais') || 'VE';
  const tasa = tasas[monedaDePais(pais)] || 1;

  const normMoneda = { VE: 'Bs.', CO: 'COP', MX: 'MXN', PE: 'PEN', AR: 'ARS', CL: 'CLP' }[pais] || 'Bs.';

  const planesHtml = PLANES.map((plan) => {
    const local = (plan.precio * tasa).toFixed(0);
    return '<div class="card' + (plan.popular ? '" style="text-align:center;border:2px solid var(--ambar);position:relative' : '" style="text-align:center') + '">' +
      (plan.popular ? '<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--ambar);color:#fff;padding:2px 16px;border-radius:20px;font-size:12px;font-weight:bold">POPULAR</div>' : '') +
      '<h3 style="font-size:14px;color:var(--texto-suave);margin-bottom:8px;margin-top:' + (plan.popular ? '8px' : '0') + '">' + plan.nombre + '</h3>' +
      '<div style="font-size:32px;font-weight:bold">$' + plan.precio.toFixed(2) + '</div>' +
      '<p class="muted">≈ ' + normMoneda + ' ' + fmtNum(local) + '</p>' +
      '<p style="margin:12px 0;font-weight:bold">' + plan.creditos + ' créditos</p>' +
      '<p style="font-size:12px;color:var(--texto-suave);margin-bottom:12px">$' + (plan.precio / plan.creditos).toFixed(2) + ' por post</p>' +
      '<button class="btn" style="width:100%" data-buy-plan="' + plan.id + '">Comprar</button>' +
    '</div>';
  }).join('');

  const cache = await db.obtenerEstado();
  const transacciones = (cache.transacciones || []).filter((t) => !t.email || t.email === sesion.email).slice(0, 12);

  const txHtml = transacciones.length === 0
    ? '<p class="muted centrado" style="padding:20px">Sin movimientos todavía</p>'
    : '<div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Detalle</th><th>Monto</th><th>Estado</th><th></th></tr></thead><tbody>' +
      transacciones.map((t) =>
        '<tr>' +
          '<td>' + new Date(t.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) + '</td>' +
          '<td>' + escHtml(t.detalle || (t.planId || 'Movimiento')) + (t.ref ? ' · ref: ' + escHtml(t.ref) : '') + '</td>' +
          '<td>' + (t.monto > 0 ? '+' : '') + t.monto + ' 🪙' + '</td>' +
          '<td><span class="badge ' + (t.estado === 'PAGADO' ? 'badge-baja' : t.estado === 'PENDIENTE' ? 'badge-media' : 'badge-info') + '">' + (t.estado || (t.tipo === 'compra' ? 'PAGADO' : 'OK')) + '</span></td>' +
          '<td>' + (t.estado === 'PAGADO' && t.montoUsd ? '<button class="btn btn-sm" data-recibo="' + escHtml(t.id) + '" style="font-size:11px">🧾 Recibo</button>' : '') + '</td>' +
        '</tr>'
      ).join('') + '</tbody></table></div>';

  c.innerHTML =
    '<div style="background:linear-gradient(135deg,#EAB308,#D97706);border-radius:16px;padding:32px;color:#fff;margin-bottom:16px" class="fade-in">' +
      '<h2 style="font-size:24px;font-weight:bold">🪙 ' + cred + ' créditos disponibles</h2>' +
      '<p style="opacity:0.9;margin-top:4px">1 publicación = 1 crédito · Comparte gratis (WhatsApp, Telegram, copiar, placas)</p>' +
    '</div>' +
    '<div class="grid-3 fade-in" style="margin-bottom:16px">' + planesHtml + '</div>' +
    '<div class="card fade-in">' +
      '<h3 style="font-size:16px;margin-bottom:12px">🧾 Movimientos de créditos</h3>' + txHtml +
    '</div>';

  c.querySelectorAll('[data-buy-plan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const plan = PLANES.find((p) => p.id === btn.getAttribute('data-buy-plan'));
      if (!plan) return;
      abrirCompra(plan, sesion, c, tasa, normMoneda);
    });
  });

  c.querySelectorAll('[data-recibo]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const t = transacciones.find((x) => x.id === btn.getAttribute('data-recibo'));
      if (!t) return;
      const { generarReciboHtml, imprimirRecibo } = await import('../finanzas/factura.js');
      const perfil = (await db.perfil(sesion.email)) || {};
      const plan = PLANES.find((p) => p.id === t.planId) || { creditos: t.monto, nombre: t.planId || 'Plan' };
      const tasas = await obtenerTasas(params);
      const pPais = perfil.pais || 'VE';
      const html = generarReciboHtml({
        perfil, plan, montoUsd: t.montoUsd, tasa: tasas[monedaDePais(pPais)],
        ivaPct: params.iva ? params.iva[pPais] : 0, ref: t.ref || t.id,
        fecha: t.confirmado || t.fecha, metodo: 'Confirmado por administración',
      });
      imprimirRecibo(html);
    });
  });
}

function abrirCompra(plan, sesion, c, tasa, normMoneda) {
  const local = Math.round(plan.precio * tasa);
  const ref = Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  showModal(
    '<h2 style="font-size:18px;margin-bottom:12px">💳 Comprar ' + plan.nombre + '</h2>' +
    '<p style="margin-bottom:12px"><strong>' + plan.creditos + ' créditos</strong> por <strong>$' + plan.precio.toFixed(2) + '</strong> ≈ ' + normMoneda + ' ' + fmtNum(local) + '</p>' +
    '<div class="aviso" style="margin-bottom:16px">' +
      '<p style="font-weight:bold;margin-bottom:6px">¿Cómo pagar?</p>' +
      '<p>1️⃣ Realiza la transferencia con tu referencia:<br><strong style="font-size:16px">' + ref + '</strong></p>' +
      '<p style="margin-top:6px">2️⃣ Métodos aceptados: 💳 Pago móvil, 🏦 Zelle, 💵 transferencia bancaria (según tu país).</p>' +
      '<p style="margin-top:6px">3️⃣ Envíanos el comprobante por <strong>WhatsApp</strong> y confirmaremos en minutos: se acreditan automáticamente.</p>' +
    '</div>' +
    '<label for="buy-numero">Tu número de WhatsApp (para confirmar)</label>' +
    '<input id="buy-numero" placeholder="+58 412 1234567" style="margin-bottom:16px;margin-top:8px" />' +
    '<div style="display:flex;gap:8px">' +
      '<button class="btn btn-success" style="flex:1" id="btn-buy-confirm">✅ Registrar pedido</button>' +
      '<button class="btn btn-gris btn-sm" id="btn-buy-cancel">Cancelar</button>' +
    '</div>',
    () => {
      document.getElementById('btn-buy-cancel').addEventListener('click', closeModal);
      document.getElementById('btn-buy-confirm').addEventListener('click', async () => {
        const tel = document.getElementById('buy-numero').value.trim();
        try {
          const r = await db.comprarPlan(plan, sesion.email);
          const intento = r.intento || { id: ref };
          closeModal();
          // enlace de confirmación por WhatsApp con la referencia
          const msg = encodeURIComponent('Hola, quiero confirmar mi compra de créditos ERGOX Post.\nPlan: ' + plan.nombre + ' (' + plan.creditos + ' créditos)\nReferencia: ' + intento.id + '\nMonto: $' + plan.precio.toFixed(2));
          if (tel) window.open('https://wa.me/' + String(tel).replace(/[^\d]/g, '') + '?text=' + msg, '_blank', 'noopener');
          toast('Pedido registrado. Referencia: ' + intento.id + ' — te confirmamos por WhatsApp.', 'success');
          renderCreditos(c, sesion);
          actualizarChipCreditos(sesion);
        } catch (e) {
          toast(e.message || 'Error al registrar el pedido', 'error');
        }
      });
    }
  );
}