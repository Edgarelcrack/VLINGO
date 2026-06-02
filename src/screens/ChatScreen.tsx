import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  ensureVlingoUser,
  fetchChatHistory,
  sendChatMessage,
  evaluateText,
  EvaluationResult,
  getSavedSessionId,
  saveSessionId,
  clearSessionId,
  startNewSession,
} from '../lib/api';
import { getCursos, getCursoContentText } from '../services/cursosService';
import { Curso } from '../types';

type ChatScreenParams = {
  sessionId?: string;
  fresh?: boolean;    // Iniciar conversación nueva
};

type MsgType = 'bot' | 'user' | 'error' | 'eval';
type Msg = {
  id: number;
  type: MsgType;
  text: string;
  evaluation?: EvaluationResult;
  evalOriginal?: string;
};

// Diff aproximado: marca como erradas las palabras del original que no aparecen
// (normalizadas) en la corrección sugerida. Suficiente para resaltar visualmente.
function diffWords(original: string, corrected: string): { word: string; wrong: boolean }[] {
  const normalize = (w: string) => w.toLowerCase().replace(/[^\w']/g, '');
  const correctedSet = new Set(
    corrected.split(/\s+/).map(normalize).filter(w => w.length > 0)
  );
  const tokens = original.split(/(\s+)/);
  return tokens.map(token => {
    if (/^\s+$/.test(token) || token === '') return { word: token, wrong: false };
    const cleaned = normalize(token);
    if (!cleaned) return { word: token, wrong: false };
    return { word: token, wrong: !correctedSet.has(cleaned) };
  });
}

const WELCOME: Msg = {
  id: 0,
  type: 'bot',
  text: '¡Hola! Soy tu asistente de inglés. Cuéntame una situación, escribe en inglés o hazme cualquier pregunta.',
};

function historyToMsgs(history: HistoryMsg[]): Msg[] {
  return history.map(h => ({
    id: h.id,
    type: (h.role === 'user' ? 'user' : 'bot') as MsgType,
    text: h.content,
  }));
}

type HistoryMsg = { id: number; role: string; content: string };

export default function ChatScreen() {
  const { user, userProfile } = useAuth();
  const navigation = useNavigation();
  const route      = useRoute<RouteProp<{ ChatConversation: ChatScreenParams }, 'ChatConversation'>>();

  const paramSessionId = route.params?.sessionId;
  const paramFresh     = route.params?.fresh ?? false;

  const [msgs, setMsgs]           = useState<Msg[]>([WELCOME]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [initErrorMsg, setInitErrorMsg] = useState('');

  const [apiUserId, setApiUserId] = useState<string | null>(null);
  const sessionIdRef              = useRef<string | undefined>(undefined);

  const [attachMenuOpen, setAttachMenuOpen]   = useState(false);
  const [evaluationMode, setEvaluationMode]   = useState(false);

  const [cursePickerOpen, setCursePickerOpen] = useState(false);
  const [cursos, setCursos]                   = useState<Curso[]>([]);
  const [loadingCursos, setLoadingCursos]     = useState(false);
  const [cursosError, setCursosError]         = useState<string | null>(null);

  const [attachedCurso, setAttachedCurso]     = useState<Curso | null>(null);
  const attachedContextRef                    = useRef<string | null>(null);
  const [attachingCurso, setAttachingCurso]   = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const initialize = useCallback(async () => {
    if (!user) return;

    setStatus('loading');
    setInitErrorMsg('');
    setMsgs([WELCOME]);
    sessionIdRef.current = undefined;

    try {
      const name =
        (user.user_metadata?.full_name as string | undefined) ??
        user.email?.split('@')[0] ??
        'Usuario';

      // Obteniene/crear usuario válido en API
      const userId = await ensureVlingoUser(name, user.email ?? undefined);
      setApiUserId(userId);

      // Determina qué sesión cargar según los parámetros de navegación
      const targetSession = paramFresh
        ? null
        : paramSessionId ?? await getSavedSessionId();

      if (targetSession) {
        try {
          const history = await fetchChatHistory(targetSession, userId);
          if (history.length > 0) {
            sessionIdRef.current = targetSession;
            if (paramSessionId) await saveSessionId(paramSessionId);
            setMsgs(historyToMsgs(history));
          } else {
            await clearSessionId();
          }
        } catch {
          await clearSessionId();
          sessionIdRef.current = undefined;
          setMsgs([WELCOME]);
        }
      }

      setStatus('ready');
      scrollToEnd();
    } catch (err: any) {
      setInitErrorMsg(
        err.message ?? 'No se pudo conectar con el servidor de IA',
      );
      setStatus('error');
    }
  }, [user, paramSessionId, paramFresh, scrollToEnd]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const openCursePicker = async () => {
    if (!user) return;
    setCursePickerOpen(true);
    if (cursos.length > 0) return; // ya cargados
    setLoadingCursos(true);
    setCursosError(null);
    try {
      const tipo = userProfile?.tipo ?? 'estudiante';
      const { data, error } = await getCursos(tipo, user.id);
      if (error) {
        setCursosError(error);
      } else {
        setCursos(data);
      }
    } catch (err: any) {
      setCursosError(err?.message ?? 'No se pudieron cargar los cursos');
    } finally {
      setLoadingCursos(false);
    }
  };

  const pickCurso = async (curso: Curso) => {
    const prompt = `Explícame el contenido del curso "${curso.titulo}"${
      curso.nivel ? ` (nivel ${curso.nivel})` : ''
    }.`;
    setInput(prompt);
    setCursePickerOpen(false);
    setAttachedCurso(curso);
    setAttachingCurso(true);
    attachedContextRef.current = null;
    try {
      const text = await getCursoContentText(curso.id);
      attachedContextRef.current = text || null;
      console.log('[Chat][curso] adjuntado:', curso.titulo,
        '| chars:', text?.length ?? 0);
      console.log('[Chat][curso] preview:', (text ?? '').slice(0, 400));
      if (!text) {
        Alert.alert(
          'Curso vacío',
          'El curso seleccionado no tiene contenido todavía. Puedes enviar el mensaje, pero la IA no tendrá material que explicar.',
        );
      }
    } catch (err: any) {
      attachedContextRef.current = null;
      Alert.alert(
        'No se pudo adjuntar el curso',
        err?.message ?? 'Error al cargar el contenido del curso',
      );
      setAttachedCurso(null);
    } finally {
      setAttachingCurso(false);
    }
  };

  const clearAttached = () => {
    setAttachedCurso(null);
    attachedContextRef.current = null;
  };

  const onPickCursoFromMenu = () => {
    setAttachMenuOpen(false);
    setEvaluationMode(false);
    openCursePicker();
  };

  const onPickEvaluationFromMenu = () => {
    setAttachMenuOpen(false);
    clearAttached();
    setEvaluationMode(true);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending || status !== 'ready' || !apiUserId) return;

    // Modulo de evaluacion.
    if (evaluationMode) {
      setInput('');
      setSending(true);
      scrollToEnd();
      try {
        const result = await evaluateText(apiUserId, text);
        setMsgs(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'eval',
            text: '',
            evaluation: result,
            evalOriginal: text,
          },
        ]);
      } catch (err: any) {
        setMsgs(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'error',
            text: err.message ?? 'Error al evaluar.',
          },
        ]);
      } finally {
        setEvaluationMode(false);
        setSending(false);
        scrollToEnd();
      }
      return;
    }

    setInput('');
    const userMsg: Msg = { id: Date.now(), type: 'user', text };
    setMsgs(prev => [...prev, userMsg]);
    setSending(true);
    scrollToEnd();

    const attached = attachedContextRef.current ?? undefined;

    try {
      const data = await sendChatMessage(
        apiUserId,
        text,
        sessionIdRef.current,
        attached,
      );
      if (data.sessionId !== sessionIdRef.current) {
        sessionIdRef.current = data.sessionId;
        await saveSessionId(data.sessionId);
      }

      setMsgs(prev => [
        ...prev,
        { id: Date.now(), type: 'bot', text: data.message },
      ]);

      attachedContextRef.current = null;
      setAttachedCurso(null);
    } catch (err: any) {
      setMsgs(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'error',
          text: err.message ?? 'Error al contactar la IA.',
        },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  const confirmNewSession = () => {
    Alert.alert(
      'Nueva conversación',
      '¿Empezar una conversación nueva? El historial se conserva en el servidor.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Nueva sesión',
          style: 'destructive',
          onPress: async () => {
            if (apiUserId) {
              try {
                const newId = await startNewSession(apiUserId);
                sessionIdRef.current = newId;
              } catch {
                await clearSessionId();
                sessionIdRef.current = undefined;
              }
            } else {
              await clearSessionId();
              sessionIdRef.current = undefined;
            }
            setMsgs([WELCOME]);
            setStatus('ready');
          },
        },
      ],
    );
  };

  const inputEnabled = status === 'ready' && !sending;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Vlingo</Text>
        <TouchableOpacity
          onPress={confirmNewSession}
          style={s.newBtn}
          disabled={status !== 'ready'}
        >
          <Text style={[s.newBtnText, status !== 'ready' && { color: '#ccc' }]}>
            + Nuevo
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.msgs}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        >
          {/* ── Estado de carga ── */}
          {status === 'loading' && (
            <View style={s.centerCol}>
              <ActivityIndicator size="large" color="#2B4C72" />
              <Text style={s.statusText}>Preparando el asistente...</Text>
            </View>
          )}

          {/* ── Error de inicialización con reintento ── */}
          {status === 'error' && (
            <View style={s.errorCard}>
              <Text style={s.errorCardTitle}>No se pudo conectar</Text>
              <Text style={s.errorCardBody}>{initErrorMsg}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={initialize}>
                <Text style={s.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Mensajes ── */}
          {status === 'ready' && msgs.map(m => {
            if (m.type === 'eval' && m.evaluation && m.evalOriginal !== undefined) {
              return (
                <View key={m.id} style={s.rowLeft}>
                  <EvaluationBubble original={m.evalOriginal} result={m.evaluation} />
                </View>
              );
            }
            return (
              <View key={m.id} style={m.type === 'user' ? s.rowRight : s.rowLeft}>
                <View
                  style={[
                    s.bubble,
                    m.type === 'user'   ? s.bubbleUser  :
                    m.type === 'error'  ? s.bubbleError :
                    s.bubbleBot,
                  ]}
                >
                  <Text
                    style={[
                      s.bubbleText,
                      m.type === 'user'  && s.bubbleTextUser,
                      m.type === 'error' && s.bubbleTextError,
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* ── Indicador de escritura ── */}
          {sending && (
            <View style={s.rowLeft}>
              <View style={[s.bubble, s.bubbleBot, s.typingBubble]}>
                <ActivityIndicator size="small" color="#2B4C72" />
                <Text style={s.typingText}>
                  {evaluationMode ? 'Evaluando...' : 'Escribiendo...'}
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* ── Curso adjunto ── */}
        {attachedCurso && (
          <View style={s.attachedChipWrap}>
            <View style={s.attachedChip}>
              <Ionicons name="book" size={14} color="#2B4C72" />
              <Text style={s.attachedChipText} numberOfLines={1}>
                {attachingCurso
                  ? `Adjuntando "${attachedCurso.titulo}"...`
                  : `Curso adjunto: ${attachedCurso.titulo}`}
              </Text>
              {attachingCurso ? (
                <ActivityIndicator size="small" color="#2B4C72" />
              ) : (
                <TouchableOpacity onPress={clearAttached} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#2B4C72" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Modo evaluación activo ── */}
        {evaluationMode && (
          <View style={s.attachedChipWrap}>
            <View style={[s.attachedChip, s.evalChip]}>
              <Ionicons name="checkmark-circle" size={14} color="#2E7D52" />
              <Text style={[s.attachedChipText, { color: '#2E7D52' }]} numberOfLines={1}>
                Modo evaluación · escribe en inglés
              </Text>
              <TouchableOpacity onPress={() => setEvaluationMode(false)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#2E7D52" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Barra de entrada ── */}
        <View style={s.inputBar}>
          <TouchableOpacity
            style={s.cursoBtn}
            onPress={() => setAttachMenuOpen(true)}
            activeOpacity={0.7}
            disabled={!inputEnabled}
          >
            <Ionicons
              name="attach"
              size={22}
              color={inputEnabled ? '#2B4C72' : '#B0BEC5'}
            />
          </TouchableOpacity>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={inputEnabled ? 'Escribe un mensaje...' : 'Conectando...'}
            placeholderTextColor="#999"
            returnKeyType="send"
            onSubmitEditing={send}
            multiline
            editable={inputEnabled}
          />
          <TouchableOpacity
            style={[s.sendBtn, !inputEnabled && s.sendBtnDisabled]}
            onPress={send}
            activeOpacity={0.8}
            disabled={!inputEnabled}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Menú adjuntar (citar curso / pedir evaluación) ── */}
      <Modal
        visible={attachMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachMenuOpen(false)}
      >
        <TouchableOpacity
          style={s.menuBackdrop}
          activeOpacity={1}
          onPress={() => setAttachMenuOpen(false)}
        >
          <View style={s.menuSheet}>
            <TouchableOpacity
              style={s.menuItem}
              activeOpacity={0.7}
              onPress={onPickCursoFromMenu}
            >
              <View style={[s.menuIconWrap, { backgroundColor: 'rgba(43,76,114,0.10)' }]}>
                <Ionicons name="book" size={20} color="#2B4C72" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuItemTitle}>Citar curso</Text>
                <Text style={s.menuItemSub}>La IA explicará un curso específico</Text>
              </View>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity
              style={s.menuItem}
              activeOpacity={0.7}
              onPress={onPickEvaluationFromMenu}
            >
              <View style={[s.menuIconWrap, { backgroundColor: 'rgba(46,125,82,0.10)' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#2E7D52" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuItemTitle}>Pedir evaluación</Text>
                <Text style={s.menuItemSub}>Escribe en inglés y recibe correcciones</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Seleccionar curso a citar ── */}
      <Modal
        visible={cursePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCursePickerOpen(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Citar un curso</Text>
              <TouchableOpacity
                onPress={() => setCursePickerOpen(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSubtitle}>
              La IA recibirá una pregunta sobre el curso que elijas.
            </Text>

            {loadingCursos ? (
              <View style={s.modalCenter}>
                <ActivityIndicator size="large" color="#2B4C72" />
                <Text style={s.modalCenterText}>Cargando cursos...</Text>
              </View>
            ) : cursosError ? (
              <View style={s.modalCenter}>
                <Text style={s.modalErrorText}>{cursosError}</Text>
              </View>
            ) : cursos.length === 0 ? (
              <View style={s.modalCenter}>
                <Text style={s.modalCenterText}>
                  No hay cursos disponibles todavía.
                </Text>
              </View>
            ) : (
              <FlatList
                data={cursos}
                keyExtractor={c => c.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.cursoRow}
                    activeOpacity={0.7}
                    onPress={() => pickCurso(item)}
                  >
                    <View style={s.cursoIcon}>
                      <Ionicons name="book" size={20} color="#2B4C72" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cursoTitulo} numberOfLines={1}>
                        {item.titulo}
                      </Text>
                      {!!item.nivel && (
                        <Text style={s.cursoNivel}>Nivel {item.nivel}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Burbuja de evaluación ───────────────────────────────────────── */
function EvaluationBubble({
  original,
  result,
}: {
  original: string;
  result: EvaluationResult;
}) {
  const corrected = result.corrections?.[0] ?? '';
  const tokens = corrected ? diffWords(original, corrected) : [{ word: original, wrong: false }];

  const scoreColor =
    result.score >= 80 ? '#2E7D52' :
    result.score >= 60 ? '#B8860B' :
    '#E05A4E';

  return (
    <View style={s.evalBubble}>
      <View style={s.evalHeader}>
        <View style={s.evalIconWrap}>
          <Ionicons name="checkmark-circle" size={14} color="#2B4C72" />
        </View>
        <Text style={s.evalTitle}>Evaluación</Text>
        <View style={[s.scorePill, { backgroundColor: scoreColor + '20' }]}>
          <Text style={[s.scoreTxt, { color: scoreColor }]}>{result.score}/100</Text>
        </View>
      </View>

      {/* Frase original con palabras erradas en rojo */}
      <Text style={s.evalSectionLabel}>Tu frase:</Text>
      <Text style={s.evalOriginalText}>
        {tokens.map((t, i) => (
          <Text key={i} style={t.wrong ? s.wordWrong : undefined}>
            {t.word}
          </Text>
        ))}
      </Text>

      <View style={s.evalDivider} />

      {/* Corrección sugerida */}
      {corrected ? (
        <>
          <Text style={s.evalSectionLabel}>Corrección:</Text>
          <Text style={s.evalCorrectedText}>{corrected}</Text>
          <View style={s.evalDivider} />
        </>
      ) : null}

      {/* Feedback positivo + tip */}
      {result.positive ? (
        <View style={s.evalFeedbackRow}>
          <Ionicons name="thumbs-up" size={13} color="#2E7D52" />
          <Text style={s.evalPositiveTxt}>{result.positive}</Text>
        </View>
      ) : null}
      {result.tip ? (
        <View style={s.evalFeedbackRow}>
          <Ionicons name="bulb" size={13} color="#B8860B" />
          <Text style={s.evalTipTxt}>{result.tip}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ── Estilos ──────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F4F6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F4F6',
  },
  backBtn:     { width: 48, alignItems: 'flex-start' },
  backArrow:   { fontSize: 22, color: '#111' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  newBtn:      { width: 64, alignItems: 'flex-end' },
  newBtnText:  { fontSize: 13, color: '#2B4C72', fontWeight: '600' },

  msgs: { padding: 16, paddingTop: 8 },

  centerCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 40,
  },
  statusText: { fontSize: 13, color: '#888', marginTop: 8 },

  errorCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCCCC',
    gap: 8,
  },
  errorCardTitle: { fontSize: 15, fontWeight: '700', color: '#C00' },
  errorCardBody:  { fontSize: 13, color: '#C00', textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#2B4C72',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  rowLeft:  { alignItems: 'flex-start', marginBottom: 12 },
  rowRight: { alignItems: 'flex-end',   marginBottom: 12 },

  bubble: {
    maxWidth: '76%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  bubbleBot: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleUser:  { backgroundColor: '#2B4C72', borderTopRightRadius: 4 },
  bubbleError: {
    backgroundColor: '#FFF0F0',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  bubbleText:      { fontSize: 13, color: '#222', lineHeight: 20 },
  bubbleTextUser:  { color: '#fff' },
  bubbleTextError: { color: '#C00' },

  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  typingText: { fontSize: 12, color: '#888' },

  attachedChipWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    backgroundColor: '#fff',
  },
  attachedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2F6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  attachedChipText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#2B4C72',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    marginBottom: Platform.OS === 'ios' ? 0 : 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  inputIcon: { paddingBottom: 2 },
  cursoBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    paddingVertical: 6,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2B4C72',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#B0BEC5' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  modalCloseBtn: { padding: 4 },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginBottom: 14,
  },
  modalCenter: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  modalCenterText: { fontSize: 13, color: '#888' },
  modalErrorText:  { fontSize: 13, color: '#C00', textAlign: 'center' },

  cursoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cursoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cursoTitulo: { fontSize: 14, fontWeight: '600', color: '#111' },
  cursoNivel:  { fontSize: 12, color: '#666', marginTop: 2 },

  evalChip: {
    backgroundColor: 'rgba(46,125,82,0.10)',
  },

  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  menuItemSub:   { fontSize: 12, color: '#888', marginTop: 2 },
  menuDivider:   { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 14 },

  // ── Burbuja de evaluación ──────────────────────────────────────
  // Ancho fijo (no maxWidth) para que las tres secciones tengan espacio
  // suficiente aunque la frase del usuario sea muy corta.
  evalBubble: {
    width: '92%',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(43,76,114,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  evalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  evalIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#2B4C72',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scorePill: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  scoreTxt: { fontSize: 12, fontWeight: '800' },

  evalSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  evalOriginalText: {
    fontSize: 14,
    color: '#222',
    lineHeight: 20,
  },
  wordWrong: {
    color: '#E05A4E',
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#E05A4E',
  },
  evalCorrectedText: {
    fontSize: 14,
    color: '#2E7D52',
    lineHeight: 20,
    fontWeight: '600',
  },
  evalDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  evalFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  evalPositiveTxt: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D52',
    lineHeight: 17,
  },
  evalTipTxt: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
