import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getCursos } from '../services/cursosService';
import { Curso } from '../types';


const skills = [
  { name: 'Listening', pct: 85, color: '#4CAF7D', icon: '' },
  { name: 'Speaking',  pct: 62, color: '#8BC34A', icon: '' },
  { name: 'Reading',   pct: 78, color: '#90A4AE', icon: '' },
  { name: 'Writing',   pct: 45, color: '#78909C', icon: '' },
];

export default function HomeScreen({ navigation }: any) {
  const { userProfile, user } = useAuth();
  const [cursos, setCursos]         = useState<Curso[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isProfesor = userProfile?.tipo === 'profesor' || userProfile?.tipo === 'administrador';
  const firstName  = userProfile?.nombre?.split(' ')[0]
    ?? user?.user_metadata?.full_name?.split(' ')[0]
    ?? 'Usuario';

  const load = useCallback(async () => {
    if (!user) return;
    const tipo = userProfile?.tipo ?? 'estudiante';
    const { data } = await getCursos(tipo, user.id);
    setCursos(data.slice(0, 4)); // show max 4 recent in home
  }, [user, userProfile]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString('es-ES', {
    month: 'short', day: 'numeric', weekday: 'long',
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <View style={s.dateRow}>
              <Text style={s.dateIcon}>☁️</Text>
              <Text style={s.date}>{today}</Text>
            </View>
            <Text style={s.greet}>{`Buenos días,\n${firstName}`}</Text>
          </View>
          <View style={s.avatarWrap}>
            <Text style={s.avatarTxt}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Level + skills card */}
        <View style={s.mainCard}>
          <View style={s.levelRow}>
            <View style={s.levelIconWrap}>
              <Text style={{ fontSize: 16 }}></Text>
            </View>
            <View>
              <Text style={s.levelLabel}>Aprendizaje actual</Text>
              <Text style={s.levelValue}>
                {userProfile?.nivel ? `Nivel ${userProfile.nivel}` : 'Nivel no asignado'}
                {isProfesor ? `  ·  ${userProfile?.tipo === 'administrador' ? 'Administrador' : 'Profesor'}` : ''}
              </Text>
            </View>
          </View>
          <View style={s.divider} />
          {skills.map(sk => (
            <View key={sk.name} style={s.skillRow}>
              <View style={s.skillLabelRow}>
                <View style={s.skillLeft}>
                  <Text style={s.skillIcon}>{sk.icon}</Text>
                  <Text style={s.skillName}>{sk.name}</Text>
                </View>
                <Text style={s.skillPct}>{sk.pct}%</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${sk.pct}%` as any, backgroundColor: sk.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Quick actions for profesor/admin */}
        {isProfesor && (
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.actionBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('LessonsTab', { screen: 'CrearCurso' })}
            >
              <Text style={s.actionIcon}>+</Text>
              <Text style={s.actionTxt}>Crear curso</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#1E3A2F' }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('LessonsTab', { screen: 'CursosList' })}
            >
              <Text style={s.actionIcon}></Text>
              <Text style={s.actionTxt}>Mis cursos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Continue button (for students only) */}
        {!isProfesor && (
          <TouchableOpacity
            style={s.continueCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('LessonsTab', { screen: 'CursosList' })}
          >
            <View style={s.continuePlayBtn}>
              <Text style={{ color: '#fff', fontSize: 18 }}>▶</Text>
            </View>
            <Text style={s.continueTitle}>Continuar{'\n'}Curso</Text>
            <Text style={s.continueSub}>Ver todos los cursos</Text>
          </TouchableOpacity>
        )}

        {/* Recent courses */}
        <Text style={s.sectionTitle}>Cursos recientes</Text>

        {loading ? (
          <ActivityIndicator color="#2B4C72" style={{ marginTop: 20 }} />
        ) : cursos.length === 0 ? (
          <View style={s.emptyRow}>
            <Text style={s.emptyTxt}>
              {isProfesor ? 'Aún no has creado cursos' : 'No hay cursos disponibles aún'}
            </Text>
          </View>
        ) : (
          cursos.map(c => (
            <TouchableOpacity
              key={c.id}
              style={s.courseRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('LessonsTab', {
                screen: 'Curso',
                params: { cursoId: c.id, titulo: c.titulo },
              })}
            >
              <View style={s.courseIcon}>
                <Text style={{ fontSize: 18 }}></Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.courseName} numberOfLines={1}>{c.titulo}</Text>
                <Text style={s.courseMeta}>
                  {c.nivel ?? 'Sin nivel'}{!c.publicado ? '  ·  Borrador' : ''}
                </Text>
              </View>
              <View style={s.courseBtn}>
                <Text style={s.courseBtnTxt}>Ver</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ECEEF0' },
  content: { padding: 20 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  dateRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  dateIcon: { fontSize: 12 },
  date:     { fontSize: 12, color: '#666', fontWeight: '500' },
  greet:    { fontSize: 28, fontWeight: '800', color: '#111', lineHeight: 34 },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },

  mainCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  levelRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  levelIconWrap:  { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  levelLabel:     { fontSize: 11, color: '#999', marginBottom: 2 },
  levelValue:     { fontSize: 14, fontWeight: '700', color: '#111' },
  divider:        { height: 1, backgroundColor: '#F0F0F0', marginBottom: 14 },

  skillRow:       { marginBottom: 12 },
  skillLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  skillLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillIcon:      { fontSize: 14 },
  skillName:      { fontSize: 13, color: '#444' },
  skillPct:       { fontSize: 12, color: '#111', fontWeight: '600' },
  barTrack:       { height: 5, backgroundColor: '#F0F0F0', borderRadius: 100 },
  barFill:        { height: 5, borderRadius: 100 },

  // Professor quick actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1, backgroundColor: '#1E2A3A',
    borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
  },
  actionIcon: { fontSize: 22 },
  actionTxt:  { fontSize: 12, fontWeight: '700', color: '#fff' },

  continueCard: {
    width: 160, backgroundColor: '#1E2A3A',
    borderRadius: 16, padding: 18, marginBottom: 24,
  },
  continuePlayBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2E7D5E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  continueTitle: { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 24, marginBottom: 8 },
  continueSub:   { fontSize: 12, color: '#8899AA' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 12 },
  courseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  courseIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  courseName: { fontSize: 13, fontWeight: '600', color: '#111', marginBottom: 2 },
  courseMeta: { fontSize: 11, color: '#999' },
  courseBtn:  { backgroundColor: '#F0F0F0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  courseBtnTxt: { fontSize: 12, fontWeight: '600', color: '#555' },

  emptyRow: { alignItems: 'center', paddingVertical: 24 },
  emptyTxt: { fontSize: 13, color: '#999' },
});
