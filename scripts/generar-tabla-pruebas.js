#!/usr/bin/env node
/**
 * Genera reports/pruebas_resultados.tex a partir de los reportes de Jest.
 *
 * Uso:   npm run test:report
 *
 * Lee:   reports/jest.json                   (resultados de las pruebas)
 *        coverage/coverage-summary.json      (cobertura, opcional)
 * Crea:  reports/pruebas_resultados.tex      (tablas listas para \input en la tesis)
 *        reports/pruebas_macros.tex          (macros \pruebasTotal, \pruebasAprobadas, ...)
 *
 * Cada prueba debe llamarse:  "ID | entrada o condición | resultado esperado"
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
 
const RAIZ = process.cwd();
const REPORTE = path.join(RAIZ, 'reports', 'jest.json');
const COBERTURA = path.join(RAIZ, 'coverage', 'coverage-summary.json');
const SALIDA = path.join(RAIZ, 'reports', 'pruebas_resultados.tex');
const SALIDA_MACROS = path.join(RAIZ, 'reports', 'pruebas_macros.tex');
 
/* ---------- CONFIGURACIÓN: ajusta títulos y etiquetas \label de tu tesis ---------- */
const GRUPOS = {
  NIV: { titulo: 'nivelación inicial del aprendiz', etiqueta: 'sec:nivelacion' },
  RAC: { titulo: 'racha de uso diario', etiqueta: '' },          // ej.: 'sec:gamificacion'
  PRO: { titulo: 'progreso del curso y completitud en cascada', etiqueta: '' },
};
const ARCHIVOS_COBERTURA = [
  { ruta: 'src/data/placementQuestions.ts', nombre: 'placementQuestions.ts' },
  { ruta: 'src/services/cursosService.ts', nombre: 'cursosService.ts' },
  { ruta: 'src/services/storageService.ts', nombre: 'storageService.ts' },
];
/* --------------------------------------------------------------------------------- */
 
const MAPA = { '\\': '\\textbackslash{}', '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
  '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' };
const esc = s => String(s).replace(/[\\&%$#_{}~^]/g, c => MAPA[c]);
const dec = n => n.toFixed(1).replace('.', ',');
const seg = ms => (ms / 1000).toFixed(2).replace('.', ',');
 
if (!fs.existsSync(REPORTE)) {
  console.error('No existe reports/jest.json. Ejecuta primero:  npm run test:report');
  process.exit(1);
}
const json = JSON.parse(fs.readFileSync(REPORTE, 'utf8'));
 
/* ---------- 1. Agrupar pruebas por prefijo de ID ---------- */
const grupos = {};
for (const suite of json.testResults) {
  for (const t of suite.assertionResults) {
    const partes = t.title.split(' | ');
    const m = /^([A-Z]+)-(\d+)$/.exec(partes[0].trim());
    if (!m || partes.length !== 3) {
      console.warn(`Aviso: la prueba "${t.title}" no sigue el formato "ID | entrada | esperado"; se omite.`);
      continue;
    }
    (grupos[m[1]] = grupos[m[1]] || []).push({
      id: partes[0].trim(), num: Number(m[2]), entrada: partes[1].trim(),
      esperado: partes[2].trim(), estado: t.status, ms: t.duration || 0,
    });
  }
}
const prefijos = Object.keys(GRUPOS).filter(p => grupos[p]);
prefijos.forEach(p => grupos[p].sort((a, b) => a.num - b.num));
 
const estadoTxt = s => (s === 'passed' ? 'Aprobó' : s === 'failed' ? 'Falló' : 'Omitida');
 
/* ---------- 2. Construir el LaTeX ---------- */
const out = [];
const L = s => out.push(s);
 
const total = prefijos.reduce((a, p) => a + grupos[p].length, 0);
const aprob = prefijos.reduce((a, p) => a + grupos[p].filter(t => t.estado === 'passed').length, 0);
const durTotal = prefijos.reduce((a, p) => a + grupos[p].reduce((s, t) => s + t.ms, 0), 0);
 
L('% ==========================================================================');
L('% Archivo generado automáticamente por scripts/generar-tabla-pruebas.js');
L('% NO lo edites a mano: vuelve a ejecutar  npm run test:report');
L('% Requiere en el preámbulo:  \\usepackage{longtable}  y  \\usepackage{array}');
L('% ==========================================================================');
const macros = [
  '% Generado automáticamente por scripts/generar-tabla-pruebas.js (no editar).',
  `\\def\\pruebasTotal{${total}}`,
  `\\def\\pruebasAprobadas{${aprob}}`,
  `\\def\\pruebasFalladas{${total - aprob}}`,
  `\\def\\pruebasDuracion{${seg(durTotal)}}`,
];
 
/* 2a. Entorno de ejecución */
const version = nombre => {
  try { return require(path.join(RAIZ, 'node_modules', nombre, 'package.json')).version; }
  catch { return 'no disponible'; }
};
const fecha = new Date(json.startTime).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short' });
L('\\begin{table}[H]');
L('\\centering');
L('\\caption{Entorno de ejecución de las pruebas unitarias}');
L('\\label{tab:pruebas-entorno}');
L('\\begin{tabular}{ll}');
L('\\hline');
L('\\textbf{Elemento} & \\textbf{Valor} \\\\ \\hline');
L(`Fecha de ejecución & ${esc(fecha)} \\\\`);
L(`Sistema operativo & ${esc(os.type() + ' ' + os.release())} \\\\`);
L(`Node.js & ${esc(process.version)} \\\\`);
L(`Jest & ${esc(version('jest'))} \\\\`);
L(`jest-expo & ${esc(version('jest-expo'))} \\\\ \\hline`);
L('\\end{tabular}');
L('\\end{table}');
L('');
 
/* 2b. Resumen por conjunto */
L('\\begin{table}[H]');
L('\\centering');
L('\\caption{Resumen de resultados por conjunto de pruebas}');
L('\\label{tab:pruebas-resumen}');
L('\\begin{tabular}{>{\\raggedright\\arraybackslash}p{0.36\\textwidth}cccc}');
L('\\hline');
L('\\textbf{Conjunto} & \\textbf{Pruebas} & \\textbf{Aprobadas} & \\textbf{Falladas} & \\textbf{Tiempo (s)} \\\\ \\hline');
for (const p of prefijos) {
  const g = grupos[p];
  const ok = g.filter(t => t.estado === 'passed').length;
  const ms = g.reduce((s, t) => s + t.ms, 0);
  L(`${p} --- ${esc(GRUPOS[p].titulo.charAt(0).toUpperCase() + GRUPOS[p].titulo.slice(1))} & ${g.length} & ${ok} & ${g.length - ok} & ${seg(ms)} \\\\`);
}
L('\\hline');
L(`\\textbf{Total} & \\textbf{${total}} & \\textbf{${aprob}} & \\textbf{${total - aprob}} & \\textbf{${seg(durTotal)}} \\\\ \\hline`);
L('\\end{tabular}');
L('\\end{table}');
L('');
 
/* 2c. Una tabla de casos por conjunto */
for (const p of prefijos) {
  const g = GRUPOS[p];
  const ref = g.etiqueta ? ` (Sección~\\ref{${g.etiqueta}})` : '';
  const cap = `Casos de prueba del conjunto ${p}: ${g.titulo}${ref}`;
  const cab = '\\textbf{ID} & \\textbf{Entrada o condición} & \\textbf{Resultado esperado} & \\textbf{Estado} \\\\ \\hline';
  L('{\\small');
  L('\\begin{longtable}{>{\\raggedright\\arraybackslash}p{0.09\\textwidth}>{\\raggedright\\arraybackslash}p{0.35\\textwidth}>{\\raggedright\\arraybackslash}p{0.32\\textwidth}>{\\raggedright\\arraybackslash}p{0.10\\textwidth}}');
  L(`\\caption{${cap}}\\label{tab:pruebas-${p}}\\\\`);
  L('\\hline'); L(cab); L('\\endfirsthead');
  L(`\\caption[]{${cap} (continuación)}\\\\`);
  L('\\hline'); L(cab); L('\\endhead');
  L('\\hline \\endfoot');
  for (const t of grupos[p]) {
    L(`${t.id} & ${esc(t.entrada)} & ${esc(t.esperado)} & ${estadoTxt(t.estado)} \\\\ \\hline`);
  }
  L('\\end{longtable}');
  L('}');
  L('');
}
 
/* 2d. Cobertura (opcional) */
if (fs.existsSync(COBERTURA)) {
  const cob = JSON.parse(fs.readFileSync(COBERTURA, 'utf8'));
  const claves = Object.keys(cob).filter(k => k !== 'total');
  L('\\begin{table}[H]');
  L('\\centering');
  L('\\caption{Cobertura de código de los módulos evaluados}');
  L('\\label{tab:pruebas-cobertura}');
  L('\\begin{tabular}{lccc}');
  L('\\hline');
  L('\\textbf{Archivo} & \\textbf{Líneas} & \\textbf{Ramas} & \\textbf{Funciones} \\\\ \\hline');
  for (const a of ARCHIVOS_COBERTURA) {
    const k = claves.find(c => c.replace(/\\/g, '/').endsWith(a.ruta));
    if (!k) continue;
    const c = cob[k];
    L(`\\texttt{${esc(a.nombre)}} & ${dec(c.lines.pct)}\\,\\% & ${dec(c.branches.pct)}\\,\\% & ${dec(c.functions.pct)}\\,\\% \\\\`);
  }
  L('\\hline');
  L('\\end{tabular}');
  L('\\end{table}');
} else {
  console.warn('Aviso: no se encontró coverage/coverage-summary.json; se omite la tabla de cobertura.');
}
 
fs.writeFileSync(SALIDA, out.join('\n') + '\n', 'utf8');
fs.writeFileSync(SALIDA_MACROS, macros.join('\n') + '\n', 'utf8');
console.log(`Generado: ${path.relative(RAIZ, SALIDA)}  (${aprob}/${total} pruebas aprobadas)`);
