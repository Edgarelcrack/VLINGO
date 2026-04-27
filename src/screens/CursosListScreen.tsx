import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getCursos } from '../services/cursosService';
import { Curso } from '../types';

const NAVY = '#2B4C72';
const BG   = '#F2F4F6';

const NIVEL_COLOR: Record<string, string> = {
  A1: '#4CAF7D', A2: '#8BC34A',
  B1: '#FFA726', B2: '#FF7043',
  C1: '#AB47BC', C2: '#EC407A',
};

export default function CursosListScreen({ navigation }: any) {
  const { userProfile, user } = useAuth();
  const [cursos, setCursos]     = useState<Curso[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const tipo = userProfile?.tipo ?? 'estudiante';
    const { data } = await getCursos(tipo, user.id);
    setCursos(data);
  }, [user, userProfile]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isProfesor = userProfile?.tipo === 'profesor' || userProfile?.tipo === 'administrador';

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
        <Text style={s.headerTitle}>Cursos</Text>
        {isProfesor && (
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => navigation.navigate('CrearCurso')}
          >
            <Text style={s.createBtnTxt}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {cursos.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}></Text>
            <Text style={s.emptyTitle}>No hay cursos disponibles</Text>
            <Text style={s.emptySub}>
              {isProfesor
                ? 'Crea tu primer curso con el botón "Nuevo"'
                : 'Próximamente habrá cursos para ti'}
            </Text>
          </View>
        ) : (
          cursos.map(c => (
            <TouchableOpacity
              key={c.id}
              style={s.card}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Curso', { cursoId: c.id, titulo: c.titulo })}
            >
              <View style={s.cardLeft}>
                <View style={s.iconBox}>
                  <Text style={{ fontSize: 22 }}></Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{c.titulo}</Text>
                  {c.descripcion ? (
                    <Text style={s.cardDesc} numberOfLines={1}>{c.descripcion}</Text>
                  ) : null}
                  <View style={s.metaRow}>
                    {c.nivel ? (
                      <View style={[s.nivelPill, { backgroundColor: `${NIVEL_COLOR[c.nivel] ?? NAVY}22` }]}>
                        <Text style={[s.nivelTxt, { color: NIVEL_COLOR[c.nivel] ?? NAVY }]}>{c.nivel}</Text>
                      </View>
                    ) : null}
                    {!c.publicado && isProfesor ? (
                      <View style={s.borradorPill}>
                        <Text style={s.borradorTxt}>Borrador</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: BG,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111' },
  createBtn: {
    backgroundColor: NAVY, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  createBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconBox: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  cardDesc:  { fontSize: 12, color: '#888', marginBottom: 6 },
  metaRow:   { flexDirection: 'row', gap: 6 },
  nivelPill: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  nivelTxt:  { fontSize: 11, fontWeight: '700' },
  borradorPill: {
    backgroundColor: '#FFF3E0', borderRadius: 6,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  borradorTxt: { fontSize: 11, fontWeight: '700', color: '#FF6F00' },
  chevron: { fontSize: 22, color: '#CCC' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySub:   { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 32 },
});
