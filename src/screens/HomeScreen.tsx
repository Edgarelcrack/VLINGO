import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '../theme';

const skills = [
  { name: 'Listening', pct: 85, color: '#4CAF7D', icon: '' },
  { name: 'Speaking',  pct: 62, color: '#8BC34A', icon: '' },
  { name: 'Reading',   pct: 78, color: '#90A4AE', icon: '' },
  { name: 'Writing',   pct: 45, color: '#78909C', icon: '' },
];

const recent = [
  { name: 'Business Vocabulary', parts: 17, icon: '' },
  { name: 'Travel Vocabulary',   parts: 15, icon: '' },
  { name: 'Grammar: Past Tense', parts: 20, icon: '' },
];

export default function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <View style={s.dateRow}>
              <Text style={s.dateIcon}>☁️</Text>
              <Text style={s.date}>Feb 9, Lunes</Text>
            </View>
            <Text style={s.greet}>{'Good Morning,\nUser'}</Text>
          </View>
          <View style={s.avatar} />
        </View>


        <View style={s.mainCard}>
          {/* Level row */}
          <View style={s.levelRow}>
            <View style={s.levelIconWrap}>
              <Text style={{ fontSize: 16 }}>📋</Text>
            </View>
            <View>
              <Text style={s.levelLabel}>Aprendizaje actual</Text>
              <Text style={s.levelValue}>Nivel B2</Text>
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

        <TouchableOpacity
          style={s.continueCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('LessonsTab', { screen: 'Parte' })}
        >
          <View style={s.continuePlayBtn}>
            <Text style={{ color: '#fff', fontSize: 18 }}>▶</Text>
          </View>
          <Text style={s.continueTitle}>Continuar{'\n'}Curso</Text>
          <Text style={s.continueSub}>Unidad 4: Travel</Text>
        </TouchableOpacity>

        <Text style={s.sectionTitle}>Cursos recientes</Text>
        {recent.map(c => (
          <TouchableOpacity
            key={c.name}
            style={s.courseRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('LessonsTab', { screen: 'Curso' })}
          >
            <View style={s.courseIcon}>
              <Text style={{ fontSize: 18 }}>{c.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.courseName}>{c.name}</Text>
              <Text style={s.courseParts}>{c.parts} Partes</Text>
            </View>
            <View style={s.courseBtn}>
              <Text style={s.courseBtnTxt}>Ver</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ECEEF0' },
  content: { padding: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  dateIcon: { fontSize: 12 },
  date: { fontSize: 12, color: '#666', fontWeight: '500' },
  greet: { fontSize: 28, fontWeight: '800', color: '#111', lineHeight: 34 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#D9523A' },

  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  levelIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  levelLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  levelValue: { fontSize: 14, fontWeight: '700', color: '#111' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 14 },

  skillRow: { marginBottom: 12 },
  skillLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  skillLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillIcon: { fontSize: 14 },
  skillName: { fontSize: 13, color: '#444' },
  skillPct: { fontSize: 12, color: '#111', fontWeight: '600' },
  barTrack: { height: 5, backgroundColor: '#F0F0F0', borderRadius: 100 },
  barFill: { height: 5, borderRadius: 100 },

  continueCard: {
    width: 160,
    backgroundColor: '#1E2A3A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  continuePlayBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2E7D5E',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  continueTitle: {
    fontSize: 18, fontWeight: '800', color: '#fff',
    lineHeight: 24, marginBottom: 8,
  },
  continueSub: { fontSize: 12, color: '#8899AA' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 12 },
  courseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  courseIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  courseName: { fontSize: 13, fontWeight: '600', color: '#111', marginBottom: 2 },
  courseParts: { fontSize: 11, color: '#999' },
  courseBtn: {
    backgroundColor: '#F0F0F0', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  courseBtnTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
});