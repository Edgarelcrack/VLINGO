import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  StyleSheet, ActivityIndicator, RefreshControl, Easing,
} from 'react-native';
import { SkeletonList } from '../components/SkeletonLoader';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  getSecciones, getProgresoPorCurso, inicializarProgreso,
} from '../services/cursosService';
import { Seccion, ProgresoUsuario, EstadoSeccion } from '../types';

type SeccionConEstado = Seccion & { estado: EstadoSeccion };

// ── Animation helpers ──────────────────────────────────────────────────────────
function FadeInView({
  children, delay = 0, style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,   { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
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

const NAVY     = '#2B4C72';
const NAVY_DK  = '#1E2D3D';
const GREEN    = '#2E7D52';
const GREEN_LT = '#3FA776';
const BG       = '#F2F4F6';

export default function CursoScreen({ navigation, route }: any) {
  const { cursoId, titulo } = route?.params ?? {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [secciones, setSecciones]   = useState<SeccionConEstado[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!cursoId || !user) return;

    const [{ data: todasSecciones }, { data: progreso }] = await Promise.all([
      getSecciones(cursoId),
      getProgresoPorCurso(user.id, cursoId),
    ]);

    const raices = todasSecciones.filter(s => s.parent_id === null);

    if (progreso.length === 0 && raices.length > 0) {
      await inicializarProgreso(user.id, cursoId);
      progreso.push({ id: '', usuario_id: user.id, seccion_id: raices[0].id, estado: 'active', completado_en: null });
    }

    const progresoMap: Record<string, EstadoSeccion> = {};
    (progreso as ProgresoUsuario[]).forEach(p => { progresoMap[p.seccion_id] = p.estado; });

    const conEstado: SeccionConEstado[] = raices.map((s, i) => {
      const estadoBD = progresoMap[s.id];
      if (estadoBD) return { ...s, estado: estadoBD };
      // Sin registro: desbloquear si todas las anteriores están completadas
      const anterioresCompletas = raices.slice(0, i).every(prev => progresoMap[prev.id] === 'done');
      return { ...s, estado: anterioresCompletas ? 'active' : 'locked' };
    });

    setSecciones(conEstado);
  }, [cursoId, user]);

  useFocusEffect(useCallback(() => {
    load().finally(() => setLoading(false));
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14 }}>
          <View style={{ height: 20, width: '50%', backgroundColor: '#D0D8E4', borderRadius: 6, opacity: 0.5 }} />
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonList count={4} />
        </View>
      </SafeAreaView>
    );
  }

  const completadas = secciones.filter(x => x.estado === 'done').length;
  const total       = secciones.length;
  const porcentaje  = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const activa      = secciones.find(x => x.estado === 'active');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Curso</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HERO: título + progreso */}
        <FadeInView>
          <View style={s.hero}>
            <View style={s.heroIconWrap}>
              <Ionicons name="book" size={26} color="#fff" />
            </View>
            <Text style={s.heroTitle} numberOfLines={3}>{titulo ?? 'Curso'}</Text>

            {total > 0 && (
              <>
                <AnimatedBar
                  pct={porcentaje}
                  color={GREEN_LT}
                  trackColor="rgba(255,255,255,0.15)"
                />
                <View style={[s.progressMeta, { marginTop: 8 }]}>
                  <Text style={s.progressTxt}>
                    {completadas} de {total} {total === 1 ? 'parte' : 'partes'} completadas
                  </Text>
                  <Text style={s.progressPct}>{porcentaje}%</Text>
                </View>
              </>
            )}
          </View>
        </FadeInView>

        {/* Active hint */}
        {activa && (
          <FadeInView delay={100}>
            <View style={s.continueBox}>
              <Ionicons name="play-circle" size={18} color={NAVY} />
              <Text style={s.continueTxt}>Continúa con: <Text style={{ fontWeight: '800' }}>{activa.titulo}</Text></Text>
            </View>
          </FadeInView>
        )}

        {/* SECTION TITLE */}
        {secciones.length > 0 && (
          <FadeInView delay={150}>
            <Text style={s.sectionLabel}>Tu camino</Text>
          </FadeInView>
        )}

        {/* TIMELINE */}
        {secciones.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="hourglass-outline" size={44} color="#BBB" />
            <Text style={s.emptyTxt}>Este curso aún no tiene secciones</Text>
            <Text style={s.emptySub}>El profesor pronto añadirá contenido</Text>
          </View>
        ) : (
          <View style={s.timeline}>
            {secciones.map((sec, i) => {
              const isActive = sec.estado === 'active';
              const isDone   = sec.estado === 'done';
              const isLocked = sec.estado === 'locked';
              const isLast   = i === secciones.length - 1;

              const numColor =
                isDone ? GREEN :
                isActive ? NAVY :
                '#D0D6DD';

              const numBg =
                isDone ? '#E9F5EE' :
                isActive ? NAVY :
                '#F0F1F3';

              return (
                <FadeInView key={sec.id} delay={200 + i * 70}>
                <View style={s.timelineRow}>
                  <View style={s.timelineLeft}>
                    <View style={[s.numCircle, { backgroundColor: numBg }]}>
                      {isDone ? (
                        <Ionicons name="checkmark" size={20} color={GREEN} />
                      ) : isLocked ? (
                        <Ionicons name="lock-closed" size={16} color="#BBB" />
                      ) : (
                        <Text style={[s.numTxt, { color: isActive ? '#fff' : numColor }]}>{i + 1}</Text>
                      )}
                    </View>
                    {!isLast && (
                      <View style={[s.connector, isDone && { backgroundColor: GREEN_LT }]} />
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      s.partCard,
                      isActive && s.partCardActive,
                      isLocked && s.partCardLocked,
                    ]}
                    activeOpacity={isLocked ? 1 : 0.75}
                    onPress={() =>
                      !isLocked &&
                      navigation.navigate('Parte', {
                        seccionId: sec.id,
                        cursoId,
                        titulo: sec.titulo,
                      })
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.partLabel, isActive && s.partLabelActive]}>
                        Parte {i + 1}
                      </Text>
                      <Text
                        style={[s.partName, isActive && s.partNameActive, isLocked && s.partNameLocked]}
                        numberOfLines={2}
                      >
                        {sec.titulo}
                      </Text>
                      <View style={s.partStatus}>
                        {isDone && (
                          <>
                            <Ionicons name="checkmark-circle" size={13} color={GREEN_LT} />
                            <Text style={[s.partStatusTxt, { color: GREEN }]}>Completada</Text>
                          </>
                        )}
                        {isActive && (
                          <>
                            <View style={s.activeDot} />
                            <Text style={[s.partStatusTxt, { color: '#FFE39C' }]}>En progreso</Text>
                          </>
                        )}
                        {isLocked && (
                          <>
                            <Ionicons name="lock-closed" size={11} color="#BBB" />
                            <Text style={[s.partStatusTxt, { color: '#BBB' }]}>Bloqueada</Text>
                          </>
                        )}
                      </View>
                    </View>

                    {isActive ? (
                      <View style={s.playBtn}>
                        <Ionicons name="play" size={14} color="#fff" />
                      </View>
                    ) : !isLocked ? (
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    ) : null}
                  </TouchableOpacity>
                </View>
                </FadeInView>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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

  // Hero
  hero: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: NAVY, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    lineHeight: 28, marginBottom: 18,
  },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  progressPct:  { fontSize: 13, color: '#fff', fontWeight: '800' },

  // Continue hint
  continueBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(43,76,114,0.08)',
    borderRadius: 12, padding: 12,
    marginBottom: 18,
  },
  continueTxt: { flex: 1, fontSize: 12, color: '#444' },

  // Section label
  sectionLabel: {
    fontSize: 11, color: '#888', fontWeight: '800',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 10, marginLeft: 4,
  },

  // Timeline
  timeline: {},
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 36 },
  numCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  numTxt: { fontSize: 14, fontWeight: '800' },
  connector: {
    width: 2, flex: 1, backgroundColor: '#E0E3E7', marginVertical: 4,
  },

  partCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  partCardActive: {
    backgroundColor: NAVY_DK,
    shadowColor: NAVY_DK, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  partCardLocked: { opacity: 0.7 },

  partLabel:       { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  partLabelActive: { color: '#8899AA' },
  partName:        { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 6 },
  partNameActive:  { color: '#fff' },
  partNameLocked:  { color: '#999' },

  partStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partStatusTxt: { fontSize: 11, fontWeight: '700' },
  activeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FFD66A',
  },

  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFD66A',
    alignItems: 'center', justifyContent: 'center',
  },

  empty:    { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTxt: { fontSize: 15, fontWeight: '700', color: '#444', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#999', marginTop: 4 },
});
