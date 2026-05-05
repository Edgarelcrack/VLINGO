import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

const BASE = API_URL;
const KEY_USER_ID      = 'vlingo_api_user_id';
const KEY_SESSION_ID   = 'vlingo_session_id';
const KEY_STORED_EMAIL = 'vlingo_api_email';

export type ChatResponse = {
  sessionId: string;
  message: string;
  userLevel: string;
};

export type HistoryMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type ApiError = { error: string; detail?: string };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ error: 'Sin respuesta' }));
    throw new Error(err.error ?? 'Error de red');
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ error: 'Sin respuesta' }));
    throw new Error(err.error ?? 'Error de red');
  }
  return res.json() as Promise<T>;
}

async function userExistsInApi(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/progress/user/${userId}`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureVlingoUser(
  name: string,
  email?: string,
): Promise<string> {
  const storedId    = await AsyncStorage.getItem(KEY_USER_ID);
  const storedEmail = await AsyncStorage.getItem(KEY_STORED_EMAIL);

  // Si es el mismo usuario, se guarda el ID en caché y aún válido en el servidor
  if (storedId && email && storedEmail === email) {
    const stillExists = await userExistsInApi(storedId);
    if (stillExists) return storedId;
  }

  // En caso de no encontrarse en caché o no ser el mismo usuario, resolver desde la API (upsert por email → siempre retorna el usuario correcto)
  const data = await post<{ user: { id: string } }>('/api/progress/user', { name, email });
  const newId = data.user.id;

  if (storedId && storedId !== newId) {
    // Siempre que se cambie de cuenta se triggerea esto, limpiar sesión anterior para no mostrar mensajes de otro usuario
    await AsyncStorage.removeItem(KEY_SESSION_ID);
  }

  await AsyncStorage.multiSet([
    [KEY_USER_ID,      newId],
    [KEY_STORED_EMAIL, email ?? ''],
  ]);

  return newId;
}

export async function startNewSession(userId: string): Promise<string> {
  const data = await post<{ sessionId: string }>('/api/chat/new-session', { userId });
  await AsyncStorage.setItem(KEY_SESSION_ID, data.sessionId);
  return data.sessionId;
}

export async function getSavedSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_SESSION_ID);
}

export async function saveSessionId(id: string): Promise<void> {
  return AsyncStorage.setItem(KEY_SESSION_ID, id);
}

export async function clearSessionId(): Promise<void> {
  return AsyncStorage.removeItem(KEY_SESSION_ID);
}

export type ChatSession = {
  id: string;
  user_id: string;
  topic: string;
  created_at: string;
  last_active: string;
  message_count: number;
};

export async function fetchSessions(userId: string): Promise<ChatSession[]> {
  const data = await get<{ sessions: ChatSession[] }>(
    `/api/chat/sessions/${userId}`,
  );
  return data.sessions;
}

export async function deleteSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ error: 'Sin respuesta' }));
    throw new Error(err.error ?? 'No se pudo eliminar la sesión');
  }
}

export async function fetchChatHistory(
  sessionId: string,
  userId: string,
): Promise<HistoryMessage[]> {
  const data = await get<{ messages: HistoryMessage[] }>(
    `/api/chat/history/${sessionId}?userId=${encodeURIComponent(userId)}`,
  );
  return data.messages;
}

export async function sendChatMessage(
  userId: string,
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const body: Record<string, unknown> = { userId, message };
  if (sessionId) body.sessionId = sessionId;
  return post<ChatResponse>('/api/chat/message', body);
}
