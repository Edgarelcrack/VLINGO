import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '../theme';

type Status = 'done' | 'active' | 'locked';

const PARTES: { num: number; name: string; status: Status; hasContent: boolean }[] = [
  { num: 1, name: 'Introducción',     status: 'done',   hasContent: true  },
  { num: 2, name: 'Nombre de tema 2', status: 'active', hasContent: false },
  { num: 3, name: 'Nombre de tema 3', status: 'locked', hasContent: false },
  { num: 4, name: 'Nombre de tema 4', status: 'active', hasContent: false },
];

const BODY = [
  'Bienvenido a la primera parte de la serie "Business English Fundamentals". Probablemente ya tengas conocimientos básicos de inglés general, pero el inglés de negocios tiene un enfoque diferente en vocabulario, formalidad y comunicación profesional.',
  'Así como cada empresa tiene su propia cultura organizacional, el inglés empresarial tiene sus propias expresiones, estructuras y normas de comunicación que se utilizan en reuniones, correos electrónicos, presentaciones y negociaciones.',
  'En esta primera parte comenzaremos tu camino para comunicarte con confianza en entornos profesionales internacionales. Este módulo te permitirá:',
];

const BULLETS = [
  'Comprender el vocabulario esencial del entorno corporativo',
  'Redactar correos electrónicos formales de manera adecuada',
  'Presentarte profesionalmente en reuniones y entrevistas',
  'Utilizar expresiones clave para conversaciones laborales',
];

const ACTIVE_BG = '#1E2D3D';

export default function ParteCursoScreen({ navigation }: any) {
  const [open, setOpen] = useState<number | null>(1);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Business Vocabulary</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {PARTES.map(p => {
          const isOpen   = open === p.num;
          const isActive = p.status === 'active';
          const isDone   = p.status === 'done';
          const isLocked = p.status === 'locked';

          return (
            <View key={p.num} style={[
              s.card,
              isActive && s.cardActive,
              isLocked && s.cardLocked,
            ]}>
              {/* Row header */}
              <TouchableOpacity
                style={s.cardTop}
                activeOpacity={isLocked ? 1 : 0.75}
                onPress={() => !isLocked && setOpen(isOpen ? null : p.num)}
              >
                <Text style={[s.cardNum, isActive && s.cardNumActive]}>Parte {p.num}</Text>

                <View style={[
                  s.dot,
                  isDone   && s.dotDone,
                  isActive && s.dotActive,
                  isLocked && s.dotLocked,
                ]} />

                <Text style={[
                  s.cardName,
                  isActive && s.cardNameActive,
                  isLocked && s.cardNameLocked,
                ]}>
                  {p.name}
                </Text>

                {isActive ? (
                  <View style={s.playBtn}>
                    <Text style={{ color: '#fff', fontSize: 12 }}>▶</Text>
                  </View>
                ) : isDone ? (
                  <Text style={s.chevron}>{isOpen ? '▼' : '›'}</Text>
                ) : (
                  <Text style={s.chevronLocked}>›</Text>
                )}
              </TouchableOpacity>

              {/* Expanded content */}
              {isOpen && p.hasContent && (
                <View style={s.expanded}>
                  {BODY.map((t, i) => (
                    <Text key={i} style={s.bodyText}>{t}</Text>
                  ))}
                  {BULLETS.map((b, i) => (
                    <View key={i} style={s.bulletRow}>
                      <Text style={s.bullet}>•</Text>
                      <Text style={s.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Chat shortcut */}
        <TouchableOpacity
          style={s.chatShortcut}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ChatTab')}
        >
          <View style={s.chatIcon}>
            <Text style={{ fontSize: 18 }}>💬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.chatTitle}>¿Tienes dudas?</Text>
            <Text style={s.chatSub}>Pregunta al asistente IA</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F4F6' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F2F4F6',
  },
  backBtn: { width: 32 },
  backArrow: { fontSize: 22, color: '#111' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardActive: { backgroundColor: ACTIVE_BG },
  cardLocked: { opacity: 0.55 },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },

  cardNum: { fontSize: 12, color: '#AAA', width: 50 },
  cardNumActive: { color: '#8899AA' },

  dot: { width: 12, height: 12, borderRadius: 6 },
  dotDone:   { backgroundColor: '#C9A09A' },
  dotActive: { backgroundColor: '#E07070' },
  dotLocked: { backgroundColor: '#DDB8B5' },

  cardName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#222' },
  cardNameActive: { color: '#fff', fontWeight: '600' },
  cardNameLocked: { color: '#BBB' },

  playBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center',
  },
  chevron: { fontSize: 20, color: '#888' },
  chevronLocked: { fontSize: 20, color: '#CCC' },

  // Expanded body (Parte 1 — done + open)
  expanded: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },
  bodyText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 21,
    marginBottom: 12,
  },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { color: '#555', fontSize: 13 },
  bulletText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },

  // Chat shortcut
  chatShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  chatIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center',
  },
  chatTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
  chatSub: { fontSize: 12, color: '#999' },
});