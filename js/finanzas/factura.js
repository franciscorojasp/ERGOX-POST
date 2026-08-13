// =====================================================
// ERGOX POST — Recibo/factura imprimible (sin dependencias)
// Contrato: generarReciboHtml(opts), imprimirRecibo(html)
// =====================================================

import { escHtml, urlValida, descargarTexto } from '../core/util.js';

const NOMBRES_IMPUESTO = { VE: 'IVA', CO: 'IVA', MX: 'IVA', PE: 'IGV', AR: 'IVA', CL: 'IVA' };
const SIMBOLOS_LOCAL = { VE: 'Bs. ', PE: 'S/ ', CO: '$ ', MX: '$ ', AR: '$ ', CL: '$ ' };
const LOCALES = { VE: 'es-VE', CO: 'es-CO', MX: 'es-MX', PE: 'es-PE', AR: 'es-AR', CL: 'es-CL' };

function normFecha(f) {
  const d = f ? new Date(f) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

function fmtLocal(n, pais) {
  return (SIMBOLOS_LOCAL[pais] || '$ ') + Number(n).toLocaleString(LOCALES[pais] || 'es-VE', { maximumFractionDigits: 2 });
}

export function generarReciboHtml(opts) {
  const p = opts.perfil || {};
  const pais = (p.pais || 'VE').toUpperCase();
  const monto = Number(opts.montoUsd || 0);
  const tasa = Number(opts.tasa || 0);
  const local = tasa > 0 ? monto * tasa : 0;
  const ivaPct = opts.ivaPct !== undefined ? opts.ivaPct : Number(opts.iva || 0);
  const iva = monto * (ivaPct / 100);
  const ref = opts.ref || '—';
  const fecha = normFecha(opts.fecha);
  const plan = opts.plan || {};
  const logoUrl = urlValida(p.logoUrl) ? p.logoUrl : null;

  const nombreImp = opts.nombreImpuesto || NOMBRES_IMPUESTO[pais] || 'IVA';
  const etiquetaImp = ivaPct > 0 && !/%/.test(nombreImp) ? nombreImp + ' (' + Number(ivaPct) + '%)' : nombreImp;

  const filasFiscales = [
    p.rif ? '<div><span style="font-weight:700">RIF/NIT/RFC/RUC/CUIT/RUT:</span> ' + escHtml(p.rif) + '</div>' : '',
    p.direccionFiscal ? '<div><span style="font-weight:700">Dirección:</span> ' + escHtml(p.direccionFiscal) + '</div>' : '',
    p.emailContacto ? '<div><span style="font-weight:700">Email:</span> ' + escHtml(p.emailContacto) + '</div>' : '',
    p.telefono ? '<div><span style="font-weight:700">Teléfono:</span> ' + escHtml(p.telefono) + '</div>' : '',
  ].join('');

  const filasDetalle = [
    '<tr><td style="padding:8px 6px;border-bottom:1px solid #ddd">Plan</td><td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right;font-weight:600">' + escHtml(plan.nombre || plan.id || '—') + '</td></tr>',
    '<tr><td style="padding:8px 6px;border-bottom:1px solid #ddd">Créditos</td><td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right;font-weight:600">' + (plan.creditos ? Number(plan.creditos) + ' 🪙' : '—') + '</td></tr>',
    '<tr><td style="padding:8px 6px;border-bottom:1px solid #ddd">Método de pago</td><td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right;font-weight:600">' + escHtml(opts.metodo || '—') + '</td></tr>',
    '<tr><td style="padding:8px 6px;border-bottom:1px solid #ddd">Subtotal (USD)</td><td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right">$' + monto.toFixed(2) + '</td></tr>',
    '<tr><td style="padding:8px 6px;border-bottom:1px solid #ddd">' + escHtml(etiquetaImp) + '</td><td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right">$' + iva.toFixed(2) + '</td></tr>',
  ];
  if (tasa > 0) {
    filasDetalle.push(
      '<tr><td style="padding:8px 6px;border-bottom:1px solid #ddd">Tasa de cambio</td><td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right">1 USD = ' + Number(tasa).toFixed(2) + '</td></tr>',
      '<tr><td style="padding:8px 6px;border-bottom:1px solid #ddd">Total (moneda local)</td><td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right;font-weight:600">' + fmtLocal(local, pais) + '</td></tr>'
    );
  }

  return (
    '<div style="max-width:200mm;margin:0 auto;font-family:\'Segoe UI\',system-ui,sans-serif;color:#111;box-sizing:border-box">' +
      '<div style="border:2px solid #111;border-radius:10px;padding:28px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.12)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:20px">' +
          '<div style="display:flex;align-items:center;gap:12px;min-width:0">' +
            (logoUrl
              ? '<img src="' + logoUrl + '" alt="Logo" style="height:56px;width:56px;object-fit:contain;border-radius:8px;border:1px solid #ddd;background:#fff" />'
              : '<div style="height:56px;width:56px;border-radius:8px;background:#EAB308;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#111">E</div>') +
            '<div style="min-width:0"><div style="font-size:24px;font-weight:800;letter-spacing:0.5px;line-height:1.1">ERGOX Post</div>' +
            '<div style="font-size:12px;color:#555">Publicaciones SST multinacional</div></div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0">' +
            '<div style="font-size:14px;font-weight:800;letter-spacing:2px;border:1.5px solid #111;padding:6px 12px;border-radius:6px;display:inline-block">RECIBO / COMPROBANTE</div>' +
            '<div style="font-size:12px;margin-top:8px">N.º <strong>' + escHtml(ref) + '</strong></div>' +
            '<div style="font-size:12px">' + fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:20px;font-size:13px;flex-wrap:wrap">' +
          '<div style="min-width:220px">' +
            '<div style="font-weight:700;font-size:11px;letter-spacing:1px;color:#555;text-transform:uppercase;margin-bottom:6px">Datos fiscales</div>' +
            '<div style="font-weight:700;font-size:14px;margin-bottom:6px">' + escHtml(p.nombreEmpresa || '—') + '</div>' +
            filasFiscales +
          '</div>' +
          '<div style="text-align:right;min-width:220px">' +
            '<div style="font-weight:700;font-size:11px;letter-spacing:1px;color:#555;text-transform:uppercase;margin-bottom:6px">Detalle</div>' +
            '<div style="margin-bottom:4px"><strong>' + escHtml(plan.nombre || plan.id || 'Plan') + '</strong></div>' +
            '<div style="margin-bottom:4px">' + (plan.creditos ? Number(plan.creditos) + ' créditos 🪙' : '') + '</div>' +
            '<div style="margin-bottom:4px">Pago: ' + escHtml(opts.metodo || '—') + '</div>' +
          '</div>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">' +
          filasDetalle.join('') +
          '<tr><td style="padding:10px 6px;border-top:2px solid #111;font-weight:800;font-size:14px">Total a pagar (USD)</td>' +
          '<td style="padding:10px 6px;border-top:2px solid #111;text-align:right;font-weight:800;font-size:16px">$' + (monto + iva).toFixed(2) + '</td></tr>' +
        '</table>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;border-top:1px solid #ddd;padding-top:14px">' +
          '<div style="font-size:11px;color:#555;max-width:420px">Comprobante informativo — verifique requisitos locales (SENIAT/DIAN/SAT/SUNAT/AFIP/SII).' +
            ' Emitido por ' + escHtml(p.nombreEmpresa || 'la empresa emisora') + ' con los datos fiscales indicados.' +
            (tasa > 0 ? ' El total en moneda local es referencial (' + fmtLocal(local, pais) + ').' : '') +
          '</div>' +
          '<div style="font-size:11px;color:#888;text-align:right;flex-shrink:0">ERGOX Post — Generado el ' + fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · N.º ' + escHtml(ref) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

export function imprimirRecibo(html) {
  if (typeof document === 'undefined') return;
  const previo = document.getElementById('zona-impresion');
  if (previo) previo.remove();
  const zona = document.createElement('div');
  zona.id = 'zona-impresion';
  zona.innerHTML = html;
  document.body.appendChild(zona);
  window.print();
  setTimeout(() => zona.remove(), 500);
}

// generarReciboPdf(opts): exportación nueva NO usada por las vistas.
// Genera un documento HTML autónomo (tamaño A4 vía @page) y lo descarga como
// archivo .html; el usuario lo abre e imprime con "Guardar como PDF"
// (Ctrl+P). Sin dependencias externas (prohibido jsPDF u otros CDN).
export function generarReciboPdf(opts) {
  const cuerpo = generarReciboHtml(opts);
  const base = String(opts.ref || '').replace(/[\\/:*?"<>|]+/g, '_') || 'recibo';
  const doc =
    '<!DOCTYPE html>' +
    '<html lang="es"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width,initial-scale=1" />' +
    '<title>Recibo ' + escHtml(base) + ' — ERGOX Post</title>' +
    '<style>' +
      '@page { size: A4; margin: 12mm; }' +
      'body { margin: 0; padding: 24px; background: #fff; color: #111; font-family: \'Segoe UI\', system-ui, sans-serif; }' +
      '* { box-sizing: border-box; }' +
    '</style></head>' +
    '<body>' + cuerpo + '</body></html>';
  if (typeof document === 'undefined') return doc;
  descargarTexto(doc, 'Recibo_' + base + '.html', 'text/html;charset=utf-8');
  return doc;
}
