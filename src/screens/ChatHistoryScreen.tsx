import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  ensureVlingoUser,
  fetchSessions,
  deleteSession,
  getSavedSessionId,
  type ChatSession,
} from '../lib/api';

function formatDate(iso: string): string {
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  const now  = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7)   return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sessionTitle(index: number, total: number): string {
  return `Conversación ${total - index}`;
}

type Props = { navigation: any };

export default function ChatHistoryScreen({ navigation }: Props) {
  const { user } = useAuth();

  const [sessions,    setSessions]    = useState<ChatSession[]>([]);
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [status,      setStatus]      = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setStatus('loading');
    try {
      const name =
        (user.user_metadata?.full_name as string | undefined) ??
        user.email?.split('@')[0] ??
        'Usuario';
      const uid  = await ensureVlingoUser(name, user.email ?? undefined);
      setUserId(uid);

      const [list, saved] = await Promise.all([
        fetchSessions(uid),
        getSavedSessionId(),
      ]);

      setSessions(list);
      setActiveId(saved);
      setStatus('ready');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Error al cargar el historial');
      setStatus('error');
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = (session: ChatSession) => {
    Alert.alert(
      'Eliminar conversación',
      `¿Eliminar esta conversación y todos sus mensajes? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => handleDelete(session),
        },
      ],
    );
  };

  const handleDelete = async (session: ChatSession) => {
    if (!userId) return;
    setDeletingId(session.id);
    try {
      await deleteSession(session.id, userId);
      setSessions(prev => prev.filter(s => s.id !== session.id));
      if (activeId === session.id) setActiveId(null);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo eliminar la conversación');
    } finally {
      setDeletingId(null);
    }
  };

  const openSession = (sessionId: string) => {
    navigation.navigate('ChatConversation', { sessionId });
  };

  const openNew = () => {
    navigation.navigate('ChatConversation', { fresh: true });
  };

  const renderItem = ({ item, index }: { item: ChatSession; index: number }) => {
    const isActive  = item.id === activeId;
    const isDeleting = item.id === deletingId;

    return (
      <TouchableOpacity
        style={[s.row, isActive && s.rowActive]}
        onPress={() => openSession(item.id)}
        activeOpacity={0.7}
        disabled={isDeleting}
      >
        {/* Ícono */}
        <View style={[s.iconWrap, isActive && s.iconWrapActive]}>
          <Ionicons
            name="chatbubble-ellipses"
            size={20}
            color={isActive ? '#fff' : '#2B4C72'}
          />
        </View>

        {/* Texto */}
        <View style={s.rowText}>
          <View style={s.rowTitleRow}>
            <Text style={[s.rowTitle, isActive && s.rowTitleActive]} numberOfLines={1}>
              {sessionTitle(index, sessions.length)}
            </Text>
            {isActive && (
              <View style={s.activePill}>
                <Text style={s.activePillText}>Activa</Text>
              </View>
            )}
          </View>
          <Text style={s.rowMeta}>
            {formatDate(item.last_active)} · {item.message_count}{' '}
            {item.message_count === 1 ? 'mensaje' : 'mensajes'}
          </Text>
        </View>

        {/* Eliminar */}
        {isDeleting ? (
          <ActivityIndicator size="small" color="#E05A4E" style={{ marginLeft: 8 }} />
        ) : (
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => confirmDelete(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={18} color="#E05A4E" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Conversaciones</Text>
        <TouchableOpacity
          style={s.newBtn}
          onPress={openNew}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.newBtnText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Estados */}
      {status === 'loading' && (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2B4C72" />
          <Text style={s.centerText}>Cargando conversaciones...</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={48} color="#CCC" />
          <Text style={s.centerTitle}>Sin conexión</Text>
          <Text style={s.centerText}>{errorMsg}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'ready' && sessions.length === 0 && (
        <View style={s.center}>
          <Ionicons name="chatbubbles-outline" size={56} color="#CCC" />
          <Text style={s.centerTitle}>Sin conversaciones aún</Text>
          <Text style={s.centerText}>
            Toca "Nueva" para empezar a practicar con el asistente de inglés.
          </Text>
          <TouchableOpacity style={s.startBtn} onPress={openNew}>
            <Text style={s.startBtnText}>Iniciar conversación</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'ready' && sessions.length > 0 && (
        <FlatList
          data={sessions}
          keyExtractor={s => s.id}
          renderItem={renderItem}
          contentContainerStyle={st.list}
          ItemSeparatorComponent={() => <View style={st.sep} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const NAVY = '#2B4C72';
const BG   = '#F2F4F6';

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: BG,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: NAVY,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  centerTitle: { fontSize: 17, fontWeight: '700', color: '#444', textAlign: 'center' },
  centerText:  { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  startBtn: {
    marginTop: 12,
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  startBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowActive: {
    backgroundColor: 'rgba(43,76,114,0.06)',
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(43,76,114,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: NAVY },
  rowText:  { flex: 1 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  rowTitleActive: { color: NAVY },
  activePill: {
    backgroundColor: 'rgba(43,76,114,0.12)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: { fontSize: 10, fontWeight: '700', color: NAVY },
  rowMeta: { fontSize: 12, color: '#999' },
  deleteBtn: { padding: 4 },
});

const st = StyleSheet.create({
  list: { paddingVertical: 8 },
  sep:  { height: 1, backgroundColor: '#F0F0F0', marginLeft: 72 },
});
