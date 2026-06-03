import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ACTIVE_DATES = 'vlingo_active_dates';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function trackDailyUsage(): Promise<void> {
  const raw   = await AsyncStorage.getItem(KEY_ACTIVE_DATES);
  const dates: string[] = raw ? JSON.parse(raw) : [];
  const today = todayStr();
  if (!dates.includes(today)) {
    dates.push(today);
    // Guardar solo los últimos 365 días para no crecer indefinidamente
    const recientes = dates.sort().slice(-365);
    await AsyncStorage.setItem(KEY_ACTIVE_DATES, JSON.stringify(recientes));
  }
}

export async function getStreak(): Promise<number> {
  const raw   = await AsyncStorage.getItem(KEY_ACTIVE_DATES);
  const dates: string[] = raw ? JSON.parse(raw) : [];
  if (dates.length === 0) return 0;

  const sorted  = [...dates].sort().reverse();
  const today   = todayStr();
  const ayer    = new Date(); ayer.setDate(ayer.getDate() - 1);
  const ayerStr = ayer.toISOString().slice(0, 10);

  // Si el último día activo no fue hoy ni ayer, la racha se rompió
  if (sorted[0] !== today && sorted[0] !== ayerStr) return 0;

  let streak = 0;
  let expected = sorted[0] === today ? today : ayerStr;

  for (const d of sorted) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected);
      prev.setDate(prev.getDate() - 1);
      expected = prev.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
}
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const AUDIO_BUCKET = 'audio-ejercicios';
const UPLOAD_TIMEOUT_MS = 30_000;

export async function pickAndUploadAudio(): Promise<{ url: string | null; error: string | null }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return { url: null, error: null };
  }

  const asset = result.assets[0];
  const uri   = asset.uri;
  const name  = asset.name ?? `audio_${Date.now()}.mp3`;
  const path  = `${Date.now()}_${name.replace(/\s+/g, '_')}`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${AUDIO_BUCKET}/${path}`;

  let uploadResult: FileSystem.FileSystemUploadResult;

  try {
    const uploadPromise = FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado (30s). Verifica tu conexión y el bucket en Supabase.')), UPLOAD_TIMEOUT_MS)
    );

    uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err: any) {
    return { url: null, error: err.message ?? 'Error al subir el archivo' };
  }

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    let mensaje = `Error ${uploadResult.status}`;
    try {
      const body = JSON.parse(uploadResult.body);
      mensaje = body.message ?? body.error ?? mensaje;
    } catch {}
    return { url: null, error: mensaje };
  }

  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
