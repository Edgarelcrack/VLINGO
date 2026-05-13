import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSeccion, actualizarSeccion } from '../services/cursosService';
import { ContenidoBloque, Seccion } from '../types';

const NAVY  = '#2B4C72';
const BG    = '#F2F4F6';
const WHITE = '#fff';

type TipoBloque = ContenidoBloque['tipo'];

const TIPO_LABEL: Record<TipoBloque, string> = {
  texto:     'Texto',
  lista:     'Lista',
  ejercicio: 'Ejercicio',
  audio_url: 'Audio',
};

const TIPO_ICON: Record<TipoBloque, any> = {
  texto:     'text',
  lista:     'list',
  ejercicio: 'flask',
  audio_url: 'musical-notes',
};

export default function EditorContenidoScreen({ navigation, route }: any) {
  const { seccionId, titulo: tituloParam } = route?.params ?? {};
  const insets = useSafeAreaInsets();

  const [seccion, setSeccion]   = useState<Seccion | null>(null);
  const [bloques, setBloques]   = useState<ContenidoBloque[]>([]);
  const [loading, setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [dirty, setDirty]       = useState(false);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [adding, setAdding]         = useState<TipoBloque | null>(null);

  const load = useCallback(async () => {
    if (!seccionId) return;
    const { data, error } = await getSeccion(seccionId);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    if (!data) {
      Alert.alert('No encontrado', 'La lección ya no existe.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    setSeccion(data);
    setBloques(data.contenido?.bloques ?? []);
  }, [seccionId, navigation]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const guardar = async () => {
    if (!seccion) return;
    setGuardando(true);
    const { error } = await actualizarSeccion(seccion.id, {
      contenido: { bloques },
    });
    setGuardando(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setDirty(false);
      Alert.alert('Guardado', 'El contenido se ha guardado correctamente.');
    }
  };

  const eliminarBloque = (idx: number) => {
    Alert.alert(
      'Eliminar bloque',
      '¿Eliminar este bloque?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: () => {
            setBloques(prev => prev.filter((_, i) => i !== idx));
            setDirty(true);
          },
        },
      ]
    );
  };

  const moverBloque = (idx: number, dir: -1 | 1) => {
    setBloques(prev => {
      const nuevoIdx = idx + dir;
      if (nuevoIdx < 0 || nuevoIdx >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[nuevoIdx]] = [copia[nuevoIdx], copia[idx]];
      return copia;
    });
    setDirty(true);
  };

  const handleSaveBloque = (b: ContenidoBloque) => {
    if (editingIdx !== null) {
      const idxFijo = editingIdx;
      setBloques(prev => prev.map((bl, i) => i === idxFijo ? b : bl));
      setEditingIdx(null);
    } else {
      setBloques(prev => [...prev, b]);
      setAdding(null);
    }
    setDirty(true);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={NAVY} /></View>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => {
            if (dirty) {
              Alert.alert(
                'Cambios sin guardar',
                '¿Salir sin guardar los cambios?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Salir', style: 'destructive', onPress: () => navigation.goBack() },
                ]
              );
            } else navigation.goBack();
          }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>Contenido</Text>
          <Text style={s.headerSub} numberOfLines={1}>{tituloParam ?? seccion?.titulo ?? ''}</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, (!dirty || guardando) && { opacity: 0.5 }]}
          onPress={guardar}
          disabled={!dirty || guardando}
        >
          {guardando
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnTxt}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {bloques.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={48} color="#BBB" />
            <Text style={s.emptyTitle}>Sin contenido</Text>
            <Text style={s.emptySub}>Agrega bloques de texto, listas o ejercicios usando los botones de abajo.</Text>
          </View>
        ) : (
          bloques.map((b, i) => (
            <BloqueCard
              key={i}
              bloque={b}
              idx={i}
              total={bloques.length}
              onEdit={() => setEditingIdx(i)}
              onDelete={() => eliminarBloque(i)}
              onMover={(dir) => moverBloque(i, dir)}
            />
          ))
        )}
      </ScrollView>

      <View style={[s.fabWrap, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={s.fabLabel}>Agregar bloque</Text>
        <View style={s.fabRow}>
          <FabBtn icon="text" label="Texto" onPress={() => setAdding('texto')} />
          <FabBtn icon="list" label="Lista" onPress={() => setAdding('lista')} />
          <FabBtn icon="flask" label="Ejercicio" onPress={() => setAdding('ejercicio')} />
        </View>
      </View>

      <BloqueModal
        visible={adding !== null || editingIdx !== null}
        tipo={adding ?? bloques[editingIdx ?? 0]?.tipo ?? 'texto'}
        valor={editingIdx !== null ? bloques[editingIdx] : null}
        onSave={handleSaveBloque}
        onClose={() => { setAdding(null); setEditingIdx(null); }}
      />
    </SafeAreaView>
  );
}

function FabBtn({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.fabBtn} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={s.fabBtnTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function BloqueCard({
  bloque, idx, total, onEdit, onDelete, onMover,
}: {
  bloque: ContenidoBloque;
  idx: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  return (
    <View style={s.bloqueCard}>
      <View style={s.bloqueHead}>
        <View style={s.bloqueTipo}>
          <Ionicons name={TIPO_ICON[bloque.tipo]} size={14} color={NAVY} />
          <Text style={s.bloqueTipoTxt}>{TIPO_LABEL[bloque.tipo]}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[s.iconBtn, idx === 0 && { opacity: 0.3 }]}
          onPress={() => onMover(-1)}
          disabled={idx === 0}
        >
          <Ionicons name="arrow-up" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.iconBtn, idx === total - 1 && { opacity: 0.3 }]}
          onPress={() => onMover(1)}
          disabled={idx === total - 1}
        >
          <Ionicons name="arrow-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={s.bloqueBody}>
        {bloque.tipo === 'texto' && (
          <Text style={s.previewTxt} numberOfLines={4}>{bloque.valor}</Text>
        )}
        {bloque.tipo === 'lista' && (
          <View>
            {(bloque.items ?? []).slice(0, 4).map((it, i) => (
              <View key={i} style={s.listRow}>
                <Text style={s.listBullet}>•</Text>
                <Text style={s.listTxt} numberOfLines={1}>{it}</Text>
              </View>
            ))}
            {(bloque.items?.length ?? 0) > 4 && (
              <Text style={s.listMore}>+{(bloque.items?.length ?? 0) - 4} más</Text>
            )}
          </View>
        )}
        {bloque.tipo === 'ejercicio' && (
          <>
            <Text style={s.ejPregunta}>{bloque.pregunta}</Text>
            {bloque.respuesta ? (
              <Text style={s.ejRespuesta}>Respuesta: {bloque.respuesta}</Text>
            ) : null}
          </>
        )}
      </View>

      <View style={s.bloqueActions}>
        <TouchableOpacity style={s.bloqueAction} onPress={onEdit}>
          <Ionicons name="create-outline" size={15} color={NAVY} />
          <Text style={s.bloqueActionTxt}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bloqueAction} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color="#E05A4E" />
          <Text style={[s.bloqueActionTxt, { color: '#E05A4E' }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BloqueModal({
  visible, tipo, valor, onSave, onClose,
}: {
  visible: boolean;
  tipo: TipoBloque;
  valor: ContenidoBloque | null;
  onSave: (b: ContenidoBloque) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [texto, setTexto]         = useState('');
  const [items, setItems]         = useState<string[]>(['']);
  const [pregunta, setPregunta]   = useState('');
  const [respuesta, setRespuesta] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTexto(valor?.valor ?? '');
    setItems(valor?.items && valor.items.length > 0 ? [...valor.items] : ['']);
    setPregunta(valor?.pregunta ?? '');
    setRespuesta(valor?.respuesta ?? '');
  }, [visible, valor]);

  const handleSave = () => {
    if (tipo === 'texto') {
      if (!texto.trim()) return;
      onSave({ tipo: 'texto', valor: texto.trim() });
    } else if (tipo === 'lista') {
      const limpios = items.map(i => i.trim()).filter(Boolean);
      if (limpios.length === 0) return;
      onSave({ tipo: 'lista', items: limpios });
    } else if (tipo === 'ejercicio') {
      if (!pregunta.trim()) return;
      onSave({
        tipo: 'ejercicio',
        pregunta: pregunta.trim(),
        respuesta: respuesta.trim() || undefined,
      });
    }
  };

  const valido =
    (tipo === 'texto' && texto.trim().length > 0) ||
    (tipo === 'lista' && items.some(i => i.trim().length > 0)) ||
    (tipo === 'ejercicio' && pregunta.trim().length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={m.handle} />
          <Text style={m.title}>
            {valor ? 'Editar' : 'Nuevo'} bloque · {TIPO_LABEL[tipo]}
          </Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 420 }}
          >
            {tipo === 'texto' && (
              <TextInput
                style={[m.input, m.inputMulti]}
                value={texto}
                onChangeText={setTexto}
                placeholder="Escribe el contenido del bloque…"
                placeholderTextColor="#BBB"
                multiline
                textAlignVertical="top"
                autoFocus
              />
            )}

            {tipo === 'lista' && (
              <View>
                {items.map((it, i) => (
                  <View key={i} style={m.itemRow}>
                    <Text style={m.itemBullet}>•</Text>
                    <TextInput
                      style={[m.input, { flex: 1, marginBottom: 0 }]}
                      value={it}
                      onChangeText={(v) => setItems(prev => prev.map((x, idx) => idx === i ? v : x))}
                      placeholder={`Elemento ${i + 1}`}
                      placeholderTextColor="#BBB"
                    />
                    {items.length > 1 && (
                      <TouchableOpacity
                        onPress={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                        style={m.itemRemove}
                      >
                        <Ionicons name="close" size={16} color="#E05A4E" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  style={m.addItem}
                  onPress={() => setItems(prev => [...prev, ''])}
                >
                  <Ionicons name="add" size={16} color={NAVY} />
                  <Text style={m.addItemTxt}>Agregar elemento</Text>
                </TouchableOpacity>
              </View>
            )}

            {tipo === 'ejercicio' && (
              <>
                <Text style={m.label}>Pregunta</Text>
                <TextInput
                  style={[m.input, m.inputMulti]}
                  value={pregunta}
                  onChangeText={setPregunta}
                  placeholder="¿Cuál es la pregunta del ejercicio?"
                  placeholderTextColor="#BBB"
                  multiline
                  textAlignVertical="top"
                />
                <Text style={m.label}>Respuesta sugerida (opcional)</Text>
                <TextInput
                  style={m.input}
                  value={respuesta}
                  onChangeText={setRespuesta}
                  placeholder="Respuesta de referencia"
                  placeholderTextColor="#BBB"
                />
              </>
            )}
          </ScrollView>

          <View style={m.btnRow}>
            <TouchableOpacity style={m.btnCancel} onPress={onClose}>
              <Text style={m.btnCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.btnSave, !valido && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!valido}
            >
              <Text style={m.btnSaveTxt}>Guardar bloque</Text>
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  headerSub:   { fontSize: 11, color: '#999', marginTop: 2 },
  saveBtn: {
    backgroundColor: NAVY, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, minWidth: 78, alignItems: 'center',
  },
  saveBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#444', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  bloqueCard: {
    backgroundColor: WHITE, borderRadius: 14,
    marginBottom: 10, overflow: 'hidden',
  },
  bloqueHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingTop: 12,
  },
  bloqueTipo: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(43,76,114,0.08)', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  bloqueTipoTxt: { fontSize: 11, fontWeight: '800', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.4 },
  iconBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  bloqueBody: { padding: 14 },
  previewTxt: { fontSize: 13, color: '#333', lineHeight: 19 },
  listRow:    { flexDirection: 'row', gap: 8, marginBottom: 4 },
  listBullet: { color: '#888', fontSize: 14 },
  listTxt:    { flex: 1, fontSize: 13, color: '#333' },
  listMore:   { fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic' },
  ejPregunta: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 4 },
  ejRespuesta:{ fontSize: 12, color: '#666', fontStyle: 'italic' },

  bloqueActions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  bloqueAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, height: 38,
  },
  bloqueActionTxt: { fontSize: 12, fontWeight: '700', color: NAVY },

  fabWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 8,
    backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: '#E8E8E8',
  },
  fabLabel: { fontSize: 11, color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  fabRow: { flexDirection: 'row', gap: 8 },
  fabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 44, borderRadius: 10, backgroundColor: NAVY,
  },
  fabBtnTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  handle: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#111',
    borderWidth: 1, borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  inputMulti: { minHeight: 100, paddingTop: 12 },

  itemRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  itemBullet: { fontSize: 16, color: '#888', width: 14, textAlign: 'center' },
  itemRemove: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEAE7',
  },
  addItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    height: 40, borderRadius: 10, borderWidth: 1, borderColor: NAVY,
    borderStyle: 'dashed', marginTop: 4,
  },
  addItemTxt: { fontSize: 12, fontWeight: '700', color: NAVY },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
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
