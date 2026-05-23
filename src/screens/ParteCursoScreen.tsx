import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated, Easing,
  StyleSheet, ActivityIndicator, ToastAndroid, Platform, Alert,
  LayoutAnimation, TextInput, Keyboard,
} from 'react-native';
import { Audio } from 'expo-av';
let SpeechModule: any = null;
try { SpeechModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule; } catch {}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import {
  getSecciones, getProgresoPorCurso, marcarCompletadaYAvanzar, upsertProgreso,
} from '../services/cursosService';
import { getPreguntasPorSeccion } from '../services/preguntasService';
import { incrementarPuntos } from '../services/puntuacionService';
import { Seccion, ProgresoUsuario, EstadoSeccion, ContenidoBloque, Pregunta } from '../types';

type SeccionConEstado = Seccion & { estado: EstadoSeccion };

const expandPreset = () =>
  LayoutAnimation.configureNext({
    duration: 240,
    create:  { type: 'easeInEaseOut', property: 'opacity' },
    update:  { type: 'easeInEaseOut' },
    delete:  { type: 'easeInEaseOut', property: 'opacity' },
  });

function FadeInView({
  children, delay = 0, style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,   { toValue: 1, duration: 360, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 360, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, translate, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: translate }] }]}>
      {children}
    </Animated.View>
  );
}

function AnimatedBar({
  pct, color, trackColor, height = 8,
}: {
  pct: number;
  color: string;
  trackColor: string;
  height?: number;
}) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 800,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, width]);

  return (
    <View style={{ height, backgroundColor: trackColor, borderRadius: 100, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height, borderRadius: 100, backgroundColor: color,
          width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

export default function ParteCursoScreen({ navigation, route }: any) {
  const { seccionId, cursoId, titulo } = route?.params ?? {};
  const { user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const notificarXP = (monto: number) => {
    if (monto <= 0) return;
    const msg = `+${monto} XP ganados`;
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('¡Bien hecho!', msg);
    }
  };

  const [hijos, setHijos]               = useState<SeccionConEstado[]>([]);
  const [seccion, setSeccion]           = useState<Seccion | null>(null);
  const [seccionEstado, setSeccionEstado] = useState<EstadoSeccion>('locked');
  const [preguntasMap, setPreguntasMap] = useState<Record<string, Pregunta[]>>({});
  const [loading, setLoading]           = useState(true);
  const [open, setOpen]                 = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cursoId || !user) return;

    const { data: todasSecciones } = await getSecciones(cursoId);
    const actual = todasSecciones.find(s => s.id === seccionId) ?? null;
    setSeccion(actual);

    const { data: progreso } = await getProgresoPorCurso(user.id, cursoId);
    const progresoMap: Record<string, EstadoSeccion> = {};
    (progreso as ProgresoUsuario[]).forEach(p => { progresoMap[p.seccion_id] = p.estado; });

    const estadoActual = progresoMap[seccionId] ?? 'locked';
    setSeccionEstado(estadoActual);

    const children = todasSecciones
      .filter(s => s.parent_id === seccionId)
      .sort((a, b) => a.orden - b.orden);

    if (children.length > 0) {
      // Si la sección padre está activa o completa pero ninguna hija tiene
      // progreso registrado, activar la primera hija para desbloquear el flujo.
      const padreDesbloqueado = estadoActual === 'active' || estadoActual === 'done';
      const algunaHijaConProgreso = children.some(c => progresoMap[c.id]);
      if (padreDesbloqueado && !algunaHijaConProgreso) {
        await upsertProgreso(user.id, children[0].id, 'active');
        progresoMap[children[0].id] = 'active';
      }

      const conEstado: SeccionConEstado[] = children.map(s => ({
        ...s,
        estado: progresoMap[s.id] ?? 'locked',
      }));
      setHijos(conEstado);
      const firstActive = conEstado.find(s => s.estado === 'active');
      const firstDone   = conEstado.find(s => s.estado === 'done');
      if (firstActive) setOpen(firstActive.id);
      else if (firstDone) setOpen(firstDone.id);

      // Cargar preguntas de cada hija en paralelo
      const entradas = await Promise.all(
        children.map(async c => {
          const { data } = await getPreguntasPorSeccion(c.id);
          return [c.id, data] as const;
        })
      );
      const mapa: Record<string, Pregunta[]> = {};
      entradas.forEach(([id, list]) => { mapa[id] = list; });
      setPreguntasMap(mapa);
    } else {
      setHijos([]);
      // Caso B (lección hoja): cargar preguntas de la sección actual
      const { data } = await getPreguntasPorSeccion(seccionId);
      setPreguntasMap({ [seccionId]: data });
    }
  }, [seccionId, cursoId, user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const marcarCompletado = async (secId: string) => {
    if (!user) return;
    const { xpGanado } = await marcarCompletadaYAvanzar(user.id, secId);
    notificarXP(xpGanado);
    await refreshProfile();
    load();
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2B4C72" />
      </View>
    );
  }

  // ── Case A: section has children — show expandable list ──────────────────────
  if (hijos.length > 0) {
    const hijosDone = hijos.filter(h => h.estado === 'done').length;
    const hijosPct  = hijos.length > 0 ? Math.round((hijosDone / hijos.length) * 100) : 0;

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{titulo ?? seccion?.titulo ?? 'Parte'}</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress overview */}
          <FadeInView>
            <View style={s.progCard}>
              <View style={s.progTop}>
                <View style={s.progIconWrap}>
                  <Ionicons name="trophy" size={18} color="#B8860B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.progLabel}>Tu progreso en esta parte</Text>
                  <Text style={s.progValue}>
                    {hijosDone} <Text style={s.progValueDim}>de {hijos.length} {hijos.length === 1 ? 'lección' : 'lecciones'}</Text>
                  </Text>
                </View>
                <Text style={s.progPct}>{hijosPct}%</Text>
              </View>
              <AnimatedBar pct={hijosPct} color="#FFD66A" trackColor="rgba(255,255,255,0.15)" />
            </View>
          </FadeInView>

          <FadeInView delay={120}>
            <Text style={s.subLabel}>Lecciones</Text>
          </FadeInView>

          {hijos.map((h, i) => {
            const isOpen   = open === h.id;
            const isActive = h.estado === 'active';
            const isDone   = h.estado === 'done';
            const isLocked = h.estado === 'locked';
            const bloques  = h.contenido?.bloques ?? [];

            return (
              <FadeInView key={h.id} delay={180 + i * 80}>
              <View style={[s.lecCard, isActive && s.lecCardActive, isLocked && s.lecCardLocked]}>
                <TouchableOpacity
                  style={s.lecHead}
                  activeOpacity={isLocked ? 1 : 0.75}
                  onPress={() => {
                    if (isLocked) return;
                    expandPreset();
                    setOpen(isOpen ? null : h.id);
                  }}
                >
                  <View style={[
                    s.lecNum,
                    isDone   && s.lecNumDone,
                    isActive && s.lecNumActive,
                    isLocked && s.lecNumLocked,
                  ]}>
                    {isDone ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : isLocked ? (
                      <Ionicons name="lock-closed" size={14} color="#BBB" />
                    ) : (
                      <Text style={[s.lecNumTxt, isActive && { color: '#fff' }]}>{i + 1}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[s.lecLabel, isActive && s.lecLabelActive]}>
                      Lección {i + 1}
                    </Text>
                    <Text style={[s.lecName, isActive && s.lecNameActive, isLocked && s.lecNameLocked]} numberOfLines={2}>
                      {h.titulo}
                    </Text>
                    <View style={s.lecStatus}>
                      {isDone && (
                        <>
                          <Ionicons name="checkmark-circle" size={12} color="#3FA776" />
                          <Text style={[s.lecStatusTxt, { color: '#2E7D52' }]}>Completada</Text>
                        </>
                      )}
                      {isActive && (
                        <>
                          <View style={s.lecDot} />
                          <Text style={[s.lecStatusTxt, { color: '#FFE39C' }]}>En progreso</Text>
                        </>
                      )}
                      {isLocked && (
                        <>
                          <Ionicons name="lock-closed" size={11} color="#BBB" />
                          <Text style={[s.lecStatusTxt, { color: '#BBB' }]}>Bloqueada</Text>
                        </>
                      )}
                    </View>
                  </View>

                  {isActive ? (
                    <View style={s.playBtn}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                  ) : !isLocked ? (
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#888" />
                  ) : null}
                </TouchableOpacity>

                {isOpen && (
                  <View style={s.expanded}>
                    <View style={s.divider} />
                    {bloques.length > 0 ? (
                      <BloquesRenderer bloques={bloques} onDark={isActive} />
                    ) : (
                      <View style={[s.noContent, isActive && s.noContentDark]}>
                        <Ionicons name="document-outline" size={20} color={isActive ? '#fff' : '#BBB'} />
                        <Text style={[s.noContentTxt, isActive && { color: '#fff' }]}>
                          Esta lección no tiene contenido todavía
                        </Text>
                      </View>
                    )}
                    <QuizSection preguntas={preguntasMap[h.id] ?? []} />
                    {isActive && (
                      <TouchableOpacity
                        style={s.completarBtn}
                        onPress={() => marcarCompletado(h.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={s.completarTxt}>Marcar como completada</Text>
                      </TouchableOpacity>
                    )}
                    {isDone && (
                      <View style={s.completadoBadge}>
                        <Ionicons name="trophy" size={16} color="#B8860B" />
                        <Text style={s.completadoTxt}>¡Lección completada!</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              </FadeInView>
            );
          })}

          <ChatShortcut navigation={navigation} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Case B: leaf leccion — render its content directly ───────────────────────
  const bloques = seccion?.contenido?.bloques ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Lección</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Lesson hero */}
        <FadeInView>
          <View style={s.leafHero}>
            <View style={s.leafIconWrap}>
              <Ionicons name="bulb" size={20} color="#fff" />
            </View>
            <Text style={s.leafLabel}>Lección</Text>
            <Text style={s.leafTitle} numberOfLines={3}>{titulo ?? seccion?.titulo ?? 'Lección'}</Text>
            {seccionEstado === 'done' && (
              <View style={s.leafDoneBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={s.leafDoneTxt}>Completada</Text>
              </View>
            )}
          </View>
        </FadeInView>

        <FadeInView delay={120}>
          {bloques.length === 0 ? (
            <View style={s.noContent}>
              <Ionicons name="document-outline" size={20} color="#BBB" />
              <Text style={s.noContentTxt}>Esta lección no tiene contenido todavía</Text>
            </View>
          ) : (
            <BloquesRenderer bloques={bloques} />
          )}
        </FadeInView>
        <FadeInView delay={200}>
          <QuizSection preguntas={preguntasMap[seccionId] ?? []} />
        </FadeInView>
        {seccion && user && seccionEstado !== 'done' && (
          <TouchableOpacity
            style={[s.completarBtn, { marginTop: 24 }]}
            onPress={() => marcarCompletado(seccion.id)}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={s.completarTxt}>Marcar como completada</Text>
          </TouchableOpacity>
        )}
        {seccion && user && seccionEstado === 'done' && (
          <View style={[s.completadoBadge, { marginTop: 24 }]}>
            <Ionicons name="trophy" size={18} color="#B8860B" />
            <Text style={s.completadoTxt}>¡Lección completada!</Text>
          </View>
        )}
        <ChatShortcut navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BloquesRenderer({
  bloques,
  onDark = false,
}: {
  bloques: ContenidoBloque[];
  onDark?: boolean;
}) {
  return (
    <View>
      {bloques.map((b, i) => {
        if (b.tipo === 'texto') {
          return (
            <View key={i} style={styles.textBlock}>
              <Text style={[styles.bodyText, onDark && { color: '#fff' }]}>
                {b.valor}
              </Text>
            </View>
          );
        }
        if (b.tipo === 'lista' && b.items) {
          return (
            <View key={i} style={styles.listBlock}>
              {b.items.map((item, j) => (
                <View key={j} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (b.tipo === 'ejercicio') {
          return (
            <View key={i} style={styles.ejercicioCard}>
              <View style={styles.ejercicioHead}>
                <Ionicons name="flask" size={14} color="#2B4C72" />
                <Text style={styles.ejercicioLabel}>Ejercicio</Text>
              </View>
              <Text style={styles.ejercicioPregunta}>{b.pregunta}</Text>
              {b.respuesta && (
                <View style={styles.ejercicioRespBox}>
                  <Ionicons name="bulb-outline" size={12} color="#888" />
                  <Text style={styles.ejercicioRespuesta}>{b.respuesta}</Text>
                </View>
              )}
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

const LETRAS = ['A', 'B', 'C', 'D'];

const quizStorageKey = (userId: string) => `quiz_resp:${userId}`;
const pronStorageKey = (userId: string) => `quiz_pron:${userId}`;

type PronResultado = { transcripcion: string; resultado: 'correct' | 'partial' | 'wrong' };

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[.,!?;:'"¡¿\-]/g, '').replace(/\s+/g, ' ').trim();
}

function compareTexts(transcribed: string, expected: string): 'correct' | 'partial' | 'wrong' {
  const t = normalizeText(transcribed);
  const e = normalizeText(expected);
  if (t === e) return 'correct';
  const tWords = t.split(' ');
  const eWords = e.split(' ');
  const common = tWords.filter(w => eWords.includes(w)).length;
  const ratio = common / Math.max(tWords.length, eWords.length, 1);
  return ratio >= 0.65 ? 'partial' : 'wrong';
}

function PronunciacionCard({
  pregunta,
  saved,
  onResult,
}: {
  pregunta: Pregunta;
  saved: PronResultado | undefined;
  onResult: (data: PronResultado) => void;
}) {
  const [isListening, setIsListening]   = useState(false);
  const [transcripcion, setTranscripcion] = useState(saved?.transcripcion ?? '');
  const [resultado, setResultado]       = useState<PronResultado['resultado'] | null>(saved?.resultado ?? null);

  const transcRef   = useRef(saved?.transcripcion ?? '');
  const listeningRef = useRef(false);
  const doneRef     = useRef(saved?.resultado != null);
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  const esperado = pregunta.opciones[0] ?? '';
  const esperadoRef = useRef(esperado);

  // Listeners via addListener (works with or without native module)
  useEffect(() => {
    if (!SpeechModule) return;
    const sub = SpeechModule.addListener('result', (event: any) => {
      if (!listeningRef.current) return;
      const text: string = event.results?.[0]?.transcript ?? '';
      if (text) { transcRef.current = text; setTranscripcion(text); }
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (!SpeechModule) return;
    const sub = SpeechModule.addListener('end', () => {
      if (!listeningRef.current) return;
      listeningRef.current = false;
      setIsListening(false);
      const texto = transcRef.current;
      if (texto && !doneRef.current) {
        doneRef.current = true;
        const res = compareTexts(texto, esperadoRef.current);
        expandPreset();
        setResultado(res);
        onResultRef.current({ transcripcion: texto, resultado: res });
      }
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (!SpeechModule) return;
    const sub = SpeechModule.addListener('error', () => {
      if (!listeningRef.current) return;
      listeningRef.current = false;
      setIsListening(false);
    });
    return () => sub?.remove();
  }, []);

  const handleMic = async () => {
    if (!SpeechModule || resultado !== null) return;
    if (isListening) {
      SpeechModule.stop();
      return;
    }
    const { status } = await SpeechModule.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Micrófono necesario',
        'Esta actividad requiere acceso al micrófono. Actívalo en Ajustes del dispositivo.',
      );
      return;
    }
    transcRef.current = '';
    setTranscripcion('');
    listeningRef.current = true;
    setIsListening(true);
    SpeechModule.start({ lang: 'en-US', interimResults: true, continuous: false });
  };

  const isAnswered = resultado !== null;
  const resultColor =
    resultado === 'correct' ? '#2E7D52' :
    resultado === 'partial'  ? '#B8860B' :
    '#E05A4E';
  const resultIcon =
    resultado === 'correct' ? 'checkmark-circle' :
    resultado === 'partial'  ? 'alert-circle' :
    'close-circle' as any;
  const resultMsg =
    resultado === 'correct' ? '¡Perfecto!' :
    resultado === 'partial'  ? 'Casi, sigue practicando' :
    'Inténtalo de nuevo';

  return (
    <View style={pron.card}>
      <View style={pron.head}>
        <View style={pron.iconWrap}>
          <Ionicons name="mic" size={15} color="#2B4C72" />
        </View>
        <Text style={pron.tipo}>Pronunciación</Text>
      </View>

      <View style={pron.phraseBox}>
        <Text style={pron.phraseLabel}>Di en voz alta:</Text>
        <Text style={pron.phrase}>{pregunta.enunciado}</Text>
      </View>

      {!SpeechModule && (
        <View style={pron.unavailableBox}>
          <Ionicons name="information-circle-outline" size={15} color="#888" />
          <Text style={pron.unavailableTxt}>El reconocimiento de voz requiere un build nativo. No disponible en Expo Go.</Text>
        </View>
      )}

      {SpeechModule && !isAnswered && (
        <TouchableOpacity
          style={[pron.micBtn, isListening && pron.micBtnActive]}
          onPress={handleMic}
          activeOpacity={0.8}
        >
          <Ionicons name={isListening ? 'stop-circle' : 'mic'} size={26} color="#fff" />
          <Text style={pron.micTxt}>{isListening ? 'Detener' : 'Grabar pronunciación'}</Text>
        </TouchableOpacity>
      )}

      {isListening && transcripcion ? (
        <View style={pron.liveBox}>
          <Ionicons name="radio-outline" size={12} color="#E05A4E" />
          <Text style={pron.liveTxt} numberOfLines={2}>{transcripcion}</Text>
        </View>
      ) : null}

      {isAnswered && (
        <View style={[pron.resultBox, { borderColor: resultColor + '40', backgroundColor: resultColor + '14' }]}>
          <Ionicons name={resultIcon} size={20} color={resultColor} />
          <View style={{ flex: 1 }}>
            <Text style={[pron.resultTxt, { color: resultColor }]}>{resultMsg}</Text>
            {transcripcion ? (
              <Text style={pron.transcTxt} numberOfLines={2}>Dijiste: "{transcripcion}"</Text>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

type WriteResultado = { respuesta: string; resultado: 'correct' | 'partial' | 'wrong' };
const writeStorageKey = (userId: string) => `quiz_write:${userId}`;

function CompletarFraseCard({
  pregunta,
  saved,
  onResult,
}: {
  pregunta: Pregunta;
  saved: WriteResultado | undefined;
  onResult: (data: WriteResultado) => void;
}) {
  const esperado = pregunta.opciones[pregunta.respuesta_correcta] ?? '';
  const [respuesta, setRespuesta] = useState(saved?.respuesta ?? '');
  const [resultado, setResultado] = useState<WriteResultado['resultado'] | null>(saved?.resultado ?? null);

  const comprobar = () => {
    if (!respuesta.trim() || resultado !== null) return;
    Keyboard.dismiss();
    const res = compareTexts(respuesta.trim(), esperado);
    expandPreset();
    setResultado(res);
    onResult({ respuesta: respuesta.trim(), resultado: res });
  };

  const isAnswered = resultado !== null;
  const resultColor =
    resultado === 'correct' ? '#2E7D52' :
    resultado === 'partial'  ? '#B8860B' : '#E05A4E';
  const resultIcon =
    resultado === 'correct' ? 'checkmark-circle' :
    resultado === 'partial'  ? 'alert-circle' : 'close-circle' as any;
  const resultMsg =
    resultado === 'correct' ? '¡Correcto!' :
    resultado === 'partial'  ? 'Muy cerca' : 'No coincide';

  return (
    <View style={write.card}>
      <View style={write.head}>
        <View style={write.iconWrap}>
          <Ionicons name="create" size={14} color="#2B4C72" />
        </View>
        <Text style={write.tipo}>Completar frase</Text>
      </View>

      <View style={write.phraseBox}>
        <Text style={write.phrase}>{pregunta.enunciado}</Text>
      </View>

      <Text style={write.inputLabel}>Completa el espacio en blanco:</Text>
      <TextInput
        style={[write.input, isAnswered && { opacity: 0.6 }]}
        value={respuesta}
        onChangeText={setRespuesta}
        placeholder="Escribe tu respuesta…"
        placeholderTextColor="#BBB"
        editable={!isAnswered}
        onSubmitEditing={comprobar}
        returnKeyType="done"
      />

      {!isAnswered && (
        <TouchableOpacity
          style={[write.checkBtn, !respuesta.trim() && { opacity: 0.4 }]}
          onPress={comprobar}
          disabled={!respuesta.trim()}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={write.checkBtnTxt}>Comprobar</Text>
        </TouchableOpacity>
      )}

      {isAnswered && (
        <View style={[write.resultBox, { borderColor: resultColor + '40', backgroundColor: resultColor + '14' }]}>
          <Ionicons name={resultIcon} size={18} color={resultColor} />
          <View style={{ flex: 1 }}>
            <Text style={[write.resultTxt, { color: resultColor }]}>{resultMsg}</Text>
            {resultado !== 'correct' && (
              <Text style={write.esperadoTxt}>Respuesta: "{esperado}"</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

type ListenResultado = { respuesta: string; resultado: 'correct' | 'partial' | 'wrong' };
const listenStorageKey = (userId: string) => `quiz_listen:${userId}`;

function ListeningCard({
  pregunta,
  saved,
  onResult,
}: {
  pregunta: Pregunta;
  saved: ListenResultado | undefined;
  onResult: (data: ListenResultado) => void;
}) {
  const audioUrl   = pregunta.opciones[1] ?? '';
  const esperado   = pregunta.opciones[0] ?? '';

  const [sound, setSound]           = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [respuesta, setRespuesta]   = useState(saved?.respuesta ?? '');
  const [resultado, setResultado]   = useState<ListenResultado['resultado'] | null>(saved?.resultado ?? null);

  useEffect(() => {
    return () => { sound?.unloadAsync(); };
  }, [sound]);

  const toggleAudio = async () => {
    if (!audioUrl) { Alert.alert('Sin audio', 'Esta pregunta no tiene audio configurado.'); return; }
    if (isLoading) return;
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
      return;
    }
    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
      });
    } catch {
      Alert.alert('Error', 'No se pudo cargar el audio. Verifica la URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const comprobar = () => {
    if (!respuesta.trim() || resultado !== null) return;
    Keyboard.dismiss();
    const res = compareTexts(respuesta.trim(), esperado);
    expandPreset();
    setResultado(res);
    onResult({ respuesta: respuesta.trim(), resultado: res });
  };

  const isAnswered = resultado !== null;
  const resultColor =
    resultado === 'correct' ? '#2E7D52' :
    resultado === 'partial'  ? '#B8860B' : '#E05A4E';
  const resultIcon =
    resultado === 'correct' ? 'checkmark-circle' :
    resultado === 'partial'  ? 'alert-circle' : 'close-circle' as any;
  const resultMsg =
    resultado === 'correct' ? '¡Correcto!' :
    resultado === 'partial'  ? 'Casi, muy bien' : 'No es exacto';

  return (
    <View style={listen.card}>
      <View style={listen.head}>
        <View style={listen.iconWrap}>
          <Ionicons name="headset" size={15} color="#B8860B" />
        </View>
        <Text style={listen.tipo}>Listening</Text>
      </View>

      <TouchableOpacity
        style={[listen.audioBtn, isPlaying && listen.audioBtnActive]}
        onPress={toggleAudio}
        activeOpacity={0.8}
      >
        {isLoading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />}
        <Text style={listen.audioBtnTxt}>{isPlaying ? 'Pausar audio' : 'Reproducir audio'}</Text>
      </TouchableOpacity>

      <Text style={listen.pregunta}>{pregunta.enunciado}</Text>

      <Text style={listen.inputLabel}>Tu respuesta:</Text>
      <TextInput
        style={[listen.input, isAnswered && { opacity: 0.6 }]}
        value={respuesta}
        onChangeText={setRespuesta}
        placeholder="Escribe tu respuesta aquí…"
        placeholderTextColor="#BBB"
        multiline
        textAlignVertical="top"
        editable={!isAnswered}
      />

      {!isAnswered && (
        <TouchableOpacity
          style={[listen.checkBtn, !respuesta.trim() && { opacity: 0.4 }]}
          onPress={comprobar}
          disabled={!respuesta.trim()}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={listen.checkBtnTxt}>Comprobar respuesta</Text>
        </TouchableOpacity>
      )}

      {isAnswered && (
        <View style={[listen.resultBox, { borderColor: resultColor + '40', backgroundColor: resultColor + '14' }]}>
          <Ionicons name={resultIcon} size={20} color={resultColor} />
          <View style={{ flex: 1 }}>
            <Text style={[listen.resultTxt, { color: resultColor }]}>{resultMsg}</Text>
            <Text style={listen.esperadoTxt} numberOfLines={3}>Respuesta esperada: "{esperado}"</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function QuizSection({ preguntas }: { preguntas: Pregunta[] }) {
  const { user } = useAuth();
  const [respuestas, setRespuestas]             = useState<Record<string, number>>({});
  const [pronResultados, setPronResultados]     = useState<Record<string, PronResultado>>({});
  const [listenResultados, setListenResultados] = useState<Record<string, ListenResultado>>({});
  const [writeResultados, setWriteResultados]   = useState<Record<string, WriteResultado>>({});

  const preguntaIds = preguntas.map(p => p.id).join(',');

  useEffect(() => {
    if (!user || preguntas.length === 0) return;
    let alive = true;

    const mcPregs     = preguntas.filter(p => p.tipo === 'opcion_multiple');
    const writePregs  = preguntas.filter(p => p.tipo === 'completar_frase');
    const pronPregs   = preguntas.filter(p => p.tipo === 'pronunciacion');
    const listenPregs = preguntas.filter(p => p.tipo === 'listening');

    if (mcPregs.length > 0) {
      AsyncStorage.getItem(quizStorageKey(user.id)).then(raw => {
        if (!alive || !raw) return;
        try {
          const guardadas = JSON.parse(raw) as Record<string, number>;
          const aplicables: Record<string, number> = {};
          mcPregs.forEach(p => { if (guardadas[p.id] !== undefined) aplicables[p.id] = guardadas[p.id]; });
          if (Object.keys(aplicables).length > 0) setRespuestas(aplicables);
        } catch {}
      });
    }
    if (pronPregs.length > 0) {
      AsyncStorage.getItem(pronStorageKey(user.id)).then(raw => {
        if (!alive || !raw) return;
        try {
          const guardadas = JSON.parse(raw) as Record<string, PronResultado>;
          const aplicables: Record<string, PronResultado> = {};
          pronPregs.forEach(p => { if (guardadas[p.id]) aplicables[p.id] = guardadas[p.id]; });
          if (Object.keys(aplicables).length > 0) setPronResultados(aplicables);
        } catch {}
      });
    }
    if (writePregs.length > 0) {
      AsyncStorage.getItem(writeStorageKey(user.id)).then(raw => {
        if (!alive || !raw) return;
        try {
          const guardadas = JSON.parse(raw) as Record<string, WriteResultado>;
          const aplicables: Record<string, WriteResultado> = {};
          writePregs.forEach(p => { if (guardadas[p.id]) aplicables[p.id] = guardadas[p.id]; });
          if (Object.keys(aplicables).length > 0) setWriteResultados(aplicables);
        } catch {}
      });
    }
    if (listenPregs.length > 0) {
      AsyncStorage.getItem(listenStorageKey(user.id)).then(raw => {
        if (!alive || !raw) return;
        try {
          const guardadas = JSON.parse(raw) as Record<string, ListenResultado>;
          const aplicables: Record<string, ListenResultado> = {};
          listenPregs.forEach(p => { if (guardadas[p.id]) aplicables[p.id] = guardadas[p.id]; });
          if (Object.keys(aplicables).length > 0) setListenResultados(aplicables);
        } catch {}
      });
    }

    return () => { alive = false; };
  }, [user, preguntaIds]); // eslint-disable-line react-hooks/exhaustive-deps

  if (preguntas.length === 0) return null;

  const seleccionar = async (preguntaId: string, opcion: number) => {
    if (respuestas[preguntaId] !== undefined) return;
    expandPreset();
    setRespuestas(prev => ({ ...prev, [preguntaId]: opcion }));
    if (user) {
      try {
        const key = quizStorageKey(user.id);
        const raw = await AsyncStorage.getItem(key);
        const all = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        all[preguntaId] = opcion;
        await AsyncStorage.setItem(key, JSON.stringify(all));
      } catch {}
    }
  };

  const guardarPronResultado = async (pregId: string, data: PronResultado) => {
    setPronResultados(prev => ({ ...prev, [pregId]: data }));
    if (user) {
      try {
        const key = pronStorageKey(user.id);
        const raw = await AsyncStorage.getItem(key);
        const all = raw ? (JSON.parse(raw) as Record<string, PronResultado>) : {};
        all[pregId] = data;
        await AsyncStorage.setItem(key, JSON.stringify(all));
        await incrementarPuntos(user.id, 'speaking', 1);
      } catch {}
    }
  };

  const guardarListenResultado = async (pregId: string, data: ListenResultado) => {
    setListenResultados(prev => ({ ...prev, [pregId]: data }));
    if (user) {
      try {
        const key = listenStorageKey(user.id);
        const raw = await AsyncStorage.getItem(key);
        const all = raw ? (JSON.parse(raw) as Record<string, ListenResultado>) : {};
        all[pregId] = data;
        await AsyncStorage.setItem(key, JSON.stringify(all));
        await incrementarPuntos(user.id, 'listening', 1);
      } catch {}
    }
  };

  const guardarWriteResultado = async (pregId: string, data: WriteResultado) => {
    setWriteResultados(prev => ({ ...prev, [pregId]: data }));
    if (user) {
      try {
        const key = writeStorageKey(user.id);
        const raw = await AsyncStorage.getItem(key);
        const all = raw ? (JSON.parse(raw) as Record<string, WriteResultado>) : {};
        all[pregId] = data;
        await AsyncStorage.setItem(key, JSON.stringify(all));
        await incrementarPuntos(user.id, 'writing', 1);
      } catch {}
    }
  };

  const respondidas = preguntas.filter(p =>
    p.tipo === 'pronunciacion'   ? pronResultados[p.id]   !== undefined :
    p.tipo === 'listening'       ? listenResultados[p.id] !== undefined :
    p.tipo === 'completar_frase' ? writeResultados[p.id]  !== undefined :
    respuestas[p.id] !== undefined
  ).length;

  const correctas = preguntas.filter(p =>
    p.tipo === 'pronunciacion'   ? pronResultados[p.id]?.resultado   === 'correct' :
    p.tipo === 'listening'       ? listenResultados[p.id]?.resultado === 'correct' :
    p.tipo === 'completar_frase' ? writeResultados[p.id]?.resultado  === 'correct' :
    respuestas[p.id] === p.respuesta_correcta
  ).length;

  return (
    <View style={quiz.container}>
      <View style={quiz.header}>
        <Ionicons name="help-circle" size={18} color="#2B4C72" />
        <Text style={quiz.title}>Preguntas · {preguntas.length}</Text>
        {respondidas > 0 && (
          <View style={quiz.scorePill}>
            <Text style={quiz.scoreTxt}>{correctas}/{respondidas}</Text>
          </View>
        )}
      </View>

      {preguntas.map((p, idx) => {
        if (p.tipo === 'pronunciacion') {
          return (
            <FadeInView key={p.id} delay={80 * idx}>
              <PronunciacionCard
                pregunta={p}
                saved={pronResultados[p.id]}
                onResult={(data) => guardarPronResultado(p.id, data)}
              />
            </FadeInView>
          );
        }

        if (p.tipo === 'listening') {
          return (
            <FadeInView key={p.id} delay={80 * idx}>
              <ListeningCard
                pregunta={p}
                saved={listenResultados[p.id]}
                onResult={(data) => guardarListenResultado(p.id, data)}
              />
            </FadeInView>
          );
        }

        if (p.tipo === 'completar_frase') {
          return (
            <FadeInView key={p.id} delay={80 * idx}>
              <CompletarFraseCard
                pregunta={p}
                saved={writeResultados[p.id]}
                onResult={(data) => guardarWriteResultado(p.id, data)}
              />
            </FadeInView>
          );
        }

        const seleccionada = respuestas[p.id];
        const respondida = seleccionada !== undefined;
        return (
          <FadeInView key={p.id} delay={80 * idx}>
          <View style={quiz.card}>
            <View style={quiz.cardHead}>
              <View style={quiz.numBadge}><Text style={quiz.numTxt}>{idx + 1}</Text></View>
              <View style={quiz.tipoPill}>
                <Text style={quiz.tipoTxt}>
                  {p.tipo === 'opcion_multiple' ? 'Opción múltiple' : 'Completar frase'}
                </Text>
              </View>
            </View>
            <Text style={quiz.enunciado}>{p.enunciado}</Text>
            {p.opciones.map((op, i) => {
              const isSelected = seleccionada === i;
              const isCorrect = i === p.respuesta_correcta;
              const showCorrect = respondida && isCorrect;
              const showWrong   = respondida && isSelected && !isCorrect;
              return (
                <TouchableOpacity
                  key={i}
                  disabled={respondida}
                  activeOpacity={0.75}
                  style={[
                    quiz.opcion,
                    showCorrect && quiz.opcionCorrecta,
                    showWrong && quiz.opcionIncorrecta,
                  ]}
                  onPress={() => seleccionar(p.id, i)}
                >
                  <View style={[
                    quiz.letra,
                    showCorrect && { backgroundColor: '#2E7D52' },
                    showWrong && { backgroundColor: '#E05A4E' },
                  ]}>
                    <Text style={[
                      quiz.letraTxt,
                      (showCorrect || showWrong) && { color: '#fff' },
                    ]}>{LETRAS[i]}</Text>
                  </View>
                  <Text style={[
                    quiz.opcionTxt,
                    showCorrect && { color: '#2E7D52', fontWeight: '700' },
                    showWrong && { color: '#E05A4E' },
                  ]} numberOfLines={3}>{op}</Text>
                  {showCorrect && <Ionicons name="checkmark-circle" size={18} color="#2E7D52" />}
                  {showWrong && <Ionicons name="close-circle" size={18} color="#E05A4E" />}
                </TouchableOpacity>
              );
            })}
            {respondida && seleccionada !== p.respuesta_correcta && (
              <View style={quiz.feedback}>
                <Ionicons name="information-circle" size={14} color="#2B4C72" />
                <Text style={quiz.feedbackTxt}>
                  Respuesta correcta: {LETRAS[p.respuesta_correcta]}
                </Text>
              </View>
            )}
          </View>
          </FadeInView>
        );
      })}
    </View>
  );
}

function ChatShortcut({ navigation }: { navigation: any }) {
  return (
    <TouchableOpacity
      style={styles.chatShortcut}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('ChatTab')}
    >
      <View style={styles.chatIcon}>
        <Ionicons name="sparkles" size={18} color="#2B4C72" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.chatTitle}>¿Tienes dudas?</Text>
        <Text style={styles.chatSub}>Pregunta al asistente IA</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#888" />
    </TouchableOpacity>
  );
}

const NAVY     = '#2B4C72';
const NAVY_DK  = '#1E2D3D';
const GREEN_LT = '#3FA776';
const GOLD     = '#B8860B';
const BG       = '#F2F4F6';

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14, backgroundColor: BG,
  },
  backBtn:     { width: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111' },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  // ── Progress overview (Case A) ─────────────────────────────
  progCard: {
    backgroundColor: NAVY, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: NAVY, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  progTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  progIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,214,106,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  progLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  progValue: { fontSize: 18, color: '#fff', fontWeight: '800' },
  progValueDim: { color: 'rgba(255,255,255,0.55)', fontWeight: '600', fontSize: 13 },
  progPct: { fontSize: 18, color: '#FFD66A', fontWeight: '800' },
  subLabel: {
    fontSize: 11, color: '#888', fontWeight: '800',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 10, marginLeft: 4,
  },

  // ── Leaf hero (Case B) ────────────────────────────────────
  leafHero: {
    backgroundColor: NAVY, borderRadius: 18, padding: 20, marginBottom: 18,
    shadowColor: NAVY, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  leafIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  leafLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
  leafTitle: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28 },
  leafDoneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: 'rgba(63,167,118,0.25)',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  leafDoneTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },

  // ── Lesson cards (Case A) ─────────────────────────────────
  lecCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  lecCardActive: {
    backgroundColor: NAVY_DK,
    shadowColor: NAVY_DK, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  lecCardLocked: { opacity: 0.65 },

  lecHead: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  lecNum: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F0F1F3',
    alignItems: 'center', justifyContent: 'center',
  },
  lecNumDone:   { backgroundColor: GREEN_LT },
  lecNumActive: { backgroundColor: '#FFD66A' },
  lecNumLocked: { backgroundColor: '#F0F1F3' },
  lecNumTxt:    { fontSize: 14, fontWeight: '800', color: '#666' },

  lecLabel:       { fontSize: 10, fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  lecLabelActive: { color: '#8899AA' },
  lecName:        { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 6 },
  lecNameActive:  { color: '#fff' },
  lecNameLocked:  { color: '#999' },
  lecStatus:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lecStatusTxt:   { fontSize: 11, fontWeight: '700' },
  lecDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FFD66A',
  },

  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFD66A',
    alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 14 },

  expanded:  { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },

  // ── Content blocks ─────────────────────────────────────────
  textBlock: { marginBottom: 14 },
  bodyText:  { fontSize: 14, color: '#444', lineHeight: 22 },

  listBlock: {
    backgroundColor: '#FAFBFC', borderRadius: 12,
    padding: 14, marginBottom: 14,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bulletDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: NAVY,
    marginTop: 7,
  },
  bulletText:{ flex: 1, fontSize: 13, color: '#444', lineHeight: 20 },

  ejercicioCard: {
    backgroundColor: '#F0F4FF', borderRadius: 12,
    padding: 14, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: NAVY,
  },
  ejercicioHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  ejercicioLabel:    { fontSize: 10, fontWeight: '800', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.8 },
  ejercicioPregunta: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 10, lineHeight: 20 },
  ejercicioRespBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(43,76,114,0.06)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  ejercicioRespuesta:{ fontSize: 12, color: '#666', fontStyle: 'italic' },

  noContent: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 16, paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 10,
    marginBottom: 8,
  },
  noContentDark: { backgroundColor: 'rgba(255,255,255,0.08)' },
  noContentTxt: { fontSize: 13, color: '#999', fontStyle: 'italic' },

  completarBtn: {
    backgroundColor: GREEN_LT, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginTop: 14,
    shadowColor: GREEN_LT, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  completarTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },

  completadoBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#FFF6E0', marginTop: 14,
    borderWidth: 1, borderColor: '#FFD66A',
  },
  completadoTxt: { fontSize: 14, fontWeight: '800', color: GOLD },

  chatShortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  chatIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  chatTitle: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 2 },
  chatSub:   { fontSize: 12, color: '#888' },
  chevron:   { fontSize: 20, color: '#888' },
});

// Shared styles used by sub-components
const styles = s;

const quiz = StyleSheet.create({
  container: { marginTop: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  title: { flex: 1, fontSize: 13, fontWeight: '800', color: '#111', textTransform: 'uppercase', letterSpacing: 0.4 },
  scorePill: {
    backgroundColor: '#2B4C72', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  scoreTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },

  card: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  numBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center',
  },
  numTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  tipoPill: {
    backgroundColor: 'rgba(43,76,114,0.08)', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  tipoTxt: { fontSize: 10, fontWeight: '700', color: '#2B4C72' },

  enunciado: { fontSize: 14, color: '#222', lineHeight: 20, marginBottom: 12 },

  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: '#F7F8FA', borderRadius: 10,
    marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  opcionCorrecta:   { backgroundColor: '#E9F5EE', borderColor: '#2E7D52' },
  opcionIncorrecta: { backgroundColor: '#FCEBEA', borderColor: '#E05A4E' },

  letra: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center',
  },
  letraTxt: { fontSize: 12, fontWeight: '800', color: '#666' },
  opcionTxt: { flex: 1, fontSize: 13, color: '#333' },

  feedback: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(43,76,114,0.07)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 4,
  },
  feedbackTxt: { fontSize: 11, color: '#2B4C72', fontWeight: '700' },
});

const pron = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(43,76,114,0.12)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  tipo: { fontSize: 11, fontWeight: '800', color: '#2B4C72', textTransform: 'uppercase', letterSpacing: 0.8 },

  phraseBox: {
    backgroundColor: '#F4F6F9', borderRadius: 10,
    padding: 14, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#2B4C72',
  },
  phraseLabel: { fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  phrase: { fontSize: 17, fontWeight: '800', color: '#111', lineHeight: 24 },

  micBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2B4C72', borderRadius: 12,
    paddingVertical: 13, marginBottom: 10,
    shadowColor: '#2B4C72', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  micBtnActive: { backgroundColor: '#E05A4E' },
  micTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },

  liveBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(224,90,78,0.07)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
  },
  liveTxt: { flex: 1, fontSize: 13, color: '#555', fontStyle: 'italic' },

  resultBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 4,
  },
  resultTxt: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  transcTxt: { fontSize: 11, color: '#888', fontStyle: 'italic' },

  unavailableBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F5F5F5', borderRadius: 8,
    padding: 10, marginTop: 4,
  },
  unavailableTxt: { flex: 1, fontSize: 12, color: '#888', lineHeight: 17 },
});

const write = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(43,76,114,0.12)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  tipo: { fontSize: 11, fontWeight: '800', color: '#2B4C72', textTransform: 'uppercase', letterSpacing: 0.8 },
  phraseBox: {
    backgroundColor: '#F4F6F9', borderRadius: 10,
    padding: 14, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: '#2B4C72',
  },
  phrase: { fontSize: 15, fontWeight: '700', color: '#111', lineHeight: 22 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    backgroundColor: '#F5F6F8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: '#111',
    borderWidth: 1, borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  checkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2B4C72', borderRadius: 10,
    paddingVertical: 11, marginBottom: 4,
  },
  checkBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  resultBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 4,
  },
  resultTxt:   { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  esperadoTxt: { fontSize: 11, color: '#666', lineHeight: 16 },
});

const listen = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(184,134,11,0.18)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(184,134,11,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  tipo: { fontSize: 11, fontWeight: '800', color: '#B8860B', textTransform: 'uppercase', letterSpacing: 0.8 },

  audioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#B8860B', borderRadius: 10,
    paddingVertical: 11, marginBottom: 14,
  },
  audioBtnActive: { backgroundColor: '#2B4C72' },
  audioBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

  pregunta: { fontSize: 14, fontWeight: '700', color: '#222', lineHeight: 20, marginBottom: 10 },

  inputLabel: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    backgroundColor: '#F5F6F8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: '#111',
    borderWidth: 1, borderColor: '#E0E0E0',
    minHeight: 72, marginBottom: 10,
    textAlignVertical: 'top',
  },

  checkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2E7D52', borderRadius: 10,
    paddingVertical: 11, marginBottom: 6,
  },
  checkBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

  resultBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 4,
  },
  resultTxt:  { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  esperadoTxt: { fontSize: 11, color: '#666', lineHeight: 16 },
});
