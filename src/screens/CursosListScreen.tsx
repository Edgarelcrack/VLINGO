import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  getCursos, getMisCursos, eliminarCurso,
  getStatsCurso, StatsCurso,
} from '../services/cursosService';
import { Curso } from '../types';

const NAVY = '#2B4C72';
const BG   = '#F2F4F6';

const NIVELES_ALL = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const NIVEL_COLOR: Record<string, string> = {
  A1: '#4CAF7D', A2: '#8BC34A',
  B1: '#FFA726', B2: '#FF7043',
  C1: '#AB47BC', C2: '#EC407A',
};

type Tab = 'mis' | 'catalogo';

type SecRange = 'todas' | '1-5' | '6-10' | '10+';

const SEC_RANGES: { value: SecRange; label: string }[] = [
  { value: 'todas', label: 'Cualquiera' },
  { value: '1-5',   label: '1 – 5' },
  { value: '6-10',  label: '6 – 10' },
  { value: '10+',   label: 'Más de 10' },
];

const matchRange = (n: number, r: SecRange) => {
  if (r === 'todas') return true;
  if (r === '1-5')   return n >= 1  && n <= 5;
  if (r === '6-10')  return n >= 6  && n <= 10;
  if (r === '10+')   return n > 10;
  return true;
};

export default function CursosListScreen({ navigation }: any) {
  const { userProfile, user } = useAuth();
  const insets = useSafeAreaInsets();
  const isProfesor = userProfile?.tipo === 'profesor' || userProfile?.tipo === 'administrador';

  const [tab, setTab]               = useState<Tab>('mis');
  const [cursos, setCursos]         = useState<Curso[]>([]);
  const [stats, setStats]           = useState<Record<string, StatsCurso>>({});
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch]           = useState('');
  const [niveles, setNiveles]         = useState<string[]>([]);
  const [secRange, setSecRange]       = useState<SecRange>('todas');
  const [filterOpen, setFilterOpen]   = useState(false);

  const filtrosActivos = niveles.length + (secRange !== 'todas' ? 1 : 0);

  const cursosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cursos.filter(c => {
      if (q && !c.titulo.toLowerCase().includes(q)) return false;
      if (niveles.length > 0 && (!c.nivel || !niveles.includes(c.nivel))) return false;
      if (secRange !== 'todas') {
        const total = stats[c.id]?.totalSecciones ?? 0;
        if (!matchRange(total, secRange)) return false;
      }
      return true;
    });
  }, [cursos, search, niveles, secRange, stats]);

  const load = useCallback(async () => {
    if (!user) return;
    const tipo = userProfile?.tipo ?? 'estudiante';
    if (isProfesor && tab === 'mis') {
      const { data } = await getMisCursos(user.id);
      setCursos(data);
    } else {
      const { data } = await getCursos(tipo, user.id);
      setCursos(isProfesor ? data.filter(c => c.publicado && c.creado_por !== user.id) : data);
    }
  }, [user, userProfile, tab, isProfesor]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  useEffect(() => {
    if (cursos.length === 0) { setStats({}); return; }
    let alive = true;
    (async () => {
      const next: Record<string, StatsCurso> = {};
      await Promise.all(cursos.map(async c => {
        next[c.id] = await getStatsCurso(c.id);
      }));
      if (alive) setStats(next);
    })();
    return () => { alive = false; };
  }, [cursos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleEliminar = (curso: Curso) => {
    Alert.alert(
      'Eliminar curso',
      `¿Eliminar "${curso.titulo}" y todo su contenido?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { error } = await eliminarCurso(curso.id);
            if (error) Alert.alert('Error', error);
            else load();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Cursos</Text>
          <Text style={s.headerSub}>
            {isProfesor ? 'Gestiona tus cursos y explora el catálogo' : 'Aprende algo nuevo cada día'}
          </Text>
        </View>
        {isProfesor && (
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => navigation.navigate('CrearCurso')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.createBtnTxt}>Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {isProfesor && (
        <View style={s.tabsRow}>
          <TouchableOpacity
            style={[s.tab, tab === 'mis' && s.tabActive]}
            onPress={() => setTab('mis')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="briefcase"
              size={14}
              color={tab === 'mis' ? '#fff' : '#888'}
            />
            <Text style={[s.tabTxt, tab === 'mis' && s.tabTxtActive]}>Mis cursos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === 'catalogo' && s.tabActive]}
            onPress={() => setTab('catalogo')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="library"
              size={14}
              color={tab === 'catalogo' ? '#fff' : '#888'}
            />
            <Text style={[s.tabTxt, tab === 'catalogo' && s.tabTxtActive]}>Catálogo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search + filter */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color="#999" />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar curso por nombre…"
            placeholderTextColor="#BBB"
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#BBB" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.filterBtn, filtrosActivos > 0 && s.filterBtnActive]}
          onPress={() => setFilterOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="options"
            size={18}
            color={filtrosActivos > 0 ? '#fff' : NAVY}
          />
          {filtrosActivos > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeTxt}>{filtrosActivos}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {cursos.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons
                name={isProfesor && tab === 'mis' ? 'create-outline' : 'library-outline'}
                size={42}
                color="#BBB"
              />
            </View>
            <Text style={s.emptyTitle}>
              {isProfesor && tab === 'mis' ? 'Aún no tienes cursos' : 'No hay cursos disponibles'}
            </Text>
            <Text style={s.emptySub}>
              {isProfesor && tab === 'mis'
                ? 'Crea tu primer curso con el botón "Nuevo"'
                : isProfesor
                  ? 'No hay cursos publicados de otros profesores'
                  : 'Próximamente habrá cursos para ti'}
            </Text>
          </View>
        ) : cursosFiltrados.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="search-outline" size={42} color="#BBB" />
            </View>
            <Text style={s.emptyTitle}>Sin resultados</Text>
            <Text style={s.emptySub}>Prueba con otro término o ajusta los filtros</Text>
            {(search.length > 0 || filtrosActivos > 0) && (
              <TouchableOpacity
                style={s.clearBtn}
                onPress={() => {
                  setSearch('');
                  setNiveles([]);
                  setSecRange('todas');
                }}
              >
                <Text style={s.clearBtnTxt}>Limpiar todo</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          cursosFiltrados.map(c => {
            const st = stats[c.id];
            const esMio = isProfesor && c.creado_por === user?.id;
            const goEditor = () => navigation.navigate('EditorSecciones', { cursoId: c.id, titulo: c.titulo });
            const goCurso  = () => navigation.navigate('Curso',           { cursoId: c.id, titulo: c.titulo });
            return (
              <View key={c.id} style={s.card}>
                <TouchableOpacity
                  style={s.cardMain}
                  activeOpacity={0.75}
                  onPress={esMio ? goEditor : goCurso}
                >
                  <View style={s.iconBox}>
                    <Ionicons name="book" size={22} color={NAVY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle} numberOfLines={1}>{c.titulo}</Text>
                    {c.descripcion ? (
                      <Text style={s.cardDesc} numberOfLines={2}>{c.descripcion}</Text>
                    ) : null}
                    <View style={s.metaRow}>
                      {c.nivel ? (
                        <View style={[s.nivelPill, { backgroundColor: `${NIVEL_COLOR[c.nivel] ?? NAVY}22` }]}>
                          <Text style={[s.nivelTxt, { color: NIVEL_COLOR[c.nivel] ?? NAVY }]}>{c.nivel}</Text>
                        </View>
                      ) : null}
                      {esMio && (
                        c.publicado ? (
                          <View style={s.publicadoPill}>
                            <Ionicons name="checkmark-circle" size={12} color="#2E7D52" />
                            <Text style={s.publicadoTxt}>Publicado</Text>
                          </View>
                        ) : (
                          <View style={s.borradorPill}>
                            <Ionicons name="document-outline" size={12} color="#FF6F00" />
                            <Text style={s.borradorTxt}>Borrador</Text>
                          </View>
                        )
                      )}
                    </View>
                    {st && (
                      <View style={s.statsRow}>
                        <Stat icon="folder-outline" label={`${st.totalSecciones}`} sub="sec" />
                        <Stat icon="document-text-outline" label={`${st.totalLecciones}`} sub="lec" />
                        <Stat icon="help-circle-outline" label={`${st.totalPreguntas}`} sub="preg" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {esMio && (
                  <View style={s.cardActions}>
                    <TouchableOpacity style={s.cardActionBtn} onPress={goEditor}>
                      <Ionicons name="construct-outline" size={15} color={NAVY} />
                      <Text style={s.cardActionTxt}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.cardActionBtn}
                      onPress={() => navigation.navigate('CrearCurso', { cursoId: c.id })}
                    >
                      <Ionicons name="information-circle-outline" size={15} color={NAVY} />
                      <Text style={s.cardActionTxt}>Info</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.cardActionBtn} onPress={() => handleEliminar(c)}>
                      <Ionicons name="trash-outline" size={15} color="#E05A4E" />
                      <Text style={[s.cardActionTxt, { color: '#E05A4E' }]}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <FiltroModal
        visible={filterOpen}
        niveles={niveles}
        secRange={secRange}
        onApply={(n, r) => { setNiveles(n); setSecRange(r); setFilterOpen(false); }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}

function FiltroModal({
  visible, niveles, secRange, onApply, onClose,
}: {
  visible: boolean;
  niveles: string[];
  secRange: SecRange;
  onApply: (niveles: string[], r: SecRange) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [localNiveles, setLocalNiveles] = useState<string[]>(niveles);
  const [localRange, setLocalRange]     = useState<SecRange>(secRange);

  useEffect(() => {
    if (visible) {
      setLocalNiveles(niveles);
      setLocalRange(secRange);
    }
  }, [visible, niveles, secRange]);

  const toggleNivel = (n: string) => {
    setLocalNiveles(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  };

  const limpiar = () => {
    setLocalNiveles([]);
    setLocalRange('todas');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={f.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[f.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={f.handle} />
          <View style={f.topRow}>
            <Text style={f.title}>Filtros</Text>
            <TouchableOpacity onPress={limpiar}>
              <Text style={f.limpiarTxt}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          <Text style={f.label}>Nivel de inglés</Text>
          <View style={f.chipsRow}>
            {NIVELES_ALL.map(n => {
              const active = localNiveles.includes(n);
              const color = NIVEL_COLOR[n];
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    f.chip,
                    active && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => toggleNivel(n)}
                  activeOpacity={0.85}
                >
                  <Text style={[f.chipTxt, active && { color: '#fff' }]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={f.label}>Número de secciones</Text>
          <View style={f.chipsRow}>
            {SEC_RANGES.map(r => {
              const active = localRange === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[f.chip, active && f.chipActive]}
                  onPress={() => setLocalRange(r.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[f.chipTxt, active && { color: '#fff' }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={f.applyBtn}
            onPress={() => onApply(localNiveles, localRange)}
            activeOpacity={0.85}
          >
            <Text style={f.applyTxt}>Aplicar filtros</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Stat({ icon, label, sub }: { icon: any; label: string; sub: string }) {
  return (
    <View style={s.statBox}>
      <Ionicons name={icon} size={12} color="#888" />
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, backgroundColor: BG,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111' },
  headerSub:   { fontSize: 12, color: '#888', marginTop: 2 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: NAVY, borderRadius: 100,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  createBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  tabsRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 38,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  tabActive: { backgroundColor: NAVY, borderColor: NAVY },
  tabTxt:    { fontSize: 12, fontWeight: '700', color: '#888' },
  tabTxtActive: { color: '#fff' },

  // Search + filter row
  searchRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#111', padding: 0 },
  filterBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E8E8',
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#E07070',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },

  clearBtn: {
    marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 100, borderWidth: 1, borderColor: NAVY,
  },
  clearBtnTxt: { fontSize: 12, fontWeight: '700', color: NAVY },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardMain:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  iconBox: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 2 },
  cardDesc:  { fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 17 },
  metaRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  nivelPill: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  nivelTxt:  { fontSize: 11, fontWeight: '800' },
  publicadoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E9F5EE', borderRadius: 6,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  publicadoTxt: { fontSize: 11, fontWeight: '700', color: '#2E7D52' },
  borradorPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF3E0', borderRadius: 6,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  borradorTxt:  { fontSize: 11, fontWeight: '700', color: '#FF6F00' },

  statsRow:  { flexDirection: 'row', gap: 12, marginTop: 8 },
  statBox:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#444' },
  statSub:   { fontSize: 10, color: '#999' },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  cardActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, height: 40,
  },
  cardActionTxt: { fontSize: 12, fontWeight: '700', color: NAVY },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySub:   { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 19 },
});

const f = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8,
  },
  handle: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', marginBottom: 14,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '800', color: '#111' },
  limpiarTxt: { fontSize: 13, fontWeight: '700', color: '#E05A4E' },

  label: {
    fontSize: 11, fontWeight: '800', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 14, marginBottom: 10,
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipTxt:    { fontSize: 12, fontWeight: '700', color: '#666' },

  applyBtn: {
    marginTop: 20, height: 50, borderRadius: 12,
    backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center',
  },
  applyTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
