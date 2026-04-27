import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { crearCurso } from '../services/cursosService';

const NAVY  = '#2B4C72';
const BG    = '#F2F4F6';
const WHITE = '#fff';

const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function CrearCursoScreen({ navigation }: any) {
  const [titulo, setTitulo]       = useState('');
  const [desc, setDesc]           = useState('');
  const [nivel, setNivel]         = useState('');
  const [idioma, setIdioma]       = useState('inglés');
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!titulo.trim()) e.titulo = 'El título es requerido';
    else if (titulo.trim().length < 3) e.titulo = 'Mínimo 3 caracteres';
    if (!idioma.trim()) e.idioma = 'El idioma es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCrear = async () => {
    if (!validate()) return;
    setLoading(true);
    const { data, error } = await crearCurso({
      titulo: titulo.trim(),
      descripcion: desc.trim() || undefined,
      nivel: nivel || undefined,
      idioma_objetivo: idioma.trim(),
    });
    setLoading(false);

    if (error || !data) {
      Alert.alert('Error', error ?? 'No se pudo crear el curso');
      return;
    }

    Alert.alert(
      '¡Curso creado!',
      'Ahora puedes agregar secciones y contenido.',
      [{
        text: 'Agregar secciones',
        onPress: () =>
          navigation.replace('EditorSecciones', { cursoId: data.id, titulo: data.titulo }),
      }]
    );
  };

  const clear = (f: string) => setErrors(p => { const n = { ...p }; delete n[f]; return n; });

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Nuevo curso</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Título */}
          <Text style={s.label}>Título del curso *</Text>
          <View style={[s.inputWrap, errors.titulo && s.inputError]}>
            <TextInput
              style={s.input}
              placeholder="Ej: Business English Fundamentals"
              placeholderTextColor="#BBB"
              value={titulo}
              onChangeText={t => { setTitulo(t); clear('titulo'); }}
              autoCapitalize="sentences"
              maxLength={120}
            />
          </View>
          {errors.titulo ? <Text style={s.errorTxt}>{errors.titulo}</Text> : null}

          {/* Descripción */}
          <Text style={s.label}>Descripción (opcional)</Text>
          <View style={[s.inputWrap, s.textAreaWrap]}>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="¿De qué trata este curso?"
              placeholderTextColor="#BBB"
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={3}
              maxLength={400}
              textAlignVertical="top"
            />
          </View>

          {/* Idioma */}
          <Text style={s.label}>Idioma del curso *</Text>
          <View style={[s.inputWrap, errors.idioma && s.inputError]}>
            <TextInput
              style={s.input}
              placeholder="Ej: inglés, francés, español"
              placeholderTextColor="#BBB"
              value={idioma}
              onChangeText={t => { setIdioma(t); clear('idioma'); }}
              autoCapitalize="none"
            />
          </View>
          {errors.idioma ? <Text style={s.errorTxt}>{errors.idioma}</Text> : null}

          {/* Nivel */}
          <Text style={s.label}>Nivel (opcional)</Text>
          <View style={s.nivelRow}>
            {NIVELES.map(n => (
              <TouchableOpacity
                key={n}
                style={[s.nivelBtn, nivel === n && s.nivelBtnActive]}
                onPress={() => setNivel(prev => prev === n ? '' : n)}
              >
                <Text style={[s.nivelTxt, nivel === n && s.nivelTxtActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.infoBanner}>
            <Text style={s.infoTxt}>
              El curso se creará como <Text style={{ fontWeight: '700' }}>borrador</Text>. Podrás añadir secciones y publicarlo cuando esté listo.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleCrear}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={WHITE} />
              : <Text style={s.btnTxt}>Crear curso →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: BG,
  },
  backBtn:     { width: 32 },
  backArrow:   { fontSize: 22, color: '#111' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111' },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  label:    { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 18 },
  inputWrap: {
    backgroundColor: WHITE, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, paddingHorizontal: 14, height: 50,
    justifyContent: 'center',
  },
  textAreaWrap: { height: 90, justifyContent: 'flex-start', paddingVertical: 12 },
  inputError:  { borderColor: '#E05A4E' },
  input:       { fontSize: 14, color: '#111', flex: 1 },
  textArea:    { height: 66 },
  errorTxt:    { fontSize: 11, color: '#E05A4E', marginTop: 4 },

  nivelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  nivelBtn: {
    width: 50, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: WHITE,
  },
  nivelBtnActive: { borderColor: NAVY, backgroundColor: 'rgba(43,76,114,0.08)' },
  nivelTxt:       { fontSize: 13, fontWeight: '600', color: '#999' },
  nivelTxtActive: { color: NAVY },

  infoBanner: {
    backgroundColor: 'rgba(43,76,114,0.07)',
    borderRadius: 10, padding: 14, marginTop: 22,
  },
  infoTxt: { fontSize: 12, color: '#555', lineHeight: 18 },

  btn: {
    backgroundColor: NAVY, borderRadius: 12,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 20,
    shadowColor: NAVY, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  btnTxt: { fontSize: 15, fontWeight: '700', color: WHITE },
});
