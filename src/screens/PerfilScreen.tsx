import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const STATS = [
  { num: '24',  label: 'Días\nactivo' },
  { num: '142', label: 'Lecciones\nhechas' },
  { num: '87%', label: 'Precisión\npromedio' },
];

const BADGES = [
  { label: 'Primera semana', earned: true },
  { label: 'Conversador',    earned: true },
  { label: 'Racha 30d',      earned: false },
  { label: 'Escritor',       earned: true },
  { label: 'Perfecto',       earned: false },
];

const SETTINGS = [
  { label: 'Idioma de la interfaz', icon: '' },
  { label: 'Notificaciones',        icon: '' },
  { label: 'Meta diaria',           icon: '' },
  { label: 'Acerca de VLINGO',      icon: 'ℹ' },
];

const MINI = [
  { name: 'Introducción',            done: true,  active: false },
  { name: 'Workplace Communication', done: false, active: true  },
  { name: 'Email Etiquette',         done: false, active: false },
  { name: 'Meeting Vocabulary',      done: false, active: false },
];

const NAVY = '#1E2D3D';
const BG   = '#F2F4F6';
const WHITE = '#fff';

const TIPO_LABEL: Record<string, string> = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  administrador: 'Administrador',
};

export default function PerfilScreen() {
  const { signOut, user, userProfile, reclamarProfesor } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [codigo, setCodigo]             = useState('');
  const [claiming, setClaiming]         = useState(false);

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

  const displayName = userProfile?.nombre
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();
  const nivelTxt = userProfile?.nivel
    ? `Nivel ${userProfile.nivel} · ${TIPO_LABEL[userProfile.tipo] ?? 'Estudiante'}`
    : TIPO_LABEL[userProfile?.tipo ?? 'estudiante'] ?? 'Estudiante';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.profileTop}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initial}</Text>
          </View>
          <Text style={s.name}>{displayName}</Text>
          {user?.email ? <Text style={s.email}>{user.email}</Text> : null}
          <View style={s.levelPill}>
            <Text style={s.levelPillTxt}>{nivelTxt}</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          {STATS.map(st => (
            <View key={st.label} style={s.statCard}>
              <Text style={s.statNum}>{st.num}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
        <Text style={s.section}>LOGROS</Text>
        <View style={s.badgeWrap}>
          {BADGES.map(b => (
            <View key={b.label} style={[s.badge, b.earned && s.badgeEarned]}>
              <Text style={[s.badgeTxt, b.earned && { color: '#2B4C72' }]}>{b.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>CURSO ACTIVO</Text>
        <View style={s.listCard}>
          {MINI.map((p, i) => (
            <View key={p.name} style={[
              s.listRow,
              p.active && s.listRowActive,
              i === MINI.length - 1 && { borderBottomWidth: 0 },
            ]}>
              <Text style={[s.miniNum, p.active && { color: '#8899AA' }]}>
                Parte {i + 1}
              </Text>
              <View style={[
                s.dot,
                p.done   && s.dotDone,
                p.active && s.dotActive,
                !p.done && !p.active && s.dotLocked,
              ]} />
              <Text style={[
                s.miniName,
                p.active && { color: '#fff', fontWeight: '600' },
                !p.done && !p.active && { color: '#BBB' },
              ]}>
                {p.name}
              </Text>
              {p.active && (
                <View style={s.playBtn}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>▶</Text>
                </View>
              )}
              {!p.active && (
                <Text style={{ color: p.done ? '#888' : '#CCC', fontSize: 20 }}>›</Text>
              )}
            </View>
          ))}
        </View>

        {/* Settings */}
        <Text style={s.section}>CONFIGURACIÓN</Text>
        <View style={s.settingsCard}>
          {SETTINGS.map((st, i) => (
            <TouchableOpacity
              key={st.label}
              style={[s.settRow, i === SETTINGS.length - 1 && { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
            >
              <View style={s.settIcon}>
                <Text style={{ fontSize: 16 }}>{st.icon}</Text>
              </View>
              <Text style={s.settLabel}>{st.label}</Text>
              <Text style={{ color: '#AAA', fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reclamar rol profesor */}
        {userProfile?.tipo === 'estudiante' && (
          <TouchableOpacity style={s.profesorBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Text style={s.profesorBtnTxt}>Tengo código de profesor</Text>
          </TouchableOpacity>
        )}

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={s.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal código de invitación */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Activar rol de Profesor</Text>
            <Text style={s.modalSub}>Ingresa tu código de invitación</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Código de invitación"
              placeholderTextColor="#BBB"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[s.modalBtn, claiming && { opacity: 0.7 }]}
              onPress={handleReclamarProfesor}
              disabled={claiming}
              activeOpacity={0.85}
            >
              {claiming
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.modalBtnTxt}>Activar</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalVisible(false); setCodigo(''); }} style={{ marginTop: 12 }}>
              <Text style={{ textAlign: 'center', color: '#999', fontSize: 13 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  // Profile top
  profileTop: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarTxt: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 4 },
  email: { fontSize: 12, color: '#888', marginBottom: 10 },
  levelPill: {
    backgroundColor: 'rgba(43,76,114,0.12)',
    borderRadius: 100,
    paddingVertical: 5, paddingHorizontal: 16,
  },
  levelPillTxt: { fontSize: 12, color: '#2B4C72', fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: WHITE,
    borderRadius: 12, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#2B4C72', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700', textAlign: 'center' },

  section: {
    fontSize: 11, color: '#AAA',
    letterSpacing: 1.2, fontWeight: '700',
    textTransform: 'uppercase', marginBottom: 10,
  },


  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  badge: {
    backgroundColor: WHITE, borderWidth: 1, borderColor: '#E8E8E8',
    borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12,
  },
  badgeEarned: { borderColor: 'rgba(43,76,114,0.35)', backgroundColor: 'rgba(43,76,114,0.05)' },
  badgeTxt: { fontSize: 11, color: '#AAA' },

  listCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  listRowActive: { backgroundColor: NAVY },

  miniNum: { fontSize: 12, color: '#AAA', width: 50 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotDone:   { backgroundColor: '#C9A09A' },
  dotActive: { backgroundColor: '#E07070' },
  dotLocked: { backgroundColor: '#DDB8B5' },
  miniName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#222' },
  playBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center',
  },


  settingsCard: {
    backgroundColor: WHITE, borderRadius: 12,
    paddingHorizontal: 16, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  settRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  settIcon: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  settLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: '#222' },


  signOutBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: WHITE, borderWidth: 1, borderColor: 'rgba(224,90,78,0.25)',
    borderRadius: 12, height: 48,
  },
  signOutText: { fontSize: 14, fontWeight: '700', color: '#E05A4E' },

  profesorBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: WHITE, borderWidth: 1, borderColor: 'rgba(43,76,114,0.3)',
    borderRadius: 12, height: 48, marginBottom: 12,
  },
  profesorBtnTxt: { fontSize: 14, fontWeight: '700', color: NAVY },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: WHITE, borderRadius: 16,
    padding: 24, width: '100%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 4 },
  modalSub:   { fontSize: 13, color: '#888', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: '#111', marginBottom: 16,
  },
  modalBtn: {
    backgroundColor: NAVY, borderRadius: 10,
    height: 48, alignItems: 'center', justifyContent: 'center',
  },
  modalBtnTxt: { fontSize: 14, fontWeight: '700', color: WHITE },
});