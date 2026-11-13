/**
 * Conjunto NIV — Nivelación inicial del aprendiz
 * Componente evaluado : calcularNivel() y banco PLACEMENT_QUESTIONS
 * Archivo fuente      : src/data/placementQuestions.ts
 * Técnicas aplicadas  : partición de equivalencia y análisis de valores límite
 *
 * Convención de nombre de cada prueba:  ID | entrada o condición | resultado esperado
 * (el script scripts/generar-tabla-pruebas.js usa este formato para generar las tablas de la tesis)
 */
import {
  calcularNivel,
  PLACEMENT_QUESTIONS,
  PLACEMENT_LEVELS,
  NivelCEFR,
} from '../src/data/placementQuestions';
 
/** Construye respuestas con `aciertos` correctas en el nivel dado; el resto se marca incorrecto. */
function respuestas(nivel: NivelCEFR, aciertos: number): Record<string, number> {
  const out: Record<string, number> = {};
  PLACEMENT_QUESTIONS.filter(p => p.nivel === nivel).forEach((p, i) => {
    out[p.id] = i < aciertos ? p.respuesta_correcta : (p.respuesta_correcta + 1) % 4;
  });
  return out;
}
const todas = (aciertos: Record<NivelCEFR, number>) =>
  PLACEMENT_LEVELS.reduce((acc, n) => ({ ...acc, ...respuestas(n, aciertos[n]) }), {} as Record<string, number>);
 
describe('NIV — Nivelación inicial del aprendiz', () => {
  describe('Integridad del banco de preguntas', () => {
    test('NIV-01 | Banco de preguntas completo | 16 preguntas, 4 por cada nivel (A1, A2, B1 y B2)', () => {
      expect(PLACEMENT_QUESTIONS).toHaveLength(16);
      PLACEMENT_LEVELS.forEach(n =>
        expect(PLACEMENT_QUESTIONS.filter(p => p.nivel === n)).toHaveLength(4),
      );
    });
    test('NIV-02 | Estructura de cada pregunta | 4 opciones y respuesta correcta con índice entre 0 y 3', () => {
      PLACEMENT_QUESTIONS.forEach(p => {
        expect(p.opciones).toHaveLength(4);
        expect(p.respuesta_correcta).toBeGreaterThanOrEqual(0);
        expect(p.respuesta_correcta).toBeLessThanOrEqual(3);
      });
    });
    test('NIV-03 | Identificadores de las preguntas | Todos distintos, sin duplicados', () => {
      const ids = PLACEMENT_QUESTIONS.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
 
  describe('Asignación del nivel (calcularNivel)', () => {
    test('NIV-04 | Ninguna respuesta registrada | Nivel A1 (nivel mínimo)', () => {
      expect(calcularNivel({})).toBe('A1');
    });
    test('NIV-05 | 4 de 4 aciertos en todos los niveles | Nivel B2 (nivel máximo)', () => {
      expect(calcularNivel(todas({ A1: 4, A2: 4, B1: 4, B2: 4 }))).toBe('B2');
    });
    test('NIV-06 | 0 aciertos en todos los niveles | Nivel A1 (nivel mínimo)', () => {
      expect(calcularNivel(todas({ A1: 0, A2: 0, B1: 0, B2: 0 }))).toBe('A1');
    });
    test('NIV-07 | A1 completo y 3 de 4 aciertos en A2 (75 %) | Nivel A2, supera el umbral del 60 %', () => {
      expect(calcularNivel(todas({ A1: 4, A2: 3, B1: 0, B2: 0 }))).toBe('A2');
    });
    test('NIV-08 | A1 completo y 2 de 4 aciertos en A2 (50 %) | Nivel A1, no supera el umbral del 60 %', () => {
      expect(calcularNivel(todas({ A1: 4, A2: 2, B1: 0, B2: 0 }))).toBe('A1');
    });
    test('NIV-09 | A1 y A2 completos, 3 de 4 en B1 y 1 de 4 en B2 | Nivel B1', () => {
      expect(calcularNivel(todas({ A1: 4, A2: 4, B1: 3, B2: 1 }))).toBe('B1');
    });
    test('NIV-10 | 1 de 4 en A2 con B1 y B2 perfectos | Nivel A1, no se saltan niveles', () => {
      expect(calcularNivel(todas({ A1: 4, A2: 1, B1: 4, B2: 4 }))).toBe('A1');
    });
    test('NIV-11 | Dos preguntas de B2 sin responder | Se cuentan como incorrectas: Nivel B1', () => {
      const r = todas({ A1: 4, A2: 4, B1: 4, B2: 4 });
      delete r['b2-1'];
      delete r['b2-2'];
      expect(calcularNivel(r)).toBe('B1');
    });
    test('NIV-12 | A1 completo y una respuesta con identificador inexistente | La respuesta extra se ignora: Nivel A1', () => {
      expect(calcularNivel({ 'zzz-9': 2, ...todas({ A1: 4, A2: 0, B1: 0, B2: 0 }) })).toBe('A1');
    });
  });
});
 
