import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { crearCurso, getCurso, actualizarCurso } from '../services/cursosService';

const NAVY  = '#2B4C72';
const BG    = '#F2F4F6';
const WHITE = '#fff';

const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const NIVEL_COLOR: Record<string, string> = {
  A1: '#4CAF7D', A2: '#8BC34A',
  B1: '#FFA726', B2: '#FF7043',
  C1: '#AB47BC', C2: '#EC407A',
};

const IDIOMAS_COMUNES = ['inglés', 'francés', 'alemán', 'italiano', 'portugués'];

export default function CrearCursoScreen({ navigation, route }: any) {
  const cursoId: string | undefined = route?.params?.cursoId;
  const modoEdicion = !!cursoId;
  const insets = useSafeAreaInsets();

  const [titulo, setTitulo]   = useState('');
  const [desc, setDesc]       = useState('');
  const [nivel, setNivel]     = useState('');
  const [idioma, setIdioma]   = useState('inglés');
  const [idiomaCustom, setIdiomaCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(modoEdicion);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  useEffect(() => {
    if (!modoEdicion || !cursoId) return;
    let alive = true;
    (async () => {
      const { data, error } = await getCurso(cursoId);
      if (!alive) return;
      if (error || !data) {
        setCargando(false);
        Alert.alert(
          'No encontrado',
          error ?? 'El curso ya no existe.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      setTitulo(data.titulo);
      setDesc(data.descripcion ?? '');
      setNivel(data.nivel ?? '');
      setIdioma(data.idioma_objetivo);
      setIdiomaCustom(!IDIOMAS_COMUNES.includes(data.idioma_objetivo));
      setCargando(false);
    })();
    return () => { alive = false; };
  }, [cursoId, modoEdicion, navigation]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!titulo.trim()) e.titulo = 'El título es requerido';
    else if (titulo.trim().length < 3) e.titulo = 'Mínimo 3 caracteres';
    if (!idioma.trim()) e.idioma = 'El idioma es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    setLoading(true);

    if (modoEdicion && cursoId) {
      const { error } = await actualizarCurso(cursoId, {
        titulo: titulo.trim(),
        descripcion: desc.trim() || null,
        nivel: nivel || null,
        idioma_objetivo: idioma.trim(),
      });
      setLoading(false);
      if (error) {
        Alert.alert('Error', error);
        return;
      }
      navigation.goBack();
      return;
    }

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

  if (cargando) {
    return (
      <View style={s.center}><ActivityIndicator size="large" color={NAVY} /></View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{modoEdicion ? 'Editar curso' : 'Nuevo curso'}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!modoEdicion && (
            <View style={s.heroBanner}>
              <View style={s.heroIcon}>
                <Ionicons name="rocket" size={20} color={NAVY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroTitle}>Crea un nuevo curso</Text>
                <Text style={s.heroSub}>Empieza con la información básica. Después agregas secciones, contenido y preguntas.</Text>
              </View>
            </View>
          )}

          <Text style={s.label}>Título del curso *</Text>
          <View style={[s.inputWrap, errors.titulo && s.inputError]}>
            <Ionicons name="bookmark-outline" size={16} color="#999" />
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

          <Text style={s.label}>Descripción</Text>
          <View style={[s.inputWrap, s.textAreaWrap]}>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="¿De qué trata este curso? ¿Qué aprenderá el estudiante?"
              placeholderTextColor="#BBB"
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={3}
              maxLength={400}
              textAlignVertical="top"
            />
          </View>
          <Text style={s.charCounter}>{desc.length}/400</Text>

          <Text style={s.label}>Idioma del curso *</Text>
          <View style={s.chipsRow}>
            {IDIOMAS_COMUNES.map(i => {
              const active = !idiomaCustom && idioma === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => { setIdioma(i); setIdiomaCustom(false); clear('idioma'); }}
                >
                  <Text style={[s.chipTxt, active && s.chipTxtActive]}>{i}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[s.chip, idiomaCustom && s.chipActive]}
              onPress={() => { setIdiomaCustom(true); setIdioma(''); }}
            >
              <Ionicons name="add" size={14} color={idiomaCustom ? '#fff' : '#666'} />
              <Text style={[s.chipTxt, idiomaCustom && s.chipTxtActive]}>Otro</Text>
            </TouchableOpacity>
          </View>
          {idiomaCustom && (
            <View style={[s.inputWrap, errors.idioma && s.inputError, { marginTop: 10 }]}>
              <Ionicons name="globe-outline" size={16} color="#999" />
              <TextInput
                style={s.input}
                placeholder="Especifica el idioma"
                placeholderTextColor="#BBB"
                value={idioma}
                onChangeText={t => { setIdioma(t); clear('idioma'); }}
                autoCapitalize="none"
                autoFocus
              />
            </View>
          )}
          {errors.idioma ? <Text style={s.errorTxt}>{errors.idioma}</Text> : null}

          <Text style={s.label}>Nivel</Text>
          <View style={s.nivelRow}>
            {NIVELES.map(n => {
              const active = nivel === n;
              const color = NIVEL_COLOR[n];
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    s.nivelBtn,
                    active && { borderColor: color, backgroundColor: `${color}18` },
                  ]}
                  onPress={() => setNivel(prev => prev === n ? '' : n)}
                >
                  <Text style={[s.nivelTxt, active && { color }]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!modoEdicion && (
            <View style={s.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color={NAVY} />
              <Text style={s.infoTxt}>
                El curso se crea como borrador. Lo puedes publicar cuando esté listo desde el editor.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleGuardar}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={WHITE} />
              : (
                <>
                  <Ionicons name={modoEdicion ? 'save' : 'add-circle'} size={18} color={WHITE} />
                  <Text style={s.btnTxt}>{modoEdicion ? 'Guardar cambios' : 'Crear curso'}</Text>
                </>
              )
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14, backgroundColor: BG,
  },
  backBtn:     { width: 32 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111' },

  content: { paddingHorizontal: 20 },

  heroBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 18,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 14, fontWeight: '800', color: '#111', marginBottom: 2 },
  heroSub:   { fontSize: 12, color: '#777', lineHeight: 17 },

  label: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 18 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, paddingHorizontal: 14, height: 50,
  },
  textAreaWrap: { height: 100, alignItems: 'flex-start', paddingTop: 12 },
  inputError:  { borderColor: '#E05A4E' },
  input:       { fontSize: 14, color: '#111', flex: 1 },
  textArea:    { height: 76, paddingTop: 0 },
  errorTxt:    { fontSize: 11, color: '#E05A4E', marginTop: 4 },
  charCounter: { fontSize: 10, color: '#AAA', textAlign: 'right', marginTop: 4 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1, borderColor: '#E0E0E0',
    backgroundColor: WHITE,
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipTxt:    { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTxtActive: { color: '#fff' },

  nivelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  nivelBtn: {
    width: 50, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: WHITE,
  },
  nivelTxt: { fontSize: 13, fontWeight: '700', color: '#999' },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(43,76,114,0.07)',
    borderRadius: 10, padding: 14, marginTop: 22,
  },
  infoTxt: { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: NAVY, borderRadius: 12,
    height: 52, marginTop: 20,
    shadowColor: NAVY, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  btnTxt: { fontSize: 15, fontWeight: '800', color: WHITE },
});
