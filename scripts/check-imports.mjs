// =====================================================
// Verificador de integridad de módulos ES:
// 1) Todo import relativo resuelve a un archivo existente.
// 2) Los nombres importados existen entre los exports del módulo.
// Omiten ejecución los módulos que tocan el DOM al importarse.
// =====================================================
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = join(import.meta.dirname, '..');
const omitidos = ['node_modules', '.git', 'legacy', 'scripts', 'tests'];
// módulos que ejecutan código DOM al ser importados (no se importan dinámicamente)
const skipEjecucion = new Set(['js/app.js', 'js/marketing/landing.js', 'sw.js']);

function archivosJS(dir, salida = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (omitidos.includes(e.name)) continue;
    const ruta = join(dir, e.name);
    if (e.isDirectory()) archivosJS(ruta, salida);
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) salida.push(ruta);
  }
  return salida;
}

const todos = archivosJS(raiz);
const rutaAbs = new Set(todos.map((f) => f.replace(/\\/g, '/')));

function resolver(dir, espec) {
  const base = join(dir, espec).replace(/\\/g, '/');
  const candidatos = [base, base + '.js'];
  for (const c of candidatos) {
    if (rutaAbs.has(c)) return c;
  }
  // módulo con index.js
  if (rutaAbs.has(base + '/index.js')) return base + '/index.js';
  return null;
}

const fallos = [];

for (const f of todos) {
  const rel = relative(raiz, f).replace(/\\/g, '/');
  const contenido = readFileSync(f, 'utf8');
  const dir = dirname(f);
  const importados = new Set();

  // imports estáticos y dinámicos relativos
  const re = /(?:from\s+|import\(\s*)['"](\.\.?\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(contenido))) {
    const espec = m[1];
    const destino = resolver(dir, espec);
    if (!destino) {
      fallos.push(`❌ ${rel}: no se encuentra '${espec}'`);
      continue;
    }
    importados.add({ destino, rel });
  }
}

// verificación de nombres exportados vía import() (fuera de los que ejecutan DOM)
const cache = new Map();
async function importar(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const mod = await import(pathToFileURL(join(raiz, rel)).href).catch((e) => {
    cache.set(rel, { error: e });
    return { error: e };
  });
  cache.set(rel, mod);
  return mod;
}

for (const f of todos) {
  const rel = relative(raiz, f).replace(/\\/g, '/');
  const contenido = readFileSync(f, 'utf8');
  if (skipEjecucion.has(rel)) continue;
  const mod = await importar(rel);
  if (mod.error) {
    fallos.push(`❌ ${rel}: no se puede importar → ${mod.error.message.split('\n')[0]}`);
    continue;
  }
  // nombres importados
  const re = /import\s+\{([^}]+)\}\s+from\s+['"](\.\.?\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(contenido))) {
    const destino = resolver(dirname(f), m[2]);
    if (!destino) continue;
    const destinoRel = relative(raiz, destino).replace(/\\/g, '/');
    const modDest = await importar(destinoRel);
    if (modDest.error) continue;
    const nombres = m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    for (const n of nombres) {
      if (!(n in modDest)) {
        fallos.push(`❌ ${rel}: export '${n}' no existe en '${m[2]}'`);
      }
    }
  }
}

if (fallos.length === 0) {
  console.log(`✅ Integridad OK: ${todos.length} módulos, imports resueltos y exports verificados`);
} else {
  console.log(fallos.join('\n'));
  console.log(`❌ ${fallos.length} problema(s) de integridad`);
  process.exit(1);
}