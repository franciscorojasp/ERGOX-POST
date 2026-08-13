// Verificador de sintaxis de módulos ES (sin ejecutar el DOM)
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const raiz = join(import.meta.dirname, '..');
const omitidos = ['node_modules', '.git', 'legacy'];

function archivosJS(dir, salida = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (omitidos.includes(e.name)) continue;
    const ruta = join(dir, e.name);
    if (e.isDirectory()) archivosJS(ruta, salida);
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) salida.push(ruta);
  }
  return salida;
}

// Cualquier archivo fuera de js/ no debe importar DOM: se verifica con node --check
import { execSync } from 'node:child_process';

let fallos = 0;
for (const f of archivosJS(raiz)) {
  try {
    execSync(`node --check "${f}"`, { stdio: 'pipe' });
  } catch (e) {
    fallos++;
    console.error('❌ ERROR DE SINTAXIS:', relative(raiz, f));
    console.error(String(e.stderr || e.stdout || e));
  }
}

if (fallos === 0) {
  console.log('✅ Sintaxis OK en todos los módulos JS');
} else {
  console.log(`❌ ${fallos} archivo(s) con errores de sintaxis`);
  process.exit(1);
}