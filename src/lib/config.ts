import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import { supabase } from './supabase';

const KEY_CACHED_URL = 'vlingo_api_url_cache';
const CONFIG_ROW_KEY = 'api_url';
const FETCH_TIMEOUT_MS = 5000;

const normalizar = (url: string): string => url.trim().replace(/\/+$/, '');

let baseActual: string = normalizar(API_URL ?? '');
let refrescoEnCurso: Promise<string> | null = null;

export function getApiBase(): string {
  return baseActual;
}

async function leerDeSupabase(): Promise<string | null> {
  const consulta = async (): Promise<string | null> => {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', CONFIG_ROW_KEY)
      .maybeSingle();
    if (error || !data?.value) return null;
    return normalizar(data.value as string);
  };

  const timeout = new Promise<null>(resolve =>
    setTimeout(() => resolve(null), FETCH_TIMEOUT_MS),
  );

  return Promise.race([consulta(), timeout]);
}

async function aplicar(url: string): Promise<string> {
  if (url && url !== baseActual) {
    baseActual = url;
    await AsyncStorage.setItem(KEY_CACHED_URL, url).catch(() => {});
  }
  return baseActual;
}

export async function bootstrapApiUrl(): Promise<string> {
  try {
    const cacheada = await AsyncStorage.getItem(KEY_CACHED_URL);
    if (cacheada) baseActual = normalizar(cacheada);
  } catch {}

  refreshApiUrl().catch(() => {});
  return baseActual;
}

export function refreshApiUrl(): Promise<string> {
  if (refrescoEnCurso) return refrescoEnCurso;

  refrescoEnCurso = (async () => {
    try {
      const remota = await leerDeSupabase();
      if (remota) return await aplicar(remota);
    } catch {}
    return baseActual;
  })().finally(() => {
    refrescoEnCurso = null;
  });

  return refrescoEnCurso;
}
