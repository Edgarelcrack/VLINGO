import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '../theme';

type Status = 'done' | 'active' | 'locked';

const PARTES: { name: string; status: Status }[] = [
  { name: 'Nombre de tema 1', status: 'done'   },
  { name: 'Nombre de tema 2', status: 'active' },
  { name: 'Nombre de tema 3', status: 'locked' },
  { name: 'Nombre de tema 4', status: 'active' },
  { name: 'Nombre de tema 5', status: 'locked' },
  { name: 'Nombre de tema 6', status: 'active' },
  { name: 'Nombre de tema 7', status: 'locked' },
  { name: 'Nombre de tema 8', status: 'active' },
  { name: 'Nombre de tema 9', status: 'locked' },
];

export default function CursoScreen({ navigation }: any) {
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
        {PARTES.map((p, i) => {
          const isActive = p.status === 'active';
          const isDone   = p.status === 'done';
          const isLocked = p.status === 'locked';

          return (
            <TouchableOpacity
              key={i}
              style={[s.row, isActive && s.rowActive]}
              activeOpacity={isLocked ? 1 : 0.75}
              onPress={() => !isLocked && navigation.navigate('Parte')}
            >
              <Text style={[s.num, isActive && s.numActive]}>Parte {i + 1}</Text>

              <View style={[
                s.dot,
                isDone   && s.dotDone,
                isActive && s.dotActive,
                isLocked && s.dotLocked,
              ]} />

              <Text style={[s.name, isActive && s.nameActive, isLocked && s.nameLocked]}>
                {p.name}
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
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ACTIVE_BG = '#1E2D3D'; 

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F4F6' },


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


  content: { paddingHorizontal: 16, paddingTop: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 8,
  },
  rowActive: {
    backgroundColor: ACTIVE_BG,
  },


  num: { fontSize: 12, color: '#AAA', width: 50 },
  numActive: { color: '#8899AA' },


  dot: { width: 12, height: 12, borderRadius: 6 },
  dotDone:   { backgroundColor: '#E8A09A' },   // soft red/salmon — done
  dotActive: { backgroundColor: '#E07070' },   // stronger red — active
  dotLocked: { backgroundColor: '#DDB8B5' },   // pale — locked


  name: { flex: 1, fontSize: 14, fontWeight: '500', color: '#222' },
  nameActive: { color: '#fff', fontWeight: '600' },
  nameLocked: { color: '#BBB' },

  playBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center',
  },


  chevron: { fontSize: 20, color: '#888', fontWeight: '300' },
  chevronLocked: { color: '#CCC' },
});