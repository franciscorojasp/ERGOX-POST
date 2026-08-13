// =====================================================
// ERGOX POST — Contenido data-driven multinacional
// Países, leyes, plantillas, calendario recurrente, montos dinámicos.
// Toda base/valores son editables desde Admin → Parámetros (y hoja CONFIG).
// =====================================================

// Unidades/valor por año (aproximados, editables en Parámetros)
export const PARAMS_DEFAULT = {
  ut:     { 2025: 300, 2026: 320 },                        // Unidad Tributaria VE (Bs)
  smmlv:  { 2025: 1423500, 2026: 1523500 },                // Salario Mínimo CO (COP)
  uma:    { 2025: 113.14, 2026: 130.87 },                  // UMA MX (MXN)
  uit:    { 2025: 5350, 2026: 5750 },                      // UIT PE (PEN)
  utm:    { 2025: 65500, 2026: 67500 },                    // UTM CL (CLP)
  iva:    { VE: 16, CO: 19, MX: 16, PE: 18, AR: 21, CL: 19 },
  disclaimer: '*Contenido informativo general. Verifique los requisitos vigentes con un especialista en SST y con asesoría legal de su país.',
  tasasManual: { ves: null, cop: null, mxn: null, pen: null, ars: null, clp: null },
  taxasFra: null,
};

export const NORMATIVAS = {
  VE: {
    id: 'VE', nombre: 'Venezuela', flag: '🇻🇪', moneda: 'Bs.',
    tasaLocal: 'ves',
    leyes: ['LOPCYMAT (2005)', 'NT-04-2023 INPSASEL', 'NT-03-2016'],
    exigible: {
      PSST: 'Programa de Seguridad y Salud en el Trabajo registrado ante INPSASEL',
      CSSL: 'Comité de Seguridad y Salud Laboral constituido',
      formacion: 'Formación de 16 horas trimestrales',
    },
    multa: { expr: 'ut', min: 30, max: 100, ref: 'LOPCYMAT' },
    temas: [
      { label: '📋 PSST', tema: 'Programa de Seguridad y Salud en el Trabajo (PSST) según NT-04-2023' },
      { label: '👥 CSSL', tema: 'Comité de Seguridad y Salud Laboral (CSSL)' },
      { label: '📚 16h', tema: '16 horas trimestrales de formación SST' },
      { label: '🩺 Exámenes', tema: 'Exámenes médicos ocupacionales' },
      { label: '🧘 Pausas activas', tema: 'Pausas activas y prevención de lesiones en el puesto de trabajo' },
      { label: '🏋️ Cargas', tema: 'Manejo manual de cargas y ergonomía' },
      { label: '🖥️ Pantallas', tema: 'Riesgos ergonómicos: pantallas de visualización y puesto de trabajo' },
      { label: '🔊 Ruido', tema: 'Protección contra el ruido ocupacional' },
      { label: '⚡ Electricidad', tema: 'Seguridad eléctrica en el trabajo' },
      { label: '🧪 Químicos', tema: 'Manejo de sustancias químicas peligrosas' },
      { label: '🔥 Incendios', tema: 'Prevención de incendios y uso de extintores' },
    ],
  },
  CO: {
    id: 'CO', nombre: 'Colombia', flag: '🇨🇴', moneda: 'COP',
    tasaLocal: 'cop',
    leyes: ['Decreto 1072 de 2015', 'Resolución 0312 de 2019', 'GTC-45'],
    exigible: {
      PSST: 'Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST)',
      COPASST: 'Comité Paritario de Seguridad y Salud en el Trabajo (COPASST)',
      formacion: 'Capacitación de acuerdo con matriz de peligros y perfil de riesgo',
    },
    multa: { expr: 'smmlv', max: 500, ref: 'Ley 1562/2012 y Decreto 472/2015' },
    temas: [
      { label: '📋 SG-SST', tema: 'Sistema de Gestión SG-SST según Decreto 1072' },
      { label: '👥 COPASST', tema: 'Comité COPASST' },
      { label: '📚 Capacitación', tema: 'Capacitación obligatoria SST Colombia' },
      { label: '🩺 Exámenes', tema: 'Exámenes ocupacionales Resolución 0312' },
      { label: '🧘 Pausas activas', tema: 'Pausas activas y salud laboral' },
      { label: '🏗️ Construcción', tema: 'Seguridad en obras de construcción' },
      { label: '🔇 Ruido', tema: 'Programa de conservación auditiva' },
      { label: '🪖 EPP', tema: 'Uso correcto de elementos de protección personal' },
    ],
  },
  MX: {
    id: 'MX', nombre: 'México', flag: '🇲🇽', moneda: 'MXN',
    tasaLocal: 'mxn',
    leyes: ['NOM-035-STPS-2018', 'NOM-017-STPS-2008', 'NOM-030-STPS-2009'],
    exigible: {
      PSST: 'Programa de seguridad y salud en el trabajo',
      CSST: 'Comisiones de seguridad e higiene',
      formacion: 'Capacitación en materia de prevención de riesgos',
    },
    multa: { expr: 'uma', max: 425, ref: 'LFT y NOM-035' },
    temas: [
      { label: '🧠 NOM-035', tema: 'Riesgos psicosociales NOM-035-STPS' },
      { label: '🏋️ NOM-017', tema: 'Equipo de protección personal NOM-017' },
      { label: '📋 Comisiones', tema: 'Comisiones de seguridad e higiene' },
      { label: '🧘 Salud mental', tema: 'Salud mental y bienestar laboral' },
      { label: '🖥️ Ergonomía', tema: 'Ergonomía en el puesto de trabajo' },
      { label: '🚑 Primeros auxilios', tema: 'Primeros auxilios en el centro de trabajo' },
    ],
  },
  PE: {
    id: 'PE', nombre: 'Perú', flag: '🇵🇪', moneda: 'PEN',
    tasaLocal: 'pen',
    leyes: ['Ley 29783 (2011)', 'DS 005-2012-TR', 'DS 006-2014-TR (Sunafil)'],
    exigible: {
      PSST: 'Sistema de Gestión de Seguridad y Salud en el Trabajo (SGSST)',
      CSST: 'Comité de Seguridad y Salud en el Trabajo',
      formacion: 'Capacitación en prevención de riesgos laborales',
    },
    multa: { expr: 'uit', min: 1, max: 100, ref: 'Sunafil' },
    temas: [
      { label: '📋 Ley 29783', tema: 'Sistema de gestión de SST Ley 29783' },
      { label: '👥 Comité SST', tema: 'Comité de Seguridad y Salud en el Trabajo' },
      { label: '📚 IPERC', tema: 'Identificación de peligros y evaluación de riesgos (IPERC)' },
      { label: '🩺 Exámenes', tema: 'Exámenes médicos ocupacionales' },
      { label: '🧘 Pausas activas', tema: 'Pausas activas ergonómicas' },
      { label: '🏗️ Obras', tema: 'Seguridad en obras de construcción (DS 011-2019-TR)' },
    ],
  },
  AR: {
    id: 'AR', nombre: 'Argentina', flag: '🇦🇷', moneda: 'ARS',
    tasaLocal: 'ars',
    leyes: ['Ley 19.587 (Higiene y Seguridad)', 'Decreto 351/79', 'Ley 24.557 (ART)'],
    exigible: {
      PSST: 'Servicio de Higiene y Seguridad y Medicina Laboral',
      CSST: 'Capacitación en higiene y seguridad (niveles básico/avanzado)',
      formacion: 'Programa anual de capacitación según Decreto 351/79',
    },
    multa: { expr: 'texto', texto: 'multas y clausura del establecimiento (Ley 19.587 y Ley 24.557)' },
    temas: [
      { label: '📋 Ley 19.587', tema: 'Higiene y seguridad en el trabajo Ley 19.587' },
      { label: '🏥 ART', tema: 'Aseguradora de Riesgos del Trabajo (ART)' },
      { label: '📚 Capacitación', tema: 'Capacitación obligatoria en higiene y seguridad' },
      { label: '🩺 Exámenes', tema: 'Exámenes preocupacionales y periódicos' },
      { label: '🖥️ Ergonomía', tema: 'Ergonomía y manejo manual de cargas' },
      { label: '🚒 Simulacros', tema: 'Simulacros de evacuación y emergencias' },
    ],
  },
  CL: {
    id: 'CL', nombre: 'Chile', flag: '🇨🇱', moneda: 'CLP',
    tasaLocal: 'clp',
    leyes: ['Ley 16.744 (1968)', 'DS 40/69', 'DS 594/99'],
    exigible: {
      PSST: 'Programa de prevención de riesgos (DS 40/69)',
      CSST: 'Comité Paritario de Higiene y Seguridad',
      formacion: 'Capacitación periódica en prevención de riesgos',
    },
    multa: { expr: 'utm', min: 1, max: 40, ref: 'Ley 16.744 / DS 594' },
    temas: [
      { label: '📋 Ley 16.744', tema: 'Seguro social contra accidentes y enfermedades (Ley 16.744)' },
      { label: '👥 Comité Paritario', tema: 'Comité Paritario de Higiene y Seguridad' },
      { label: '📚 DS 40', tema: 'Programa de prevención de riesgos DS 40/69' },
      { label: '🩺 Exámenes', tema: 'Examen físico ocupacional (DS 44)' },
      { label: '🖥️ Ergonomía', tema: 'Ergonomía y puesto de trabajo' },
      { label: '🚒 Emergencias', tema: 'Plan de emergencias y simulacros' },
    ],
  },
};

export const PLANES = [
  { id: 'starter', nombre: '🚀 Starter', precio: 9.99, creditos: 10, popular: false },
  { id: 'profesional', nombre: '⭐ Profesional', precio: 39.99, creditos: 50, popular: true },
  { id: 'empresarial', nombre: '🏢 Empresarial', precio: 129.99, creditos: 200, popular: false },
];

export const RIF_LABELS = { VE: 'RIF', CO: 'NIT', MX: 'RFC', PE: 'RUC', AR: 'CUIT', CL: 'RUT' };

// ---- Calendario de cumplimiento con recurrencia ----
// rec.tipo: 'anual' (mes/dia) | 'semestral' (fechas) | 'trimestral' (fin de trimestre)
export const OBLIGACIONES = [
  { id: 've-psst', pais: 'VE', titulo: '📋 PSST registrado INPSASEL', tipo: 'vencimiento', urgencia: 'alta', ley: 'NT-04-2023', rec: { tipo: 'anual', mes: 1, dia: 31 } },
  { id: 've-formacion', pais: 'VE', titulo: '📚 16h trimestrales de formación SST', tipo: 'formacion', urgencia: 'alta', ley: 'LOPCYMAT', rec: { tipo: 'trimestral' } },
  { id: 've-examenes', pais: 'VE', titulo: '🩺 Exámenes médicos periódicos', tipo: 'obligacion', urgencia: 'alta', ley: 'LOPCYMAT', rec: { tipo: 'anual', mes: 4, dia: 15 } },
  { id: 've-simulacro1', pais: 'VE', titulo: '🔴 Simulacro de emergencias (1er semestre)', tipo: 'inspeccion', urgencia: 'media', ley: 'LOPCYMAT', rec: { tipo: 'semestral', fechas: [[6, 15], [11, 15]] } },
  { id: 've-cierre', pais: 'VE', titulo: '📊 Cierre anual del PSST', tipo: 'vencimiento', urgencia: 'alta', ley: 'LOPCYMAT', rec: { tipo: 'anual', mes: 12, dia: 31 } },

  { id: 'co-plan', pais: 'CO', titulo: '📋 Plan de trabajo anual SG-SST', tipo: 'vencimiento', urgencia: 'alta', ley: 'Decreto 1072', rec: { tipo: 'anual', mes: 1, dia: 31 } },
  { id: 'co-capacitacion', pais: 'CO', titulo: '📚 Capacitación según perfil de riesgo', tipo: 'formacion', urgencia: 'media', ley: 'Resolución 0312', rec: { tipo: 'anual', mes: 12, dia: 15 } },
  { id: 'co-examenes', pais: 'CO', titulo: '🩺 Exámenes ocupacionales', tipo: 'obligacion', urgencia: 'alta', ley: 'Resolución 0312', rec: { tipo: 'semestral', fechas: [[7, 15], [1, 15]] } },
  { id: 'co-autoeval', pais: 'CO', titulo: '🔍 Autoevaluación del SG-SST', tipo: 'inspeccion', urgencia: 'media', ley: 'Decreto 1072', rec: { tipo: 'anual', mes: 12, dia: 20 } },

  { id: 'mx-psicosocial', pais: 'MX', titulo: '🧠 Identificación de riesgos psicosociales', tipo: 'vencimiento', urgencia: 'alta', ley: 'NOM-035-STPS', rec: { tipo: 'anual', mes: 3, dia: 15 } },
  { id: 'mx-capacitacion', pais: 'MX', titulo: '📚 Capacitación en seguridad y salud', tipo: 'formacion', urgencia: 'media', ley: 'NOM-030-STPS', rec: { tipo: 'anual', mes: 11, dia: 30 } },
  { id: 'mx-comisiones', pais: 'MX', titulo: '👥 Comisiones de seguridad e higiene', tipo: 'obligacion', urgencia: 'media', ley: 'LFT', rec: { tipo: 'anual', mes: 6, dia: 30 } },

  { id: 'pe-comite', pais: 'PE', titulo: '📋 Comité de Seguridad y Salud en el Trabajo', tipo: 'vencimiento', urgencia: 'alta', ley: 'Ley 29783', rec: { tipo: 'anual', mes: 4, dia: 1 } },
  { id: 'pe-iperc', pais: 'PE', titulo: '🔍 Actualización de matriz IPERC', tipo: 'inspeccion', urgencia: 'media', ley: 'DS 005-2012-TR', rec: { tipo: 'semestral', fechas: [[6, 30], [12, 31]] } },
  { id: 'pe-examenes', pais: 'PE', titulo: '🩺 Exámenes médicos ocupacionales', tipo: 'obligacion', urgencia: 'alta', ley: 'Ley 29783', rec: { tipo: 'anual', mes: 8, dia: 15 } },
  { id: 'pe-capacitacion', pais: 'PE', titulo: '📚 Capacitación trimestral SST', tipo: 'formacion', urgencia: 'media', ley: 'Ley 29783', rec: { tipo: 'trimestral' } },

  { id: 'ar-servicio', pais: 'AR', titulo: '📋 Servicio de Higiene y Seguridad y Medicina Laboral', tipo: 'vencimiento', urgencia: 'alta', ley: 'Ley 19.587 / Dec. 351', rec: { tipo: 'anual', mes: 3, dia: 31 } },
  { id: 'ar-examenes', pais: 'AR', titulo: '🩺 Exámenes preocupacionales y periódicos', tipo: 'obligacion', urgencia: 'alta', ley: 'Ley 24.557', rec: { tipo: 'anual', mes: 7, dia: 15 } },
  { id: 'ar-capacitacion', pais: 'AR', titulo: '📚 Programa anual de capacitación (3 niveles)', tipo: 'formacion', urgencia: 'media', ley: 'Dec. 351/79', rec: { tipo: 'anual', mes: 11, dia: 30 } },

  { id: 'cl-programa', pais: 'CL', titulo: '📋 Programa de prevención de riesgos', tipo: 'vencimiento', urgencia: 'alta', ley: 'DS 40/69', rec: { tipo: 'anual', mes: 1, dia: 31 } },
  { id: 'cl-comite', pais: 'CL', titulo: '👥 Comité Paritario de Higiene y Seguridad', tipo: 'obligacion', urgencia: 'media', ley: 'Ley 16.744', rec: { tipo: 'anual', mes: 5, dia: 1 } },
  { id: 'cl-examenes', pais: 'CL', titulo: '🩺 Examen físico ocupacional', tipo: 'obligacion', urgencia: 'alta', ley: 'DS 44', rec: { tipo: 'anual', mes: 9, dia: 15 } },
  { id: 'cl-simulacro', pais: 'CL', titulo: '🔴 Simulacro de emergencias', tipo: 'inspeccion', urgencia: 'media', ley: 'DS 594', rec: { tipo: 'semestral', fechas: [[6, 30], [11, 30]] } },
];

// ---- Montos dinámicos ----
export function valorAnual(expr, anno, params) {
  const p = params || PARAMS_DEFAULT;
  const tabla = p[expr];
  if (!tabla) return null;
  if (tabla[anno] !== undefined) return tabla[anno];
  // busca el año más reciente disponible
  const anos = Object.keys(tabla).map(Number).filter((a) => a <= anno && tabla[a] !== undefined);
  return anos.length ? tabla[Math.max(...anos)] : null;
}

export function fmtLocal(pais, cantidad) {
  const norm = NORMATIVAS[pais];
  const t = norm ? norm.tasaLocal : 'ves';
  const locales = {
    ves: (n) => 'Bs. ' + n.toLocaleString('es-VE'),
    cop: (n) => '$ ' + n.toLocaleString('es-CO'),
    mxn: (n) => '$ ' + n.toLocaleString('es-MX'),
    pen: (n) => 'S/ ' + n.toLocaleString('es-PE'),
    ars: (n) => '$ ' + n.toLocaleString('es-AR'),
    clp: (n) => '$ ' + n.toLocaleString('es-CL'),
  };
  return (locales[t] || locales.ves)(cantidad);
}

export function montosTexto(pais, params, anno) {
  const norm = NORMATIVAS[pais];
  if (!norm) return '';
  const a = anno || new Date().getFullYear();
  const m = norm.multa;
  if (m.expr === 'texto') return m.texto;
  const val = valorAnual(m.expr, a, params);
  if (!val) return '';
  const unidad = { ut: 'UT', smmlv: 'SMMLV', uma: 'UMA', uit: 'UIT', utm: 'UTM' }[m.expr] || m.expr;
  const ref = m.ref ? ' (según ' + m.ref + ')' : '';
  if (m.min !== undefined) {
    return 'de ' + m.min + ' a ' + m.max + ' ' + unidad + ' (≈ ' + fmtLocal(pais, m.min * val) + ' a ' + fmtLocal(pais, m.max * val) + ')' + ref;
  }
  return 'hasta ' + m.max + ' ' + unidad + ' (≈ ' + fmtLocal(pais, m.max * val) + ')' + ref;
}

// ---- Calendario dinámico: genera obligaciones (hoy-45d .. +12 meses) ----
export function generarObligaciones(pais, params) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ventanaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 12, hoy.getDate());
  const lista = [];
  for (const ob of OBLIGACIONES) {
    if (ob.pais !== pais) continue;
    for (let y = hoy.getFullYear() - 1; y <= ventanaFin.getFullYear(); y++) {
      const fechas = fechasDe(ob.rec, y);
      for (const f of fechas) {
        const d = new Date(y, f[0] - 1, f[1]);
        if (d < hoy) d.setFullYear(d.getFullYear() + 1);
        if (d >= hoy && d <= ventanaFin) {
          lista.push({ ...ob, fecha: d.toISOString().slice(0, 10) });
        }
      }
    }
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  function fechasDe(rec, y) {
    if (rec.tipo === 'anual') return [[rec.mes, rec.dia]];
    if (rec.tipo === 'semestral') return rec.fechas;
    if (rec.tipo === 'trimestral') return [[3, 31], [6, 30], [9, 30], [12, 31]];
    return [];
  }
}

// ---- Plantillas de publicación ----
// ctx: { tema, empresa, norm, rifLabel, rif, dir, tel, email, contacto, multa, disclaimer, anno }
export function plantilla(pais, tipo, tema, ctx) {
  const t = String(tema || '').trim();
  const linea = (txt) => (txt ? '\n' + txt : '');
  const contacto = (ctx.tel || ctx.email || ctx.contacto)
    ? '\n\nContáctanos:' + linea(ctx.tel).replace('\n', '\n📞 ') + linea(ctx.email).replace('\n', '\n📧 ') + linea(ctx.contacto).replace('\n', '\n👤 ')
    : '';
  const pie = contacto + linea(ctx.dir).replace('\n', '\n📍 ') + (ctx.rif ? '\n' + ctx.rifLabel + ': ' + ctx.rif : '');
  const disc = ctx.disclaimer ? '\n\n' + ctx.disclaimer : '';
  const n = ctx.norm;

  const T = {
    VE: {
      educativo: '📚 ' + t + '\n\n"' + n.leyes[0] + ' exige que toda empresa cuente con un ' + n.exigible.PSST + '."\n\nEn ' + ctx.empresa + ' cumplimos porque la seguridad de nuestro equipo es prioridad.\n\n✅ PSST registrado\n✅ Delegado de prevención designado\n✅ CSSL constituido\n\n¿Tu empresa cumple? Contáctanos para una asesoría personalizada.',
      promocional: '📢 ' + t + '\n\nEn ' + ctx.empresa + ' implementamos y mantenemos el cumplimiento de:\n\n✅ ' + n.leyes.join('\n✅ ') + '\n\n🏢 ' + n.exigible.PSST + '\n📚 ' + n.exigible.formacion + '\n👥 ' + n.exigible.CSSL + '\n🩺 Exámenes médicos al día\n\n📱 Contáctanos hoy y evita sanciones (' + ctx.multa + ').',
      conciencia: '⚠️ ' + t + '\n\n"' + n.leyes[0] + ' sanciona el incumplimiento con ' + ctx.multa + '."\n\nAdemás, la autoridad competente puede suspender actividades por:\n❌ No tener ' + n.exigible.PSST.split(' según')[0] + '\n❌ No realizar exámenes médicos\n❌ No constituir el ' + (n.exigible.CSSL || 'comité de SST') + '\n\n' + ctx.empresa + ' te ayuda a cumplir y proteger a tu equipo.',
    },
    CO: {
      educativo: '📚 ' + t + '\n\n"' + n.leyes[0] + ' establece que toda empresa debe implementar un ' + n.exigible.PSST + ' según características de su actividad."\n\nEn ' + ctx.empresa + ' cumplimos porque protegemos lo más valioso: nuestro talento humano.\n\n¿Tu empresa está al día? Contáctanos para una evaluación sin compromiso.',
      promocional: '📢 ' + t + '\n\nEn ' + ctx.empresa + ' te ayudamos con el cumplimiento normativo colombiano:\n\n✅ ' + n.leyes.join('\n✅ ') + '\n\n📋 ' + n.exigible.PSST + '\n👥 ' + n.exigible.COPASST + '\n🩺 Exámenes ocupacionales vigentes\n\n📱 Escríbenos y protege a tu equipo.',
      conciencia: '⚠️ ' + t + '\n\n"El incumplimiento del SG-SST se sanciona con multas de hasta ' + ctx.multa + '."\n\nNo pongas en riesgo tu empresa ni a tus colaboradores. ' + ctx.empresa + ' te ayuda a cumplir.',
    },
    MX: {
      educativo: '📚 ' + t + '\n\n"' + n.leyes[0] + ' obliga a los empleadores a identificar, analizar y prevenir los factores de riesgo en el centro de trabajo."\n\nEn ' + ctx.empresa + ' la salud y el bienestar de nuestro equipo son prioridad.\n\n¿Tu empresa cumple? Contáctanos.',
      promocional: '📢 ' + t + '\n\nEn ' + ctx.empresa + ' te apoyamos con el cumplimiento de:\n\n✅ ' + n.leyes.join('\n✅ ') + '\n\n📋 Evaluaciones de riesgos psicosociales y físicos\n🏋️ EPP certificado\n📚 Capacitación constante\n\n📱 Contáctanos hoy.',
      conciencia: '⚠️ ' + t + '\n\n"' + n.leyes[0] + ' establece sanciones administrativas de hasta ' + ctx.multa + ' por incumplimiento."\n\nProtege a tu equipo y evita sanciones. ' + ctx.empresa + ' te ayuda a cumplir.',
    },
    PE: {
      educativo: '📚 ' + t + '\n\n"' + n.leyes[0] + ' establece que todo empleador debe garantizar un entorno de trabajo seguro implementando un sistema de gestión de SST."\n\nEn ' + ctx.empresa + ' la seguridad es inversión, no gasto.\n\n¿Tu empresa cumple? Contáctanos.',
      promocional: '📢 ' + t + '\n\nEn ' + ctx.empresa + ' te ayudamos con el cumplimiento de:\n\n✅ ' + n.leyes.join('\n✅ ') + '\n\n📋 ' + n.exigible.PSST + '\n👥 ' + n.exigible.CSST + '\n🩺 Exámenes ocupacionales\n\n📱 Contáctanos y protege a tu equipo.',
      conciencia: '⚠️ ' + t + '\n\n"Sunafil sanciona el incumplimiento con multas de hasta ' + ctx.multa + ' y paralización de actividades."\n\nLa seguridad no es negociable. ' + ctx.empresa + ' te ayuda a cumplir con la ley y cuidar a tus trabajadores.',
    },
    AR: {
      educativo: '📚 ' + t + '\n\n"' + n.leyes[0] + ' establece condiciones mínimas de higiene y seguridad para todos los puestos de trabajo."\n\nEn ' + ctx.empresa + ' cumplimos porque cuidar a las personas es lo primero.\n\n¿Tu empresa cumple? Contáctanos.',
      promocional: '📢 ' + t + '\n\nEn ' + ctx.empresa + ' te ayudamos con:\n\n✅ Servicio de Higiene y Seguridad y Medicina Laboral\n✅ Programa anual de capacitación (3 niveles)\n✅ Exámenes preocupacionales y periódicos\n✅ Gestión con tu ART\n\n📱 Contáctanos y trabaja tranquilo.',
      conciencia: '⚠️ ' + t + '\n\n"El incumplimiento de la ' + n.leyes[0] + ' puede derivar en ' + ctx.multa + '."\n\n' + ctx.empresa + ' te ayuda a cumplir y a evitar contingencias legales.',
    },
    CL: {
      educativo: '📚 ' + t + '\n\n"' + n.leyes[0] + ' protege a los trabajadores contra accidentes del trabajo y enfermedades profesionales."\n\nEn ' + ctx.empresa + ' cumplimos porque tu salud laboral importa.\n\n¿Tu empresa cumple? Contáctanos.',
      promocional: '📢 ' + t + '\n\nEn ' + ctx.empresa + ' te ayudamos con:\n\n✅ Programa de prevención de riesgos (DS 40/69)\n✅ Comité Paritario de Higiene y Seguridad\n✅ Examen físico ocupacional (DS 44)\n✅ Plan de emergencias\n\n📱 Contáctanos y prevén sanciones (' + ctx.multa + ').',
      conciencia: '⚠️ ' + t + '\n\n"El incumplimiento en prevención de riesgos se sanciona con multas de hasta ' + ctx.multa + '."\n\n' + ctx.empresa + ' te ayuda a cumplir la Ley 16.744 y a proteger a tu equipo.',
    },
  };
  const plant = (T[pais] && T[pais][tipo]) || T.VE.educativo;
  return plant + pie + disc;
}

export function hashtags(pais, tipo) {
  const norm = NORMATIVAS[pais] || NORMATIVAS.VE;
  const base = ['#' + norm.nombre.replace(/\s/g, ''), '#' + norm.leyes[0].split(' ')[0].replace(/[\s/]/g, ''), '#SST', '#Prevencion'];
  const extras = {
    educativo: ['#CapacitacionSST', '#SeguridadLaboral'],
    promocional: ['#ServiciosSST', '#ConsultoriaSST'],
    conciencia: ['#Concienciacion', '#CeroAccidentes'],
  };
  return base.concat(extras[tipo] || []);
}

export const MEJORES_HORARIOS = {
  instagram: [{ d: 'Lunes', h: '11:00-13:00' }, { d: 'Miércoles', h: '12:00-14:00' }, { d: 'Viernes', h: '17:00-19:00' }],
  facebook: [{ d: 'Martes', h: '09:00-11:00' }, { d: 'Jueves', h: '13:00-15:00' }, { d: 'Sábado', h: '10:00-12:00' }],
  linkedin: [{ d: 'Martes', h: '08:00-10:00' }, { d: 'Miércoles', h: '09:00-11:00' }, { d: 'Jueves', h: '10:00-12:00' }],
  tiktok: [{ d: 'Miércoles', h: '19:00-21:00' }, { d: 'Viernes', h: '20:00-22:00' }],
  whatsapp: [{ d: 'Diario', h: '09:00-11:00' }, { d: 'Diario', h: '15:00-17:00' }],
};