import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  getSecciones, getProgresoPorCurso, inicializarProgreso,
} from '../services/cursosService';
import { Seccion, ProgresoUsuario, EstadoSeccion } from '../types';

type SeccionConEstado = Seccion & { estado: EstadoSeccion };

export default function CursoScreen({ navigation, route }: any) {
  const { cursoId, titulo } = route?.params ?? {};
  const { user } = useAuth();

  const [secciones, setSecciones]   = useState<SeccionConEstado[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!cursoId || !user) return;

    const [{ data: todasSecciones }, { data: progreso }] = await Promise.all([
      getSecciones(cursoId),
      getProgresoPorCurso(user.id, cursoId),
    ]);

    // Only show root-level sections in this view
    const raices = todasSecciones.filter(s => s.parent_id === null);

    // If student has no progress at all, initialize first section as active
    if (progreso.length === 0 && raices.length > 0) {
      await inicializarProgreso(user.id, cursoId);
      progreso.push({ id: '', usuario_id: user.id, seccion_id: raices[0].id, estado: 'active', completado_en: null });
    }

    const progresoMap: Record<string, EstadoSeccion> = {};
    (progreso as ProgresoUsuario[]).forEach(p => { progresoMap[p.seccion_id] = p.estado; });

    const conEstado: SeccionConEstado[] = raices.map(s => ({
      ...s,
      estado: progresoMap[s.id] ?? 'locked',
    }));

    setSecciones(conEstado);
  }, [cursoId, user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2B4C72" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{titulo ?? 'Curso'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {secciones.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>Este curso aún no tiene secciones</Text>
          </View>
        ) : (
          secciones.map((sec, i) => {
            const isActive = sec.estado === 'active';
            const isDone   = sec.estado === 'done';
            const isLocked = sec.estado === 'locked';

            return (
              <TouchableOpacity
                key={sec.id}
                style={[s.row, isActive && s.rowActive]}
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
                <Text style={[s.num, isActive && s.numActive]}>Parte {i + 1}</Text>

                <View style={[
                  s.dot,
                  isDone   && s.dotDone,
                  isActive && s.dotActive,
                  isLocked && s.dotLocked,
                ]} />

                <Text style={[s.name, isActive && s.nameActive, isLocked && s.nameLocked]}>
                  {sec.titulo}
                </Text>

                {isActive ? (
                  <View style={s.playBtn}>
                    <Text style={{ color: '#fff', fontSize: 13 }}>▶</Text>
                  </View>
                ) : (
                  <Text style={[s.chevron, isLocked && s.chevronLocked]}>›</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ACTIVE_BG = '#1E2D3D';

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

  content: { paddingHorizontal: 16, paddingTop: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 18, marginBottom: 8,
  },
  rowActive: { backgroundColor: ACTIVE_BG },

  num:       { fontSize: 12, color: '#AAA', width: 50 },
  numActive: { color: '#8899AA' },

  dot:       { width: 12, height: 12, borderRadius: 6 },
  dotDone:   { backgroundColor: '#E8A09A' },
  dotActive: { backgroundColor: '#E07070' },
  dotLocked: { backgroundColor: '#DDB8B5' },

  name:       { flex: 1, fontSize: 14, fontWeight: '500', color: '#222' },
  nameActive: { color: '#fff', fontWeight: '600' },
  nameLocked: { color: '#BBB' },

  playBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center',
  },
  chevron:       { fontSize: 20, color: '#888', fontWeight: '300' },
  chevronLocked: { color: '#CCC' },

  empty:    { alignItems: 'center', paddingTop: 60 },
  emptyTxt: { fontSize: 14, color: '#999' },
});
