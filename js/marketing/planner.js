// =====================================================
// ERGOX POST — Planner editorial mensual
// Contrato: mountPlanner(container, { sesion })
// Mejoras: cuadrícula mensual con tema sugerido por día,
// mezcla 40/35/25, mejores horarios por red, próximas
// obligaciones, exportar CSV, copiar plan y clic en un
// día → prefill del tema en el generador.
// =====================================================

import { escHtml, toast, descargarTexto, toCsv, copiar, diasRestantes, fmtFechaCorta } from '../core/util.js';
import { NORMATIVAS, MEJORES_HORARIOS, generarObligaciones } from '../content/datos.js';

const TIPOS = {
  educativo:   { label: 'Educativo',      icon: '📚', color: 'var(--azul)',  css: 'btn-blue' },
  promocional: { label: 'Promocional',    icon: '📢', color: 'var(--verde)', css: 'btn-success' },
  conciencia:  { label: 'Concienciación', icon: '⚠️', color: 'var(--rojo)',  css: 'btn-danger' },
};

// Ciclo de 20 días: 8 educativo (40%), 7 promocional (35%), 5 conciencia (25%)
const MEZCLA = [];
for (let i = 0; i < 20; i++) {
  MEZCLA[i] = i < 8 ? 'educativo' : (i < 15 ? 'promocional' : 'conciencia');
}

const REDES = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'WhatsApp'];
const ICONOS_RED = { Instagram: '📸', Facebook: '👍', LinkedIn: '💼', TikTok: '🎵', WhatsApp: '💬' };
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const ESTILOS =
  '<style>' +
  '.planner-mes{width:100%;border-collapse:separate;border-spacing:6px;table-layout:fixed}' +
  '.planner-mes th{text-align:left;padding:4px 8px;font-size:11px;color:var(--texto-suave)}' +
  '.planner-dia{width:100%;text-align:left;background:var(--card);border:1px solid var(--borde);' +
    'border-radius:10px;padding:8px;min-height:92px;cursor:pointer;color:var(--texto);' +
    'font-size:12px;font-family:inherit;transition:border-color .15s,transform .15s,box-shadow .15s}' +
  '.planner-dia:hover,.planner-dia:focus-visible{border-color:var(--ambar);transform:translateY(-1px);' +
    'box-shadow:0 3px 10px var(--sombra-ambar)}' +
  '.planner-dia.fuera{opacity:.45}' +
  '.planner-dia .num{font-weight:bold;font-size:13px;display:block;margin-bottom:4px}' +
  '.planner-dia .tema{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;' +
    'overflow:hidden;color:var(--texto-suave);font-size:11px;line-height:1.35;margin-bottom:4px}' +
  '.planner-dia.hoy{border:2px solid var(--ambar);background:var(--ambar-claro)}' +
  '.planner-dia.hoy .num{color:var(--ambar-oscuro)}' +
  '.planner-barra{flex:1;background:var(--bg-alt);border-radius:8px;height:18px;overflow:hidden}' +
  '</style>';

// -----------------------------------------------------
// Utilidades de calendario
// -----------------------------------------------------

function mismoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtIso(f) {
  const m = String(f.getMonth() + 1).padStart(2, '0');
  const d = String(f.getDate()).padStart(2, '0');
  return f.getFullYear() + '-' + m + '-' + d;
}

function construirCeldas(ano, mes, pais) {
  const norm = NORMATIVAS[pais] || NORMATIVAS.VE;
  const offset = new Date(ano, mes, 1).getDay();
  const diasEnMes = new Date(ano, mes + 1, 0).getDate();
  const prevDias = new Date(ano, mes, 0).getDate();
  const celdas = [];
  for (let i = offset - 1; i >= 0; i--) celdas.push({ enMes: false, fecha: new Date(ano, mes - 1, prevDias - i) });
  for (let d = 1; d <= diasEnMes; d++) celdas.push({ enMes: true, fecha: new Date(ano, mes, d) });
  let k = 1;
  while (celdas.length % 7 !== 0) celdas.push({ enMes: false, fecha: new Date(ano, mes + 1, k++) });
  return celdas.map((c) => {
    const f = c.fecha;
    // base estable por fecha real: el tema no cambia al navegar de mes
    const base = f.getFullYear() * 1000 + f.getMonth() * 100 + f.getDate();
    const tipo = MEZCLA[base % 20];
    return {
      enMes: c.enMes,
      fecha: f,
      tipo,
      tema: norm.temas[base % norm.temas.length].tema,
      red: REDES[(base + (tipo === 'promocional' ? 2 : tipo === 'conciencia' ? 4 : 0)) % REDES.length],
    };
  });
}

function htmlCelda(c) {
  const hoy = new Date();
  const esHoy = c.enMes && mismoDia(c.fecha, hoy);
  const t = TIPOS[c.tipo];
  const fechaLabel = c.fecha.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
  return '<td>' +
    '<button type="button" class="planner-dia' + (esHoy ? ' hoy' : '') + (c.enMes ? '' : ' fuera') + '" ' +
    'data-tema="' + escHtml(c.tema) + '" data-fecha="' + fmtIso(c.fecha) + '" ' +
    'aria-label="' + escHtml(fechaLabel) + ': ' + escHtml(c.tema) + '. Usar este tema en el generador">' +
    '<span class="num">' + c.fecha.getDate() + (esHoy ? ' · HOY' : '') + '</span>' +
    '<span class="tema">' + escHtml(c.tema) + '</span>' +
    '<span style="font-size:10px;color:' + t.color + ';font-weight:bold">' + t.icon + ' ' + t.label + '</span>' +
    '</button></td>';
}

function filasMes(celdas) {
  let html = '';
  for (let i = 0; i < celdas.length; i += 7) {
    html += '<tr>' + celdas.slice(i, i + 7).map(htmlCelda).join('') + '</tr>';
  }
  return html;
}

// -----------------------------------------------------
// Vista principal
// -----------------------------------------------------

export async function mountPlanner(container, ctx) {
  const sesion = ctx.sesion;
  const pais = localStorage.getItem('ergox_pais') || 'VE';
  const norm = NORMATIVAS[pais] || NORMATIVAS.VE;
  const hoy = new Date();
  let mesOffset = 0;

  const mezclaHtml = Object.keys(TIPOS).map((k) => {
    const t = TIPOS[k];
    const pct = { educativo: 40, promocional: 35, conciencia: 25 }[k];
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<span style="width:140px;font-size:13px">' + t.icon + ' ' + t.label + '</span>' +
      '<div class="planner-barra" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + t.label + ' ' + pct + '%">' +
        '<div style="width:' + pct + '%;height:100%;background:' + t.color + ';border-radius:8px"></div>' +
      '</div>' +
      '<span style="width:44px;text-align:right;font-size:13px;font-weight:bold">' + pct + '%</span>' +
    '</div>';
  }).join('');

  const horariosHtml = Object.keys(MEJORES_HORARIOS).map((red) =>
    '<tr><td><strong>' + (ICONOS_RED[red] || '🌐') + ' ' + red + '</strong></td><td>' +
    MEJORES_HORARIOS[red].map((h) => '<span class="badge badge-info" style="margin:2px">' + h.d + ' ' + h.h + '</span>').join(' ') +
    '</td></tr>'
  ).join('');

  const obligaciones = generarObligaciones(pais).slice(0, 3);
  const oblHtml = obligaciones.map((o) =>
    '<div style="padding:10px;border-left:3px solid var(--ambar);background:var(--bg-alt);border-radius:8px;margin-bottom:6px;font-size:13px">' +
      '<strong>' + o.titulo + '</strong><br>' +
      '<span class="muted">' + fmtFechaCorta(new Date(o.fecha + 'T12:00:00')) + '</span>' +
      '<span class="badge ' + (o.urgencia === 'alta' ? 'badge-alta' : 'badge-media') + '" style="margin-left:6px">' +
        (diasRestantes(new Date(o.fecha + 'T12:00:00')) <= 0 ? 'vencida' : 'en ' + diasRestantes(new Date(o.fecha + 'T12:00:00')) + ' días') +
      '</span> · <span class="muted">' + o.ley + '</span>' +
    '</div>'
  ).join('') || '<p class="muted">Sin obligaciones próximas registradas.</p>';

  const dibujar = () => {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1);
    const celdas = construirCeldas(f.getFullYear(), f.getMonth(), pais);
    const nombreMes = f.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });

    container.innerHTML =
      ESTILOS +
      '<div class="grid-2 fade-in">' +
        '<div class="card" style="grid-column:1/-1">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">' +
            '<div>' +
              '<h2 style="font-size:18px">🗓️ Plan editorial — ' + escHtml(nombreMes) + '</h2>' +
              '<p class="muted">' + norm.flag + ' Temas sugeridos por día (' + norm.nombre + ') · clic en un día lo lleva al generador</p>' +
            '</div>' +
            '<div style="display:flex;gap:6px;align-items:center">' +
              '<button type="button" class="btn btn-sm btn-gris" id="btn-mes-ant" aria-label="Mes anterior">◀</button>' +
              '<button type="button" class="btn btn-sm" id="btn-mes-hoy" aria-label="Ir al mes actual">Hoy</button>' +
              '<button type="button" class="btn btn-sm btn-gris" id="btn-mes-sig" aria-label="Mes siguiente">▶</button>' +
            '</div>' +
          '</div>' +
          '<table class="planner-mes">' +
            '<thead><tr>' + DIAS_SEMANA.map((d) => '<th>' + d + '</th>').join('') + '</tr></thead>' +
            '<tbody>' + filasMes(celdas) + '</tbody>' +
          '</table>' +
          '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">' +
            '<button type="button" class="btn btn-sm btn-blue" id="btn-plan-csv" aria-label="Exportar el plan del mes en CSV">📤 Exportar mes (CSV)</button>' +
            '<button type="button" class="btn btn-sm" id="btn-plan-copiar" aria-label="Copiar el plan del mes al portapapeles">📋 Copiar plan</button>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<h3 style="font-size:16px;margin-bottom:12px">🧪 Mezcla de contenido recomendada</h3>' +
          mezclaHtml +
          '<p class="muted" style="margin-top:10px">40% educativo · 35% promocional · 25% concienciación. Ajusta según tu audiencia.</p>' +
        '</div>' +
        '<div class="card">' +
          '<h3 style="font-size:16px;margin-bottom:12px">⏰ Mejores horarios por red</h3>' +
          '<table><thead><tr><th>Red</th><th>Momentos sugeridos</th></tr></thead><tbody>' + horariosHtml + '</tbody></table>' +
          '<p class="muted" style="margin-top:10px">Basado en promedios de la industria; valida con tus propias métricas.</p>' +
        '</div>' +
        '<div class="card" style="grid-column:1/-1">' +
          '<h3 style="font-size:16px;margin-bottom:12px">⏳ Próximas obligaciones (' + pais + ')</h3>' + oblHtml +
        '</div>' +
      '</div>';

    bind(celdas);
  };

  const bind = (celdas) => {
    const btnAnt = document.getElementById('btn-mes-ant');
    const btnHoy = document.getElementById('btn-mes-hoy');
    const btnSig = document.getElementById('btn-mes-sig');
    if (btnAnt) btnAnt.addEventListener('click', () => { mesOffset--; dibujar(); });
    if (btnHoy) btnHoy.addEventListener('click', () => { mesOffset = 0; dibujar(); });
    if (btnSig) btnSig.addEventListener('click', () => { mesOffset++; dibujar(); });

    container.querySelectorAll('.planner-dia').forEach((btn) => {
      btn.addEventListener('click', () => usarTemaEnGenerador(btn.getAttribute('data-tema'), sesion));
    });

    const btnCsv = document.getElementById('btn-plan-csv');
    if (btnCsv) btnCsv.addEventListener('click', () => {
      const filas = [['Fecha', 'Día', 'Tipo', 'Red', 'Tema']].concat(
        celdas.filter((c) => c.enMes).map((c) => [
          fmtIso(c.fecha),
          c.fecha.toLocaleDateString('es-VE', { weekday: 'long' }),
          TIPOS[c.tipo].label,
          c.red,
          c.tema,
        ])
      );
      descargarTexto(toCsv(filas), 'ERGOX_Plan_' + celdas[0].fecha.getFullYear() + '_' + (celdas[0].fecha.getMonth() + 1) + '.csv', 'text/csv;charset=utf-8');
      toast('Plan del mes exportado', 'success');
    });

    const btnCopiar = document.getElementById('btn-plan-copiar');
    if (btnCopiar) btnCopiar.addEventListener('click', async () => {
      const texto = celdas.filter((c) => c.enMes).map((c) =>
        fmtIso(c.fecha) + ' · ' + c.fecha.toLocaleDateString('es-VE', { weekday: 'long' }) +
        ' [' + c.red + ' · ' + TIPOS[c.tipo].label + ']\n' + c.tema
      ).join('\n\n');
      if (await copiar(texto)) toast('Plan copiado', 'success');
      else toast('No se pudo copiar', 'error');
    });
  };

  dibujar();
}

// -----------------------------------------------------
// Clic en un día → prefill del tema en el generador
// -----------------------------------------------------

function usarTemaEnGenerador(tema, sesion) {
  try { sessionStorage.setItem('ergox_planner_tema', tema); } catch (e) {}
  try { localStorage.setItem('ergox_tab', 'generador'); } catch (e) {}

  const nav = document.getElementById('app-nav');
  const btnGen = nav && nav.querySelector('[data-tab="generador"]');
  const app = document.getElementById('app');

  if (btnGen && app) {
    nav.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btnGen.classList.add('active');
    import('../views/dashboard.js').then((m) => m.renderTabContent(app, sesion || null)).then(() => {
      setTimeout(() => {
        const input = document.getElementById('tema-input');
        if (input) input.value = tema;
      }, 60);
    }).catch(() => {});
    toast('Tema cargado en el generador', 'info');
  } else {
    // fallback: si no hay navegación de la app, copia el tema al portapapeles
    copiar(tema).then((ok) => {
      if (ok) toast('Tema copiado al portapapeles', 'success');
      else toast('Tema: ' + tema.slice(0, 60), 'info');
    });
  }
}
