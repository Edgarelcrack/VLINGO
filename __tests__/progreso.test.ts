/**
 * Conjunto PRO — Progreso del curso y completitud en cascada
 * Componente evaluado : marcarCompletadaYAvanzar()
 * Archivo fuente      : src/services/cursosService.ts
 * Técnicas aplicadas  : partición de equivalencia y transición de estado
 *                       (locked/active → done → desbloqueo de la siguiente sección)
 * Dobles de prueba    : cliente de Supabase simulado en memoria (test-utils/fakeSupabase.ts)
 *
 * Estructura base de los datos de prueba:
 *   S1 (sección raíz, orden 0) ── L1 (lección, orden 0)
 *                              └─ L2 (lección, orden 1)
 *   S2 (sección raíz, orden 1)
 *
 * Convención de nombre de cada prueba:  ID | entrada o condición | resultado esperado
 */
import { createFakeSupabase } from '../test-utils/fakeSupabase';
 
let mockFake: ReturnType<typeof createFakeSupabase>;
jest.mock('../src/lib/supabase', () => ({
  get supabase() { return mockFake.client; },
}));
 
import { marcarCompletadaYAvanzar, XP_POR_SECCION } from '../src/services/cursosService';
 
const USER = 'u1';
const C = 'curso1';
const sec = (id: string, orden: number, tipo: string, parent_id: string | null = null) =>
  ({ id, curso_id: C, parent_id, orden, tipo });
const prog = (seccion_id: string, estado: string) => ({ usuario_id: USER, seccion_id, estado });
const rpc = (nombre: string) => mockFake.rpcCalls.filter(c => c.fn === nombre);
 
const baseSecciones = () => [
  sec('S1', 0, 'seccion'),
  sec('L1', 0, 'leccion', 'S1'),
  sec('L2', 1, 'leccion', 'S1'),
  sec('S2', 1, 'seccion'),
];
 
describe('PRO — Progreso del curso y completitud en cascada', () => {
  describe('Puntos y experiencia', () => {
    test('PRO-01 | Completar una lección activa | Estado done, +10 XP y +1 punto de lectura', async () => {
      mockFake = createFakeSupabase({ seccion: baseSecciones(), progreso_usuario: [prog('L1', 'active')] });
      const r = await marcarCompletadaYAvanzar(USER, 'L1');
      expect(r).toEqual({ error: null, xpGanado: XP_POR_SECCION });
      expect(mockFake.estado('L1')).toBe('done');
      expect(rpc('incrementar_xp')[0].args).toEqual({ p_user_id: USER, p_monto: 10 });
      expect(rpc('incrementar_puntos')[0].args).toEqual({ p_user_id: USER, p_tipo: 'reading', p_monto: 1 });
    });
    test('PRO-03 | Completar una lección que ya estaba terminada | 0 XP y ninguna llamada de puntuación', async () => {
      mockFake = createFakeSupabase({ seccion: baseSecciones(), progreso_usuario: [prog('L1', 'done')] });
      const r = await marcarCompletadaYAvanzar(USER, 'L1');
      expect(r.xpGanado).toBe(0);
      expect(mockFake.rpcCalls).toHaveLength(0);
    });
    test('PRO-04 | Completar una sección (no una lección) | +10 XP y sin puntos de lectura', async () => {
      mockFake = createFakeSupabase({ seccion: baseSecciones(), progreso_usuario: [prog('S1', 'active')] });
      await marcarCompletadaYAvanzar(USER, 'S1');
      expect(rpc('incrementar_xp')).toHaveLength(1);
      expect(rpc('incrementar_puntos')).toHaveLength(0);
    });
  });
 
  describe('Desbloqueo de contenido', () => {
    test('PRO-02 | Completar la primera de dos lecciones | La siguiente lección pasa a active y la sección sigue sin completar', async () => {
      mockFake = createFakeSupabase({ seccion: baseSecciones(), progreso_usuario: [prog('L1', 'active')] });
      await marcarCompletadaYAvanzar(USER, 'L1');
      expect(mockFake.estado('L2')).toBe('active');
      expect(mockFake.estado('S1')).toBeNull();
    });
  });
 
  describe('Completitud en cascada', () => {
    test('PRO-05 | Completar la última lección de una sección | Lección y sección en done, +20 XP', async () => {
      mockFake = createFakeSupabase({
        seccion: baseSecciones(),
        progreso_usuario: [prog('L1', 'done'), prog('L2', 'active'), prog('S1', 'active')],
      });
      const r = await marcarCompletadaYAvanzar(USER, 'L2');
      expect(mockFake.estado('L2')).toBe('done');
      expect(mockFake.estado('S1')).toBe('done');
      expect(r.xpGanado).toBe(2 * XP_POR_SECCION);
    });
    test('PRO-06 | Cascada con una sección raíz posterior | La siguiente sección raíz pasa a active', async () => {
      mockFake = createFakeSupabase({
        seccion: baseSecciones(),
        progreso_usuario: [prog('L1', 'done'), prog('L2', 'active'), prog('S1', 'active')],
      });
      await marcarCompletadaYAvanzar(USER, 'L2');
      expect(mockFake.estado('S2')).toBe('active');
    });
    test('PRO-07 | Completar la última hermana con otra hermana pendiente | No hay cascada y la sección padre no se completa', async () => {
      mockFake = createFakeSupabase({
        seccion: [sec('S1', 0, 'seccion'), sec('L1', 0, 'leccion', 'S1'), sec('L2', 1, 'leccion', 'S1'), sec('L3', 2, 'leccion', 'S1')],
        progreso_usuario: [prog('L1', 'active'), prog('L2', 'active')],
      });
      const r = await marcarCompletadaYAvanzar(USER, 'L3');
      expect(mockFake.estado('S1')).toBeNull();
      expect(r.xpGanado).toBe(XP_POR_SECCION);
    });
    test('PRO-08 | Lección dentro de una subsección dentro de una sección | Los tres niveles en done y +30 XP', async () => {
      mockFake = createFakeSupabase({
        seccion: [sec('R', 0, 'seccion'), sec('SUB', 0, 'seccion', 'R'), sec('LX', 0, 'leccion', 'SUB')],
        progreso_usuario: [prog('LX', 'active')],
      });
      const r = await marcarCompletadaYAvanzar(USER, 'LX');
      expect(mockFake.estado('LX')).toBe('done');
      expect(mockFake.estado('SUB')).toBe('done');
      expect(mockFake.estado('R')).toBe('done');
      expect(r.xpGanado).toBe(3 * XP_POR_SECCION);
    });
  });
 
  describe('Casos límite', () => {
    test('PRO-09 | Identificador de sección inexistente | Sin error: se registra el progreso y se otorgan 10 XP', async () => {
      mockFake = createFakeSupabase({ seccion: baseSecciones() });
      const r = await marcarCompletadaYAvanzar(USER, 'NO_EXISTE');
      expect(r.error).toBeNull();
      expect(r.xpGanado).toBe(XP_POR_SECCION);
    });
  });
});
 
