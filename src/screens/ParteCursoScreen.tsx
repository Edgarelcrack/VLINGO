import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  getSecciones, getProgresoPorCurso, upsertProgreso,
} from '../services/cursosService';
import { Seccion, ProgresoUsuario, EstadoSeccion, ContenidoBloque } from '../types';

type SeccionConEstado = Seccion & { estado: EstadoSeccion };

const ACTIVE_BG = '#1E2D3D';

export default function ParteCursoScreen({ navigation, route }: any) {
  const { seccionId, cursoId, titulo } = route?.params ?? {};
  const { user } = useAuth();

  const [hijos, setHijos]       = useState<SeccionConEstado[]>([]);
  const [seccion, setSeccion]   = useState<Seccion | null>(null);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cursoId || !user) return;

    // Get all course sections
    const { data: todasSecciones } = await getSecciones(cursoId);
    const actual = todasSecciones.find(s => s.id === seccionId) ?? null;
    setSeccion(actual);

    // Children of this section
    const children = todasSecciones.filter(s => s.parent_id === seccionId);

    if (children.length > 0) {
      const { data: progreso } = await getProgresoPorCurso(user.id, cursoId);
      const progresoMap: Record<string, EstadoSeccion> = {};
      (progreso as ProgresoUsuario[]).forEach(p => { progresoMap[p.seccion_id] = p.estado; });

      const conEstado: SeccionConEstado[] = children.map(s => ({
        ...s,
        estado: progresoMap[s.id] ?? 'locked',
      }));
      setHijos(conEstado);
      // Auto-open the first done section
      const firstDone = conEstado.find(s => s.estado === 'done');
      if (firstDone) setOpen(firstDone.id);
    } else {
      setHijos([]);
    }
  }, [seccionId, cursoId, user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const marcarCompletado = async (secId: string) => {
    if (!user) return;
    await upsertProgreso(user.id, secId, 'done');
    // Refresh to reflect new state
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
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{titulo ?? seccion?.titulo ?? 'Parte'}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {hijos.map((h, i) => {
            const isOpen   = open === h.id;
            const isActive = h.estado === 'active';
            const isDone   = h.estado === 'done';
            const isLocked = h.estado === 'locked';
            const bloques  = h.contenido?.bloques ?? [];

            return (
              <View key={h.id} style={[s.card, isActive && s.cardActive, isLocked && s.cardLocked]}>
                <TouchableOpacity
                  style={s.cardTop}
                  activeOpacity={isLocked ? 1 : 0.75}
                  onPress={() => !isLocked && setOpen(isOpen ? null : h.id)}
                >
                  <Text style={[s.cardNum, isActive && s.cardNumActive]}>Parte {i + 1}</Text>
                  <View style={[s.dot, isDone && s.dotDone, isActive && s.dotActive, isLocked && s.dotLocked]} />
                  <Text style={[s.cardName, isActive && s.cardNameActive, isLocked && s.cardNameLocked]}>
                    {h.titulo}
                  </Text>
                  {isActive ? (
                    <View style={s.playBtn}><Text style={{ color: '#fff', fontSize: 12 }}>▶</Text></View>
                  ) : isDone ? (
                    <Text style={s.chevron}>{isOpen ? '▼' : '›'}</Text>
                  ) : (
                    <Text style={s.chevronLocked}>›</Text>
                  )}
                </TouchableOpacity>

                {isOpen && bloques.length > 0 && (
                  <View style={s.expanded}>
                    <BloquesRenderer bloques={bloques} />
                    {isActive && (
                      <TouchableOpacity
                        style={s.completarBtn}
                        onPress={() => marcarCompletado(h.id)}
                      >
                        <Text style={s.completarTxt}>Marcar como completado ✓</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {isOpen && bloques.length === 0 && (
                  <View style={s.expanded}>
                    <Text style={s.bodyText}>Esta sección no tiene contenido todavía.</Text>
                  </View>
                )}
              </View>
            );
          })}

          <ChatShortcut navigation={navigation} />
          <View style={{ height: 20 }} />
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
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{titulo ?? seccion?.titulo ?? 'Lección'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {bloques.length === 0 ? (
          <Text style={s.bodyText}>Esta lección no tiene contenido todavía.</Text>
        ) : (
          <BloquesRenderer bloques={bloques} />
        )}
        {seccion && user && (
          <TouchableOpacity
            style={[s.completarBtn, { marginTop: 24 }]}
            onPress={() => marcarCompletado(seccion.id)}
          >
            <Text style={s.completarTxt}>Marcar como completado ✓</Text>
          </TouchableOpacity>
        )}
        <ChatShortcut navigation={navigation} />
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BloquesRenderer({ bloques }: { bloques: ContenidoBloque[] }) {
  return (
    <>
      {bloques.map((b, i) => {
        if (b.tipo === 'texto') {
          return <Text key={i} style={styles.bodyText}>{b.valor}</Text>;
        }
        if (b.tipo === 'lista' && b.items) {
          return (
            <View key={i} style={{ marginBottom: 12 }}>
              {b.items.map((item, j) => (
                <View key={j} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (b.tipo === 'ejercicio') {
          return (
            <View key={i} style={styles.ejercicioCard}>
              <Text style={styles.ejercicioLabel}>Ejercicio</Text>
              <Text style={styles.ejercicioPregunta}>{b.pregunta}</Text>
              {b.respuesta && (
                <Text style={styles.ejercicioRespuesta}>Respuesta: {b.respuesta}</Text>
              )}
            </View>
          );
        }
        return null;
      })}
    </>
  );
}

function ChatShortcut({ navigation }: { navigation: any }) {
  return (
    <TouchableOpacity
      style={styles.chatShortcut}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('ChatTab')}
    >
      <View style={styles.chatIcon}></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.chatTitle}>¿Tienes dudas?</Text>
        <Text style={styles.chatSub}>Pregunta al asistente IA</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F2F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F6' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F2F4F6',
  },
  backBtn:     { width: 32 },
  backArrow:   { fontSize: 22, color: '#111' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111' },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  card:       { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  cardActive: { backgroundColor: ACTIVE_BG },
  cardLocked: { opacity: 0.55 },

  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 18,
  },

  cardNum:       { fontSize: 12, color: '#AAA', width: 50 },
  cardNumActive: { color: '#8899AA' },

  dot:       { width: 12, height: 12, borderRadius: 6 },
  dotDone:   { backgroundColor: '#C9A09A' },
  dotActive: { backgroundColor: '#E07070' },
  dotLocked: { backgroundColor: '#DDB8B5' },

  cardName:       { flex: 1, fontSize: 14, fontWeight: '500', color: '#222' },
  cardNameActive: { color: '#fff', fontWeight: '600' },
  cardNameLocked: { color: '#BBB' },

  playBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center',
  },
  chevron:       { fontSize: 20, color: '#888' },
  chevronLocked: { fontSize: 20, color: '#CCC' },

  expanded:  { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  bodyText:  { fontSize: 13, color: '#555', lineHeight: 21, marginBottom: 12 },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet:    { color: '#555', fontSize: 13 },
  bulletText:{ flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },

  ejercicioCard: {
    backgroundColor: '#F0F4FF', borderRadius: 10,
    padding: 14, marginBottom: 12,
  },
  ejercicioLabel:    { fontSize: 10, fontWeight: '700', color: '#2B4C72', textTransform: 'uppercase', marginBottom: 6 },
  ejercicioPregunta: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 8 },
  ejercicioRespuesta:{ fontSize: 13, color: '#555', fontStyle: 'italic' },

  completarBtn: {
    backgroundColor: '#2B4C72', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 8,
  },
  completarTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  chatShortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 8,
  },
  chatIcon:  { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  chatTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
  chatSub:   { fontSize: 12, color: '#999' },
});

// Shared styles used by sub-components
const styles = s;
