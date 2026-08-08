import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_KEY } from '@env';
import { getApiBase, refreshApiUrl } from './config';

const KEY_USER_ID      = 'vlingo_api_user_id';
const KEY_SESSION_ID   = 'vlingo_session_id';
const KEY_STORED_EMAIL = 'vlingo_api_email';
const KEY_STORED_LEVEL = 'vlingo_api_level';

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

async function pedir(path: string, init?: RequestInit): Promise<Response> {
  const conCabeceras: RequestInit = {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    },
  };

  try {
    return await fetch(`${getApiBase()}${path}`, conCabeceras);
  } catch (errRed) {
    const urlFresca = await refreshApiUrl();
    return fetch(`${urlFresca}${path}`, conCabeceras);
  }
}

async function leerError(res: Response): Promise<never> {
  const err: ApiError = await res.json().catch(() => ({ error: 'Sin respuesta' }));
  throw new Error(err.error ?? 'Error de red');
}

async function get<T>(path: string): Promise<T> {
  const res = await pedir(path);
  if (!res.ok) await leerError(res);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await pedir(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await leerError(res);
  return res.json() as Promise<T>;
}

async function userExistsInApi(userId: string): Promise<boolean> {
  try {
    const res = await pedir(`/api/progress/user/${userId}`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureVlingoUser(
  name: string,
  email?: string,
  level: string = 'A1',
): Promise<string> {
  const storedId    = await AsyncStorage.getItem(KEY_USER_ID);
  const storedEmail = await AsyncStorage.getItem(KEY_STORED_EMAIL);
  const storedLevel = await AsyncStorage.getItem(KEY_STORED_LEVEL);

  if (storedId && email && storedEmail === email && storedLevel === level) {
    const stillExists = await userExistsInApi(storedId);
    if (stillExists) return storedId;
  }

  // En caso de no encontrarse en caché o no ser el mismo usuario, resolver desde la API (upsert por email → siempre retorna el usuario correcto)
  const data = await post<{ user: { id: string } }>('/api/progress/user', { name, email, level });
  const newId = data.user.id;

  if (storedId && storedId !== newId) {
    // Siempre que se cambie de cuenta se triggerea esto, limpiar sesión anterior para no mostrar mensajes de otro usuario
    await AsyncStorage.removeItem(KEY_SESSION_ID);
  }

  await AsyncStorage.multiSet([
    [KEY_USER_ID,      newId],
    [KEY_STORED_EMAIL, email ?? ''],
    [KEY_STORED_LEVEL, level],
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
  const res = await pedir(`/api/chat/sessions/${sessionId}`, {
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
  attachedContext?: string,
): Promise<ChatResponse> {
  const body: Record<string, unknown> = { userId, message };
  if (sessionId) body.sessionId = sessionId;
  if (attachedContext) body.attachedContext = attachedContext;
  return post<ChatResponse>('/api/chat/message', body);
}

export type EvaluationResult = {
  score: number;
  grammar_errors: string[];
  corrections: string[];
  positive: string;
  tip: string;
};

export async function evaluateText(
  userId: string,
  text: string,
  exerciseContext?: string,
): Promise<EvaluationResult> {
  return post<EvaluationResult>('/api/chat/evaluate', {
    userId,
    text,
    exerciseContext: exerciseContext ?? 'Free writing in chat',
  });
}
