/**
 * Conjunto RAC — Racha de uso diario
 * Componente evaluado : getStreak() y trackDailyUsage()
 * Archivo fuente      : src/services/storageService.ts
 * Técnicas aplicadas  : partición de equivalencia, valores límite (cambio de mes y de año)
 * Dobles de prueba    : AsyncStorage simulado y reloj controlado (solo se simula la fecha)
 *
 * Convención de nombre de cada prueba:  ID | entrada o condición | resultado esperado
 */
jest.mock('@env', () => ({ SUPABASE_URL: 'http://test', SUPABASE_ANON_KEY: 'key' }), { virtual: true });
jest.mock('../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-document-picker', () => ({}), { virtual: true });
jest.mock('expo-file-system/legacy', () => ({}), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreak, trackDailyUsage } from '../src/services/storageService';
 
const KEY = 'vlingo_active_dates';
const HOY = '2026-10-24';
 
beforeEach(async () => {
  jest.useFakeTimers({
    now: new Date(`${HOY}T12:00:00Z`),
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'],
  });
  await AsyncStorage.clear();
});
afterEach(() => jest.useRealTimers());
 
const guardar = (fechas: string[]) => AsyncStorage.setItem(KEY, JSON.stringify(fechas));
const leer = async (): Promise<string[]> => JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
 
describe('RAC — Racha de uso diario', () => {
  describe('Cálculo de la racha (getStreak)', () => {
    test('RAC-01 | Sin fechas registradas | Racha = 0', async () => {
      expect(await getStreak()).toBe(0);
    });
    test('RAC-02 | Actividad únicamente hoy | Racha = 1', async () => {
      await guardar(['2026-10-24']);
      expect(await getStreak()).toBe(1);
    });
    test('RAC-03 | Actividad hoy, ayer y anteayer | Racha = 3', async () => {
      await guardar(['2026-10-22', '2026-10-23', '2026-10-24']);
      expect(await getStreak()).toBe(3);
    });
    test('RAC-04 | Actividad ayer y anteayer, aún sin entrar hoy | Racha = 2, se conserva', async () => {
      await guardar(['2026-10-22', '2026-10-23']);
      expect(await getStreak()).toBe(2);
    });
    test('RAC-05 | Último día activo hace dos días | Racha = 0, se rompe', async () => {
      await guardar(['2026-10-21', '2026-10-22']);
      expect(await getStreak()).toBe(0);
    });
    test('RAC-06 | Actividad el 20, 23 y 24 de octubre (un hueco) | Racha = 2, cuenta desde el hueco', async () => {
      await guardar(['2026-10-20', '2026-10-23', '2026-10-24']);
      expect(await getStreak()).toBe(2);
    });
    test('RAC-07 | Fechas guardadas desordenadas | Racha = 3, se ordenan antes de contar', async () => {
      await guardar(['2026-10-24', '2026-10-22', '2026-10-23']);
      expect(await getStreak()).toBe(3);
    });
    test('RAC-08 | Actividad el 30 y 31 de octubre y el 1 de noviembre | Racha = 3, cruza el cambio de mes', async () => {
      jest.setSystemTime(new Date('2026-11-01T12:00:00Z'));
      await guardar(['2026-10-30', '2026-10-31', '2026-11-01']);
      expect(await getStreak()).toBe(3);
    });
    test('RAC-09 | Actividad el 31 de diciembre y el 1 de enero | Racha = 2, cruza el cambio de año', async () => {
      jest.setSystemTime(new Date('2027-01-01T12:00:00Z'));
      await guardar(['2026-12-31', '2027-01-01']);
      expect(await getStreak()).toBe(2);
    });
  });
 
  describe('Registro de actividad (trackDailyUsage)', () => {
    test('RAC-10 | Primer registro de uso del día | Se guarda la fecha de hoy', async () => {
      await trackDailyUsage();
      expect(await leer()).toEqual([HOY]);
    });
    test('RAC-11 | Tres registros de uso en el mismo día | Una sola fecha guardada, sin duplicados', async () => {
      await trackDailyUsage();
      await trackDailyUsage();
      await trackDailyUsage();
      expect(await leer()).toEqual([HOY]);
    });
    test('RAC-12 | 400 fechas almacenadas más el registro de hoy | Se conservan 365 fechas y la última es hoy', async () => {
      const antiguas = Array.from({ length: 400 }, (_, i) => {
        const d = new Date('2025-01-01T12:00:00Z');
        d.setUTCDate(d.getUTCDate() + i);
        return d.toISOString().slice(0, 10);
      });
      await guardar(antiguas);
      await trackDailyUsage();
      const guardadas = await leer();
      expect(guardadas).toHaveLength(365);
      expect(guardadas[guardadas.length - 1]).toBe(HOY);
    });
    test('RAC-13 | Uso a las 21:00 de Bogotá (02:00 UTC del día siguiente) | Se registra la fecha UTC, limitación conocida', async () => {
      jest.setSystemTime(new Date('2026-10-25T02:00:00Z'));
      await trackDailyUsage();
      expect(await leer()).toEqual(['2026-10-25']);
    });
  });
});
 
