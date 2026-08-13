// =====================================================
// ERGOX POST — Reportes para administración (CSV + resúmenes)
// Contrato usado por js/views/informe.js
// =====================================================

// Contrato: resumenIngresos(transacciones) → {total, pendientes, porPlan:{planId:{cantidad,total}}}
export function resumenIngresos(transacciones) {
  const lista = transacciones || [];
  const res = { total: 0, pendientes: 0, porPlan: {} };
  for (const t of lista) {
    if (t.estado === 'PENDIENTE') {
      res.pendientes++;
      continue;
    }
    if (t.estado === 'PAGADO' && t.montoUsd) {
      res.total += t.montoUsd;
      const k = t.planId || 'otro';
      if (!res.porPlan[k]) res.porPlan[k] = { cantidad: 0, total: 0 };
      res.porPlan[k].cantidad++;
      res.porPlan[k].total += t.montoUsd;
    }
  }
  return res;
}

// Contrato: filas para CSV [fecha, país, tipo, alcance, likes, comentarios]
export function filasUso(historial) {
  return (historial || []).map((p) => {
    const m = p.metricas || {};
    return [p.fecha ? new Date(p.fecha).toISOString().slice(0, 10) : '', p.pais || '', p.tipo || '', m.alcance || 0, m.likes || 0, m.comentarios || 0];
  });
}

// Contrato: filas para CSV [fecha, email, detalle, referencia, créditos, usd, estado]
export function filasTransacciones(transacciones) {
  return (transacciones || []).map((t) => [
    t.fecha ? new Date(t.fecha).toISOString().slice(0, 10) : '',
    t.email || '',
    t.detalle || t.planId || t.tipo || '',
    t.ref || '',
    t.monto !== undefined ? t.monto : '',
    t.montoUsd !== undefined ? t.montoUsd : '',
    t.estado || t.tipo || 'OK',
  ]);
}

// Exportación nueva: resumen por mes → [{mes:'2026-01', ingresos, ventas}]
// para los últimos `meses` meses (ingresos USD y ventas de transacciones PAGADO).
export function resumenMensual(transacciones, meses) {
  const n = Math.max(1, Math.min(60, Number(meses) || 6));
  const lista = transacciones || [];
  const hoy = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const mes = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const delMes = lista.filter(
      (t) => t.estado === 'PAGADO' && t.montoUsd && t.fecha &&
        new Date(t.fecha).toISOString().slice(0, 7) === mes
    );
    out.push({
      mes,
      ingresos: delMes.reduce((a, t) => a + Number(t.montoUsd), 0),
      ventas: delMes.length,
    });
  }
  return out;
}

// Exportación nueva: costo promedio por post → {costoUsdPorPost, totalUsd, totalPosts}
// totalUsd = ingresos PAGADO confirmados; totalPosts = posts generados (historial).
export function costoPorPost(transacciones, historial) {
  const totalUsd = (transacciones || []).reduce(
    (a, t) => a + (t.estado === 'PAGADO' && t.montoUsd ? Number(t.montoUsd) : 0),
    0
  );
  const totalPosts = (historial || []).length;
  return {
    costoUsdPorPost: totalPosts ? totalUsd / totalPosts : 0,
    totalUsd,
    totalPosts,
  };
}

// Exportación nueva: ranking de países → [{pais, posts}] ordenado (descendente).
export function topPaises(historial) {
  const conteo = {};
  for (const p of historial || []) {
    const k = p.pais || '—';
    conteo[k] = (conteo[k] || 0) + 1;
  }
  return Object.keys(conteo)
    .map((pais) => ({ pais, posts: conteo[pais] }))
    .sort((a, b) => b.posts - a.posts || String(a.pais).localeCompare(String(b.pais)));
}
