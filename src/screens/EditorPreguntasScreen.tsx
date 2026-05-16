import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getPreguntasPorSeccion, crearPregunta, actualizarPregunta,
  eliminarPregunta, MAX_PREGUNTAS_POR_SECCION,
} from '../services/preguntasService';
import { Pregunta, TipoPregunta } from '../types';

const NAVY = '#2B4C72';
const BG   = '#F2F4F6';
const GREEN = '#2E7D52';

const TIPO_LABEL: Record<TipoPregunta, string> = {
  opcion_multiple: 'Opción múltiple',
  completar_frase: 'Completar la frase',
  pronunciacion: 'Pronunciación',
};

const LETRAS = ['A', 'B', 'C', 'D'];

export default function EditorPreguntasScreen({ navigation, route }: any) {
  const { seccionId, titulo } = route?.params ?? {};
  const insets = useSafeAreaInsets();

  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editando, setEditando]   = useState<Pregunta | null>(null);
  const [creando, setCreando]     = useState(false);

  const load = useCallback(async () => {
    if (!seccionId) return;
    const { data } = await getPreguntasPorSeccion(seccionId);
    setPreguntas(data);
  }, [seccionId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleAgregar = () => {
    if (preguntas.length >= MAX_PREGUNTAS_POR_SECCION) {
      Alert.alert('Límite alcanzado', `Máximo ${MAX_PREGUNTAS_POR_SECCION} preguntas por sección.`);
      return;
    }
    setCreando(true);
  };

  const handleEliminar = (p: Pregunta) => {
    Alert.alert(
      'Eliminar pregunta',
      `¿Eliminar la pregunta "${p.enunciado.slice(0, 60)}${p.enunciado.length > 60 ? '…' : ''}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { error } = await eliminarPregunta(p.id);
            if (error) Alert.alert('Error', error);
            else load();
          },
        },
      ]
    );
  };

  const handleGuardarNueva = async (form: PreguntaForm) => {
    const { error } = await crearPregunta({
      seccion_id: seccionId,
      tipo: form.tipo,
      enunciado: form.enunciado,
      opciones: form.opciones,
      respuesta_correcta: form.respuesta_correcta,
    });
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setCreando(false);
    load();
  };

  const handleGuardarEdicion = async (form: PreguntaForm) => {
    if (!editando) return;
    const { error } = await actualizarPregunta(editando.id, {
      tipo: form.tipo,
      enunciado: form.enunciado,
      opciones: form.opciones,
      respuesta_correcta: form.respuesta_correcta,
    });
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setEditando(null);
    load();
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  const limite = preguntas.length >= MAX_PREGUNTAS_POR_SECCION;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>Preguntas</Text>
          {titulo ? <Text style={s.headerSub} numberOfLines={1}>{titulo}</Text> : null}
        </View>
        <View style={s.counterPill}>
          <Text style={s.counterTxt}>{preguntas.length}/{MAX_PREGUNTAS_POR_SECCION}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {preguntas.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="help-circle-outline" size={48} color="#BBB" />
            <Text style={s.emptyTxt}>Esta sección aún no tiene preguntas</Text>
            <Text style={s.emptySub}>Agrega entre 1 y {MAX_PREGUNTAS_POR_SECCION} preguntas para evaluar a los estudiantes.</Text>
          </View>
        ) : (
          preguntas.map((p, i) => (
            <View key={p.id} style={s.card}>
              <View style={s.cardHead}>
                <View style={s.numBadge}><Text style={s.numTxt}>{i + 1}</Text></View>
                <View style={s.tipoPill}>
                  <Text style={s.tipoTxt}>{TIPO_LABEL[p.tipo]}</Text>
                </View>
              </View>
              <Text style={s.enunciado}>{p.enunciado}</Text>
              {p.tipo === 'pronunciacion' ? (
                <View style={[s.opcionRow, { backgroundColor: '#F0F4FF' }]}>
                  <Ionicons name="mic-outline" size={16} color={NAVY} />
                  <Text style={[s.opcionTxt, { color: NAVY, fontWeight: '700' }]} numberOfLines={2}>
                    Esperado: {p.opciones[0]}
                  </Text>
                </View>
              ) : (
                p.opciones.map((op, idx) => {
                  const correcta = idx === p.respuesta_correcta;
                  return (
                    <View key={idx} style={[s.opcionRow, correcta && s.opcionRowCorrecta]}>
                      <View style={[s.opcionLetra, correcta && s.opcionLetraCorrecta]}>
                        <Text style={[s.opcionLetraTxt, correcta && { color: '#fff' }]}>{LETRAS[idx]}</Text>
                      </View>
                      <Text style={[s.opcionTxt, correcta && { color: GREEN, fontWeight: '700' }]} numberOfLines={2}>
                        {op}
                      </Text>
                      {correcta && <Ionicons name="checkmark-circle" size={18} color={GREEN} />}
                    </View>
                  );
                })
              )}
              <View style={s.actions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => setEditando(p)}>
                  <Ionicons name="create-outline" size={16} color={NAVY} />
                  <Text style={s.actionTxt}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleEliminar(p)}>
                  <Ionicons name="trash-outline" size={16} color="#E05A4E" />
                  <Text style={[s.actionTxt, { color: '#E05A4E' }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[s.fabWrap, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[s.fab, limite && s.fabDisabled]}
          activeOpacity={0.85}
          onPress={handleAgregar}
          disabled={limite}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.fabTxt}>
            {limite ? 'Límite alcanzado' : 'Agregar pregunta'}
          </Text>
        </TouchableOpacity>
      </View>

      <PreguntaModal
        visible={creando}
        titulo="Nueva pregunta"
        inicial={null}
        onSave={handleGuardarNueva}
        onClose={() => setCreando(false)}
      />
      <PreguntaModal
        visible={!!editando}
        titulo="Editar pregunta"
        inicial={editando}
        onSave={handleGuardarEdicion}
        onClose={() => setEditando(null)}
      />
    </SafeAreaView>
  );
}

type PreguntaForm = {
  tipo: TipoPregunta;
  enunciado: string;
  opciones: string[];
  respuesta_correcta: number;
};

function PreguntaModal({
  visible, titulo, inicial, onSave, onClose,
}: {
  visible: boolean;
  titulo: string;
  inicial: Pregunta | null;
  onSave: (f: PreguntaForm) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [tipo, setTipo]                           = useState<TipoPregunta>('opcion_multiple');
  const [enunciado, setEnunciado]                 = useState('');
  const [opciones, setOpciones]                   = useState<string[]>(['', '', '', '']);
  const [correcta, setCorrecta]                   = useState(0);
  const [transcripcionEsperada, setTranscripcion] = useState('');
  const [guardando, setGuardando]                 = useState(false);

  useEffect(() => {
    if (visible) {
      const t = inicial?.tipo ?? 'opcion_multiple';
      setTipo(t);
      setEnunciado(inicial?.enunciado ?? '');
      if (t === 'pronunciacion') {
        setTranscripcion(inicial?.opciones[0] ?? '');
        setOpciones(['', '', '', '']);
      } else {
        setTranscripcion('');
        setOpciones(inicial?.opciones && inicial.opciones.length === 4
          ? [...inicial.opciones]
          : ['', '', '', '']);
      }
      setCorrecta(inicial?.respuesta_correcta ?? 0);
      setGuardando(false);
    }
  }, [visible, inicial]);

  const setOpcion = (idx: number, valor: string) => {
    setOpciones(prev => prev.map((o, i) => i === idx ? valor : o));
  };

  const valido = tipo === 'pronunciacion'
    ? enunciado.trim().length > 0 && transcripcionEsperada.trim().length > 0
    : enunciado.trim().length > 0 && opciones.every(o => o.trim().length > 0);

  const handleSave = () => {
    if (!valido || guardando) return;
    setGuardando(true);
    if (tipo === 'pronunciacion') {
      onSave({ tipo, enunciado: enunciado.trim(), opciones: [transcripcionEsperada.trim()], respuesta_correcta: 0 });
    } else {
      onSave({ tipo, enunciado: enunciado.trim(), opciones: opciones.map(o => o.trim()), respuesta_correcta: correcta });
    }
    setGuardando(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={m.sheetHandle} />
          <Text style={m.sheetTitle}>{titulo}</Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 480 }}
          >
            <Text style={m.label}>Tipo de pregunta</Text>
            <View style={m.tipoRow}>
              {(['opcion_multiple', 'completar_frase', 'pronunciacion'] as TipoPregunta[]).map(t => {
                const active = tipo === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[m.tipoBtn, active && m.tipoBtnActive]}
                    onPress={() => setTipo(t)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={t === 'pronunciacion' ? 'mic-outline' : t === 'completar_frase' ? 'text-outline' : 'list-outline'}
                      size={12} color={active ? '#fff' : '#666'}
                    />
                    <Text style={[m.tipoBtnTxt, active && { color: '#fff' }]}>
                      {TIPO_LABEL[t]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={m.label}>
              {tipo === 'pronunciacion' ? 'Frase a pronunciar' : 'Enunciado'}
            </Text>
            <TextInput
              style={[m.input, m.inputMulti]}
              value={enunciado}
              onChangeText={setEnunciado}
              placeholder={
                tipo === 'completar_frase' ? 'Ej: Yo ___ a la escuela todos los días' :
                tipo === 'pronunciacion'   ? 'Ej: The weather is beautiful today' :
                'Escribe la pregunta…'
              }
              placeholderTextColor="#BBB"
              multiline
              textAlignVertical="top"
            />

            {tipo === 'pronunciacion' ? (
              <>
                <Text style={m.label}>Transcripción esperada</Text>
                <TextInput
                  style={m.input}
                  value={transcripcionEsperada}
                  onChangeText={setTranscripcion}
                  placeholder="Ej: the weather is beautiful today"
                  placeholderTextColor="#BBB"
                  autoCapitalize="none"
                />
                <View style={m.pronHint}>
                  <Ionicons name="information-circle-outline" size={14} color="#888" />
                  <Text style={m.pronHintTxt}>
                    Escribe en minúsculas sin puntuación. Se comparará con lo que diga el estudiante.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={m.label}>Opciones (marca la correcta)</Text>
                {opciones.map((op, idx) => {
                  const isCorrecta = idx === correcta;
                  return (
                    <View key={idx} style={m.opcionWrap}>
                      <TouchableOpacity
                        style={[m.radio, isCorrecta && m.radioActive]}
                        onPress={() => setCorrecta(idx)}
                        activeOpacity={0.7}
                      >
                        {isCorrecta
                          ? <Ionicons name="checkmark" size={14} color="#fff" />
                          : <Text style={m.radioTxt}>{LETRAS[idx]}</Text>}
                      </TouchableOpacity>
                      <TextInput
                        style={[m.input, { flex: 1, marginBottom: 0 }]}
                        value={op}
                        onChangeText={(v) => setOpcion(idx, v)}
                        placeholder={`Opción ${LETRAS[idx]}`}
                        placeholderTextColor="#BBB"
                      />
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          <View style={m.btnRow}>
            <TouchableOpacity style={m.btnCancel} onPress={onClose}>
              <Text style={m.btnCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.btnSave, (!valido || guardando) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!valido || guardando}
            >
              {guardando
                ? <ActivityIndicator color="#fff" />
                : <Text style={m.btnSaveTxt}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14, backgroundColor: BG,
  },
  backBtn:     { width: 32 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:   { fontSize: 11, color: '#999', marginTop: 2 },
  counterPill: {
    backgroundColor: 'rgba(43,76,114,0.10)', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  counterTxt:  { fontSize: 12, fontWeight: '800', color: NAVY },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTxt: { fontSize: 15, fontWeight: '700', color: '#444', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  numBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
  },
  numTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  tipoPill: {
    backgroundColor: 'rgba(43,76,114,0.08)', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tipoTxt: { fontSize: 11, fontWeight: '700', color: NAVY },
  enunciado: { fontSize: 14, color: '#222', marginBottom: 10, lineHeight: 20 },

  opcionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 8, backgroundColor: '#F7F8FA', marginBottom: 6,
  },
  opcionRowCorrecta: { backgroundColor: '#E9F5EE' },
  opcionLetra: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center',
  },
  opcionLetraCorrecta: { backgroundColor: GREEN },
  opcionLetraTxt: { fontSize: 11, fontWeight: '800', color: '#666' },
  opcionTxt: { flex: 1, fontSize: 13, color: '#333' },

  actions: {
    flexDirection: 'row', gap: 16, marginTop: 8,
    borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionTxt: { fontSize: 12, fontWeight: '700', color: NAVY },

  fabWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, backgroundColor: BG,
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 50, borderRadius: 12, backgroundColor: NAVY,
  },
  fabDisabled: { backgroundColor: '#A0A0A0' },
  fabTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  sheetHandle: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', marginBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 16 },

  label: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },

  tipoRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tipoBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F0F2F5', alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 4,
    borderWidth: 1, borderColor: 'transparent',
  },
  tipoBtnActive: { backgroundColor: NAVY, borderColor: NAVY },
  tipoBtnTxt: { fontSize: 12, fontWeight: '700', color: '#666' },

  input: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#111',
    borderWidth: 1, borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  inputMulti: { minHeight: 80, paddingTop: 12 },

  opcionWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  radio: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8E8E8',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { backgroundColor: GREEN },
  radioTxt: { fontSize: 13, fontWeight: '800', color: '#666' },

  pronHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(43,76,114,0.06)', borderRadius: 8,
    padding: 10, marginBottom: 12,
  },
  pronHintTxt: { flex: 1, fontSize: 11, color: '#666', lineHeight: 16 },

  tipoIcon: { marginBottom: 2 },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancel: {
    flex: 1, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
  },
  btnCancelTxt: { fontSize: 14, fontWeight: '600', color: '#888' },
  btnSave: {
    flex: 1, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: NAVY,
  },
  btnSaveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
