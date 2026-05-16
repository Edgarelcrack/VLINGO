import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal,
  ActivityIndicator, Animated, Easing, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getEstadisticasUsuario, EstadisticasUsuario } from '../services/cursosService';

const NAVY     = '#2B4C72';
const NAVY_DK  = '#1E2D3D';
const GOLD     = '#B8860B';
const BG       = '#F2F4F6';
const WHITE    = '#fff';

const TIPO_LABEL: Record<string, string> = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  administrador: 'Administrador',
};

type Logro = {
  id: string;
  label: string;
  icon: any;
  color: string;
  earned: boolean;
};

function buildLogros(xp: number, lecciones: number): Logro[] {
  return [
    { id: 'xp10',   label: 'Primer paso',    icon: 'footsteps',  color: '#4CAF7D', earned: xp >= 10 },
    { id: 'xp50',   label: 'En camino',      icon: 'rocket',     color: '#FFA726', earned: xp >= 50 },
    { id: 'xp100',  label: 'Dedicado',       icon: 'flame',      color: '#E07070', earned: xp >= 100 },
    { id: 'xp250',  label: 'Imparable',      icon: 'star',       color: GOLD,      earned: xp >= 250 },
    { id: 'lec5',   label: '5 lecciones',    icon: 'book',       color: NAVY,      earned: lecciones >= 5 },
    { id: 'lec20',  label: 'Constante',      icon: 'school',     color: '#AB47BC', earned: lecciones >= 20 },
  ];
}

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

export default function PerfilScreen({ navigation }: any) {
  const { signOut, user, userProfile, reclamarProfesor } = useAuth();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [codigo, setCodigo]             = useState('');
  const [claiming, setClaiming]         = useState(false);
  const [stats, setStats]               = useState<EstadisticasUsuario>({ leccionesCompletadas: 0, cursoActivo: null });
  const [refreshing, setRefreshing]     = useState(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    const data = await getEstadisticasUsuario(user.id);
    setStats(data);
  }, [user]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  const handleReclamarProfesor = async () => {
    if (!codigo.trim()) return;
    setClaiming(true);
    const { error } = await reclamarProfesor(codigo.trim());
    setClaiming(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setModalVisible(false);
      setCodigo('');
      Alert.alert('¡Listo!', 'Tu cuenta ahora tiene rol de Profesor.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'Acerca de VLINGO',
      'VLINGO v1.0.0\nUna app para aprender idiomas con cursos, lecciones y ejercicios interactivos.',
      [{ text: 'OK' }]
    );
  };

  const displayName = userProfile?.nombre
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();
  const tipoLabel = TIPO_LABEL[userProfile?.tipo ?? 'estudiante'] ?? 'Estudiante';

  const xp        = userProfile?.xp_total ?? 0;
  const lecciones = stats.leccionesCompletadas;
  const fechaReg  = userProfile?.fecha_registro;
  const dias = fechaReg
    ? Math.max(1, Math.floor((Date.now() - new Date(fechaReg).getTime()) / 86_400_000) + 1)
    : 1;

  const logros        = buildLogros(xp, lecciones);
  const logrosGanados = logros.filter(l => l.earned).length;

  const cursoActivo = stats.cursoActivo;
  const cursoPct = cursoActivo && cursoActivo.totalRaices > 0
    ? Math.round((cursoActivo.raicesCompletadas / cursoActivo.totalRaices) * 100)
    : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HERO */}
        <FadeInView>
          <View style={s.hero}>
            <View style={s.avatarRing}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{initial}</Text>
              </View>
            </View>
            <Text style={s.name} numberOfLines={1}>{displayName}</Text>
            {user?.email ? <Text style={s.email} numberOfLines={1}>{user.email}</Text> : null}

            <View style={s.pillsRow}>
              {userProfile?.nivel ? (
                <View style={s.nivelPill}>
                  <Ionicons name="school" size={11} color="#fff" />
                  <Text style={s.nivelPillTxt}>Nivel {userProfile.nivel}</Text>
                </View>
              ) : null}
              <View style={s.tipoPill}>
                <Ionicons
                  name={userProfile?.tipo === 'profesor' ? 'briefcase' : userProfile?.tipo === 'administrador' ? 'shield-checkmark' : 'person'}
                  size={11}
                  color="rgba(255,255,255,0.85)"
                />
                <Text style={s.tipoPillTxt}>{tipoLabel}</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* STATS */}
        <FadeInView delay={80}>
          <View style={s.statsRow}>
            <StatCard
              icon="flash"
              iconColor={GOLD}
              iconBg="rgba(184,134,11,0.12)"
              value={`${xp}`}
              label="XP total"
            />
            <StatCard
              icon="checkmark-done"
              iconColor="#2E7D52"
              iconBg="rgba(46,125,82,0.12)"
              value={`${lecciones}`}
              label="Lecciones"
            />
            <StatCard
              icon="calendar"
              iconColor={NAVY}
              iconBg="rgba(43,76,114,0.12)"
              value={`${dias}`}
              label={dias === 1 ? 'Día' : 'Días'}
            />
          </View>
        </FadeInView>

        {/* CONTINUAR APRENDIENDO */}
        {cursoActivo && (
          <FadeInView delay={140}>
            <TouchableOpacity
              style={s.continueCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('LessonsTab', {
                screen: 'Curso',
                params: { cursoId: cursoActivo.cursoId, titulo: cursoActivo.cursoTitulo },
              })}
            >
              <View style={s.continueIcon}>
                <Ionicons name="play" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.continueLabel}>Continuar aprendiendo</Text>
                <Text style={s.continueTitle} numberOfLines={1}>{cursoActivo.cursoTitulo}</Text>
                <View style={s.continueBarTrack}>
                  <View style={[s.continueBarFill, { width: `${cursoPct}%` as any }]} />
                </View>
                <Text style={s.continueMeta}>
                  {cursoActivo.raicesCompletadas} de {cursoActivo.totalRaices} {cursoActivo.totalRaices === 1 ? 'parte' : 'partes'} · {cursoPct}%
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          </FadeInView>
        )}

        {/* LOGROS */}
        <FadeInView delay={200}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Logros</Text>
            <Text style={s.sectionCount}>{logrosGanados}/{logros.length}</Text>
          </View>
          <View style={s.logrosGrid}>
            {logros.map(l => (
              <View
                key={l.id}
                style={[s.logroCard, l.earned ? { borderColor: l.color } : s.logroLocked]}
              >
                <View style={[
                  s.logroIcon,
                  l.earned ? { backgroundColor: `${l.color}1F` } : { backgroundColor: '#F0F0F0' },
                ]}>
                  <Ionicons
                    name={l.earned ? l.icon : 'lock-closed'}
                    size={18}
                    color={l.earned ? l.color : '#BBB'}
                  />
                </View>
                <Text style={[
                  s.logroLabel,
                  l.earned ? { color: '#111' } : { color: '#BBB' },
                ]} numberOfLines={1}>
                  {l.label}
                </Text>
              </View>
            ))}
          </View>
        </FadeInView>

        {/* INFO */}
        <FadeInView delay={260}>
          <TouchableOpacity style={s.infoRow} onPress={handleAbout} activeOpacity={0.7}>
            <View style={s.infoIcon}>
              <Ionicons name="information-circle-outline" size={18} color={NAVY} />
            </View>
            <Text style={s.infoLabel}>Acerca de VLINGO</Text>
            <Ionicons name="chevron-forward" size={18} color="#BBB" />
          </TouchableOpacity>
        </FadeInView>

        {/* ACCIONES */}
        <FadeInView delay={320}>
          <View style={{ marginTop: 14 }}>
            {userProfile?.tipo === 'estudiante' && (
              <TouchableOpacity
                style={s.profesorBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="key" size={16} color={NAVY} />
                <Text style={s.profesorBtnTxt}>Tengo código de profesor</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color="#E05A4E" />
              <Text style={s.signOutTxt}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </FadeInView>
      </ScrollView>

      {/* Modal código de invitación */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={m.overlay}>
          <View style={m.card}>
            <View style={m.iconCircle}>
              <Ionicons name="key" size={22} color={NAVY} />
            </View>
            <Text style={m.title}>Activar rol de Profesor</Text>
            <Text style={m.sub}>Ingresa tu código de invitación</Text>
            <TextInput
              style={m.input}
              placeholder="Código de invitación"
              placeholderTextColor="#BBB"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[m.btnPrimary, (claiming || !codigo.trim()) && { opacity: 0.55 }]}
              onPress={handleReclamarProfesor}
              disabled={claiming || !codigo.trim()}
              activeOpacity={0.85}
            >
              {claiming
                ? <ActivityIndicator color="#fff" />
                : <Text style={m.btnPrimaryTxt}>Activar</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalVisible(false); setCodigo(''); }} style={{ marginTop: 10 }}>
              <Text style={m.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({
  icon, iconColor, iconBg, value, label,
}: {
  icon: any; iconColor: string; iconBg: string; value: string; label: string;
}) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  // Hero
  hero: {
    alignItems: 'center',
    backgroundColor: NAVY,
    borderRadius: 22,
    paddingVertical: 22, paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: NAVY, shadowOpacity: 0.20, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#FFD66A',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 28, fontWeight: '800', color: NAVY_DK },
  name:  { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, maxWidth: '90%', textAlign: 'center' },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },

  pillsRow: { flexDirection: 'row', gap: 6 },
  nivelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,214,106,0.20)',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  nivelPillTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },
  tipoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  tipoPillTxt: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: WHITE,
    borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700' },

  // Continue
  continueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: NAVY_DK, borderRadius: 16,
    padding: 16, marginBottom: 18,
    shadowColor: NAVY_DK, shadowOpacity: 0.20, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  continueIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#FFD66A',
    alignItems: 'center', justifyContent: 'center',
  },
  continueLabel: { fontSize: 10, color: '#FFD66A', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  continueTitle: { fontSize: 14, color: '#fff', fontWeight: '800', marginBottom: 8 },
  continueBarTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100, overflow: 'hidden', marginBottom: 6,
  },
  continueBarFill: { height: 5, backgroundColor: '#FFD66A', borderRadius: 100 },
  continueMeta: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },

  // Section
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#111', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionCount: {
    fontSize: 11, fontWeight: '800', color: NAVY,
    backgroundColor: 'rgba(43,76,114,0.10)',
    borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2,
  },

  // Logros
  logrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  logroCard: {
    width: '31.5%',
    backgroundColor: WHITE, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 8,
    alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  logroLocked: { borderColor: '#EFEFEF', backgroundColor: '#FAFAFB' },
  logroIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  logroLabel: { fontSize: 11, fontWeight: '700', color: '#111', textAlign: 'center' },

  // Info row
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  infoIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#222' },

  // Acciones
  profesorBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: WHITE, borderWidth: 1, borderColor: 'rgba(43,76,114,0.30)',
    borderRadius: 12, height: 48, marginBottom: 10,
  },
  profesorBtnTxt: { fontSize: 14, fontWeight: '700', color: NAVY },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: WHITE, borderWidth: 1, borderColor: 'rgba(224,90,78,0.25)',
    borderRadius: 12, height: 48,
  },
  signOutTxt: { fontSize: 14, fontWeight: '700', color: '#E05A4E' },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    backgroundColor: WHITE, borderRadius: 18,
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18, width: '100%',
    alignItems: 'stretch',
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 4 },
  sub:   { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: '#111', marginBottom: 14,
    textAlign: 'center', letterSpacing: 2,
  },
  btnPrimary: {
    backgroundColor: NAVY, borderRadius: 12,
    height: 48, alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryTxt: { fontSize: 14, fontWeight: '800', color: WHITE },
  cancelTxt: { textAlign: 'center', color: '#999', fontSize: 13, fontWeight: '600' },
});
