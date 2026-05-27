import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { actualizarNivel } from '../services/usuariosService';
import {
  PLACEMENT_QUESTIONS,
  PlacementQuestion,
  calcularNivel,
  NIVEL_DESCRIPCION,
  NivelCEFR,
} from '../data/placementQuestions';

const NAVY  = '#2B4C72';
const BG    = '#F2F4F6';
const WHITE = '#fff';

type Fase = 'intro' | 'preguntas' | 'guardando' | 'resultado';

const LETRAS = ['A', 'B', 'C', 'D'];

export default function PlacementScreen() {
  const { user, refreshProfile } = useAuth();

  const [fase, setFase]           = useState<Fase>('intro');
  const [idx, setIdx]             = useState(0);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [nivelFinal, setNivelFinal] = useState<NivelCEFR | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const preguntas: PlacementQuestion[] = PLACEMENT_QUESTIONS;
  const total = preguntas.length;
  const pregunta = preguntas[idx];
  const progreso = ((idx + 1) / total) * 100;

  const comenzar = () => {
    setFase('preguntas');
    setIdx(0);
    setSeleccion(null);
    setRespuestas({});
  };

  const confirmar = async () => {
    if (seleccion === null) return;
    const nuevasResp = { ...respuestas, [pregunta.id]: seleccion };
    setRespuestas(nuevasResp);

    const nivelActual = pregunta.nivel;
    const erradasNivel = preguntas
      .filter(p => p.nivel === nivelActual && nuevasResp[p.id] !== undefined)
      .filter(p => nuevasResp[p.id] !== p.respuesta_correcta).length;
    const nivelPerdido = erradasNivel >= 2;

    const esUltima = idx >= total - 1;

    if (!nivelPerdido && !esUltima) {
      setIdx(idx + 1);
      setSeleccion(null);
      return;
    }

    const nivel = calcularNivel(nuevasResp);
    setNivelFinal(nivel);
    setFase('guardando');
    setErrorMsg(null);

    if (!user) {
      setErrorMsg('No hay sesión activa');
      setFase('resultado');
      return;
    }

    const { error } = await actualizarNivel(user.id, nivel);
    if (error) {
      setErrorMsg(error);
      setFase('resultado');
      return;
    }

    setFase('resultado');
  };

  const finalizar = async () => {
    try {
      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo cargar tu perfil');
    }
  };

  if (fase === 'intro') {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.introContent} showsVerticalScrollIndicator={false}>
          <View style={s.logoCircle}>
            <Text style={s.logoTxt}>V</Text>
          </View>

          <Text style={s.introTitle}>Test de nivelación</Text>
          <Text style={s.introSubtitle}>
            Antes de empezar, vamos a evaluar tu nivel actual de inglés.
          </Text>

          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="help-circle" size={20} color={NAVY} />
              </View>
              <Text style={s.infoTxt}>
                <Text style={s.infoBold}>{total} preguntas</Text> de opción múltiple, de menor a mayor dificultad.
              </Text>
            </View>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="time-outline" size={20} color={NAVY} />
              </View>
              <Text style={s.infoTxt}>
                Toma alrededor de <Text style={s.infoBold}>5 minutos</Text>.
              </Text>
            </View>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="heart-outline" size={20} color={NAVY} />
              </View>
              <Text style={s.infoTxt}>
                Sé honesto. No hay penalización por equivocarse, y no podrás volver atrás.
              </Text>
            </View>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="trending-up-outline" size={20} color={NAVY} />
              </View>
              <Text style={s.infoTxt}>
                Tu progreso dentro de la app se ajustará a tu nivel desde el inicio.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={comenzar}>
            <Text style={s.primaryBtnTxt}>Comenzar test</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (fase === 'guardando') {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.centerCol}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={s.statusTxt}>Calculando tu nivel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fase === 'resultado' && nivelFinal) {
    const info = NIVEL_DESCRIPCION[nivelFinal];
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.resultContent} showsVerticalScrollIndicator={false}>
          <View style={s.resultIconWrap}>
            <Ionicons name="ribbon" size={48} color="#FFD66A" />
          </View>

          <Text style={s.resultLabel}>Tu nivel es</Text>
          <Text style={s.resultNivel}>{nivelFinal}</Text>
          <Text style={s.resultTitulo}>{info.titulo}</Text>

          <View style={s.resultCard}>
            <Text style={s.resultDesc}>{info.descripcion}</Text>
          </View>

          {errorMsg && (
            <View style={s.errorBox}>
              <Ionicons name="warning-outline" size={16} color="#C00" />
              <Text style={s.errorTxt}>
                Tu nivel se calculó pero hubo un problema al guardarlo: {errorMsg}
              </Text>
            </View>
          )}

          <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={finalizar}>
            <Text style={s.primaryBtnTxt}>Comenzar a aprender</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Progreso */}
      <View style={s.progressBar}>
        <View style={s.progressTop}>
          <Text style={s.progressTxt}>
            Pregunta {idx + 1} de {total}
          </Text>
          <Text style={s.progressPct}>{Math.round(progreso)}%</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progreso}%` as any }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.questionContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.questionEnunciado}>{pregunta.enunciado}</Text>

        <View style={{ marginTop: 24 }}>
          {pregunta.opciones.map((op, i) => {
            const isSelected = seleccion === i;
            return (
              <TouchableOpacity
                key={i}
                style={[s.opcion, isSelected && s.opcionSelected]}
                activeOpacity={0.75}
                onPress={() => setSeleccion(i)}
              >
                <View style={[s.letra, isSelected && s.letraSelected]}>
                  <Text style={[s.letraTxt, isSelected && { color: '#fff' }]}>{LETRAS[i]}</Text>
                </View>
                <Text style={[s.opcionTxt, isSelected && s.opcionTxtSelected]}>
                  {op}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.primaryBtn, seleccion === null && s.primaryBtnDisabled]}
          activeOpacity={0.85}
          onPress={confirmar}
          disabled={seleccion === null}
        >
          <Text style={s.primaryBtnTxt}>
            {idx < total - 1 ? 'Siguiente' : 'Finalizar'}
          </Text>
          <Ionicons
            name={idx < total - 1 ? 'arrow-forward' : 'checkmark'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  statusTxt: { fontSize: 14, color: '#666', marginTop: 8 },

  // Intro
  introContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 24,
    shadowColor: NAVY, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  logoTxt: { fontSize: 32, fontWeight: '900', color: WHITE },
  introTitle: {
    fontSize: 24, fontWeight: '800', color: '#111',
    textAlign: 'center', marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 14, color: '#666',
    textAlign: 'center', marginBottom: 28, lineHeight: 20,
  },

  infoCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 14,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(43,76,114,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoTxt:  { flex: 1, fontSize: 13, color: '#444', lineHeight: 19 },
  infoBold: { fontWeight: '800', color: '#111' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: NAVY, borderRadius: 12,
    paddingVertical: 16,
    shadowColor: NAVY, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  primaryBtnDisabled: { backgroundColor: '#B0BEC5', shadowOpacity: 0, elevation: 0 },
  primaryBtnTxt: { fontSize: 15, fontWeight: '800', color: WHITE },

  // Progreso
  progressBar: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: BG,
  },
  progressTop: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  progressTxt: { fontSize: 12, fontWeight: '700', color: '#666' },
  progressPct: { fontSize: 12, fontWeight: '800', color: NAVY },
  progressTrack: {
    height: 6, backgroundColor: '#E0E5EB', borderRadius: 100, overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: NAVY, borderRadius: 100 },

  // Preguntas
  questionContent: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24,
  },
  questionEnunciado: {
    fontSize: 20, fontWeight: '700', color: '#111',
    lineHeight: 28, marginTop: 8,
  },

  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  opcionSelected: {
    backgroundColor: 'rgba(43,76,114,0.06)',
    borderColor: NAVY,
  },
  letra: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0F1F3',
    alignItems: 'center', justifyContent: 'center',
  },
  letraSelected: { backgroundColor: NAVY },
  letraTxt: { fontSize: 13, fontWeight: '800', color: '#666' },
  opcionTxt: { flex: 1, fontSize: 15, color: '#222' },
  opcionTxtSelected: { color: NAVY, fontWeight: '700' },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
    backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: '#E8EBEF',
  },

  resultContent: {
    paddingHorizontal: 24, paddingVertical: 40,
    flexGrow: 1, justifyContent: 'center',
  },
  resultIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,214,106,0.18)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  resultLabel: {
    fontSize: 13, color: '#888', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2,
    textAlign: 'center', marginBottom: 6,
  },
  resultNivel: {
    fontSize: 56, fontWeight: '900', color: NAVY,
    textAlign: 'center', letterSpacing: 2, marginBottom: 4,
  },
  resultTitulo: {
    fontSize: 18, fontWeight: '700', color: '#111',
    textAlign: 'center', marginBottom: 24,
  },
  resultCard: {
    backgroundColor: WHITE, borderRadius: 16,
    padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  resultDesc: { fontSize: 14, color: '#444', lineHeight: 22, textAlign: 'center' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF0F0', borderRadius: 10,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FFCCCC',
  },
  errorTxt: { flex: 1, fontSize: 12, color: '#C00' },
});
