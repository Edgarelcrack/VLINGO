import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getSecciones, agregarSeccion, actualizarSeccion,
  eliminarSeccion, publicarCurso, despublicarCurso,
  buildTree, getCurso, eliminarCurso,
  contarPreguntasPorSecciones, moverSeccion,
} from '../services/cursosService';
import { Curso, Seccion, SeccionArbol } from '../types';

const NAVY  = '#2B4C72';
const GREEN = '#2E7D52';
const BG    = '#F2F4F6';
const WHITE = '#fff';

const NIVEL_COLOR: Record<string, string> = {
  A1: '#4CAF7D', A2: '#8BC34A',
  B1: '#FFA726', B2: '#FF7043',
  C1: '#AB47BC', C2: '#EC407A',
};

function ModalInput({
  visible, titulo, placeholder, valor, multiline,
  onSave, onClose,
}: {
  visible: boolean;
  titulo: string;
  placeholder?: string;
  valor?: string;
  multiline?: boolean;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [txt, setTxt] = useState(valor ?? '');
  const insets = useSafeAreaInsets();
  useEffect(() => { setTxt(valor ?? ''); }, [valor, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={m.handle} />
          <Text style={m.title}>{titulo}</Text>
          <TextInput
            style={[m.input, multiline && m.inputMulti]}
            value={txt}
            onChangeText={setTxt}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            placeholder={placeholder ?? 'Escribe aquí…'}
            placeholderTextColor="#BBB"
            autoFocus
          />
          <View style={m.btnRow}>
            <TouchableOpacity style={m.btnCancel} onPress={onClose}>
              <Text style={m.btnCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.btnSave, !txt.trim() && { opacity: 0.45 }]}
              onPress={() => { if (txt.trim()) { onSave(txt.trim()); onClose(); } }}
              disabled={!txt.trim()}
            >
              <Text style={m.btnSaveTxt}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ModalConfig = {
  titulo: string;
  placeholder?: string;
  valor?: string;
  multiline?: boolean;
  onSave: (v: string) => void;
};

function NodoSeccion({
  nodo, depth, cursoId, preguntasMap, hijosTotales, indice,
  onReload, onOpenModal, onAbrirPreguntas, onAbrirContenido, onMover, navigation,
}: {
  nodo: SeccionArbol;
  depth: number;
  cursoId: string;
  preguntasMap: Record<string, number>;
  hijosTotales: number;
  indice: number;
  onReload: () => void;
  onOpenModal: (cfg: ModalConfig) => void;
  onAbrirPreguntas: (seccionId: string, titulo: string) => void;
  onAbrirContenido: (seccion: Seccion) => void;
  onMover: (id: string, dir: 'arriba' | 'abajo') => void;
  navigation: any;
}) {
  const [expanded, setExpanded] = useState(true);
  const indent = depth * 12;
  const isLeccion = nodo.tipo === 'leccion';
  const tienePreguntas = (preguntasMap[nodo.id] ?? 0) > 0;
  const tieneContenido = (nodo.contenido?.bloques?.length ?? 0) > 0;
  const hijosCount = nodo.hijos.length;

  const handleAgregarHijo = (tipo: 'seccion' | 'leccion') => {
    onOpenModal({
      titulo: tipo === 'leccion' ? 'Nueva lección' : 'Nueva subsección',
      placeholder: tipo === 'leccion' ? 'Ej: Introducción' : 'Ej: Unidad 1',
      onSave: async (titulo) => {
        await agregarSeccion({
          curso_id: cursoId,
          parent_id: nodo.id,
          titulo,
          orden: hijosCount,
          tipo,
        });
        onReload();
      },
    });
  };

  const handleRenombrar = () => {
    onOpenModal({
      titulo: 'Renombrar',
      placeholder: 'Nuevo título',
      valor: nodo.titulo,
      onSave: async (titulo) => {
        await actualizarSeccion(nodo.id, { titulo });
        onReload();
      },
    });
  };

  const handleEliminar = () => {
    Alert.alert(
      'Eliminar',
      `¿Eliminar "${nodo.titulo}" y todo su contenido?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => { await eliminarSeccion(nodo.id); onReload(); },
        },
      ]
    );
  };

  return (
    <View style={{ marginLeft: indent }}>
      <View style={[n.card, isLeccion && n.cardLeccion]}>
        <View style={n.cardTop}>
          {!isLeccion ? (
            <TouchableOpacity onPress={() => setExpanded(e => !e)} style={n.expandBtn}>
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color="#666" />
            </TouchableOpacity>
          ) : (
            <View style={n.leccionDot}>
              <Ionicons name="document-text" size={14} color={NAVY} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={[n.titulo, isLeccion && n.tituloLeccion]} numberOfLines={1}>
              {nodo.titulo}
            </Text>
            <View style={n.metaRow}>
              {!isLeccion && (
                <Text style={n.metaTxt}>{hijosCount} {hijosCount === 1 ? 'item' : 'items'}</Text>
              )}
              {isLeccion && (
                <>
                  <View style={[n.badge, tieneContenido && n.badgeOk]}>
                    <Ionicons
                      name={tieneContenido ? 'checkmark-circle' : 'document-outline'}
                      size={11}
                      color={tieneContenido ? GREEN : '#999'}
                    />
                    <Text style={[n.badgeTxt, tieneContenido && { color: GREEN }]}>
                      {tieneContenido ? 'Contenido' : 'Sin contenido'}
                    </Text>
                  </View>
                  <View style={[n.badge, tienePreguntas && n.badgeOk]}>
                    <Ionicons
                      name="help-circle-outline"
                      size={11}
                      color={tienePreguntas ? GREEN : '#999'}
                    />
                    <Text style={[n.badgeTxt, tienePreguntas && { color: GREEN }]}>
                      {preguntasMap[nodo.id] ?? 0} preg
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={n.moveBtns}>
            <TouchableOpacity
              style={[n.moveBtn, indice === 0 && { opacity: 0.3 }]}
              onPress={() => onMover(nodo.id, 'arriba')}
              disabled={indice === 0}
            >
              <Ionicons name="arrow-up" size={14} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[n.moveBtn, indice === hijosTotales - 1 && { opacity: 0.3 }]}
              onPress={() => onMover(nodo.id, 'abajo')}
              disabled={indice === hijosTotales - 1}
            >
              <Ionicons name="arrow-down" size={14} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={n.actionsRow}>
          {isLeccion ? (
            <>
              <ActionBtn icon="pencil" label="Contenido" onPress={() => onAbrirContenido(nodo)} />
              <ActionBtn icon="help-circle-outline" label="Preguntas" onPress={() => onAbrirPreguntas(nodo.id, nodo.titulo)} />
            </>
          ) : (
            <ActionBtn icon="document-text-outline" label="+ Lección" onPress={() => handleAgregarHijo('leccion')} />
          )}
          <ActionBtn icon="create-outline" label="Renombrar" onPress={handleRenombrar} />
          <ActionBtn icon="trash-outline" label="Eliminar" onPress={handleEliminar} danger />
        </View>
      </View>

      {!isLeccion && expanded && nodo.hijos.map((h, i) => (
        <NodoSeccion
          key={h.id}
          nodo={h}
          depth={depth + 1}
          cursoId={cursoId}
          preguntasMap={preguntasMap}
          hijosTotales={nodo.hijos.length}
          indice={i}
          onReload={onReload}
          onOpenModal={onOpenModal}
          onAbrirPreguntas={onAbrirPreguntas}
          onAbrirContenido={onAbrirContenido}
          onMover={onMover}
          navigation={navigation}
        />
      ))}
    </View>
  );
}

function ActionBtn({
  icon, label, onPress, danger,
}: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? '#E05A4E' : NAVY;
  return (
    <TouchableOpacity style={n.action} onPress={onPress}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[n.actionTxt, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EditorSeccionesScreen({ navigation, route }: any) {
  const { cursoId, titulo } = route?.params ?? {};
  const insets = useSafeAreaInsets();

  const [curso, setCurso]         = useState<Curso | null>(null);
  const [arbol, setArbol]         = useState<SeccionArbol[]>([]);
  const [preguntasMap, setPreguntasMap] = useState<Record<string, number>>({});
  const [loading, setLoading]     = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modal, setModal]         = useState<ModalConfig | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = (cfg: ModalConfig) => {
    setModal(cfg);
    setModalVisible(true);
  };

  const load = useCallback(async () => {
    if (!cursoId) return;
    const [{ data: cursoData }, { data: secs }] = await Promise.all([
      getCurso(cursoId),
      getSecciones(cursoId),
    ]);
    setCurso(cursoData);
    setArbol(buildTree(secs));
    if (secs.length > 0) {
      const map = await contarPreguntasPorSecciones(secs.map(s => s.id));
      setPreguntasMap(map);
    } else {
      setPreguntasMap({});
    }
  }, [cursoId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const handleAgregarRaiz = (tipo: 'seccion' | 'leccion') => {
    openModal({
      titulo: tipo === 'seccion' ? 'Nueva sección' : 'Nueva lección',
      placeholder: tipo === 'seccion' ? 'Ej: Unidad 1 - Fundamentos' : 'Ej: Introducción',
      onSave: async (titulo) => {
        await agregarSeccion({
          curso_id: cursoId,
          parent_id: null,
          titulo,
          orden: arbol.length,
          tipo,
        });
        load();
      },
    });
  };

  const togglePublicar = async () => {
    if (!curso) return;
    if (!curso.publicado && arbol.length === 0) {
      Alert.alert('Sin contenido', 'Agrega al menos una sección antes de publicar.');
      return;
    }
    setGuardando(true);
    const { error } = curso.publicado
      ? await despublicarCurso(curso.id)
      : await publicarCurso(curso.id);

    if (error) {
      Alert.alert('Error', error);
    } else {
      const next = !curso.publicado;
      setCurso({ ...curso, publicado: next });
      if (next) Alert.alert('¡Publicado!', 'El curso ya es visible para los estudiantes.');
    }
    setGuardando(false);
  };

  const handleEliminarCurso = () => {
    if (!curso) return;
    Alert.alert(
      'Eliminar curso',
      `¿Eliminar "${curso.titulo}" y todo su contenido?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { error } = await eliminarCurso(curso.id);
            if (error) Alert.alert('Error', error);
            else navigation.goBack();
          },
        },
      ]
    );
  };

  const handleMover = async (id: string, dir: 'arriba' | 'abajo') => {
    await moverSeccion(id, dir);
    load();
  };

  const abrirPreguntas = (seccionId: string, tituloLec: string) => {
    navigation.navigate('EditorPreguntas', { seccionId, titulo: tituloLec });
  };

  const abrirContenido = (seccion: Seccion) => {
    navigation.navigate('EditorContenido', {
      seccionId: seccion.id,
      cursoId,
      titulo: seccion.titulo,
    });
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  const cursoTitulo = curso?.titulo ?? titulo ?? 'Editor';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Editor</Text>
        <TouchableOpacity
          style={[s.pubBtn, curso?.publicado && s.pubBtnActive]}
          onPress={togglePublicar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator size="small" color={curso?.publicado ? '#fff' : NAVY} />
          ) : (
            <>
              <Ionicons
                name={curso?.publicado ? 'checkmark-circle' : 'cloud-upload-outline'}
                size={14}
                color={curso?.publicado ? '#fff' : NAVY}
              />
              <Text style={[s.pubTxt, curso?.publicado && s.pubTxtActive]}>
                {curso?.publicado ? 'Publicado' : 'Publicar'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.cursoCard}>
          <View style={s.cursoTop}>
            <View style={s.cursoIcon}>
              <Ionicons name="book" size={22} color={NAVY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cursoTitulo} numberOfLines={2}>{cursoTitulo}</Text>
              {curso?.descripcion ? (
                <Text style={s.cursoDesc} numberOfLines={2}>{curso.descripcion}</Text>
              ) : null}
              <View style={s.cursoMeta}>
                {curso?.nivel ? (
                  <View style={[s.nivelPill, { backgroundColor: `${NIVEL_COLOR[curso.nivel] ?? NAVY}22` }]}>
                    <Text style={[s.nivelTxt, { color: NIVEL_COLOR[curso.nivel] ?? NAVY }]}>{curso.nivel}</Text>
                  </View>
                ) : null}
                {curso?.idioma_objetivo ? (
                  <View style={s.idiomaPill}>
                    <Ionicons name="globe-outline" size={11} color="#666" />
                    <Text style={s.idiomaTxt}>{curso.idioma_objetivo}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <View style={s.cursoActions}>
            <TouchableOpacity
              style={s.cursoAction}
              onPress={() => navigation.navigate('CrearCurso', { cursoId })}
            >
              <Ionicons name="information-circle-outline" size={15} color={NAVY} />
              <Text style={s.cursoActionTxt}>Editar info</Text>
            </TouchableOpacity>
            <View style={s.cursoActionDiv} />
            <TouchableOpacity style={s.cursoAction} onPress={handleEliminarCurso}>
              <Ionicons name="trash-outline" size={15} color="#E05A4E" />
              <Text style={[s.cursoActionTxt, { color: '#E05A4E' }]}>Eliminar curso</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.sectionLabel}>Estructura del curso</Text>

        {arbol.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="folder-open-outline" size={48} color="#BBB" />
            <Text style={s.emptyTxt}>El curso está vacío</Text>
            <Text style={s.emptySub}>Agrega secciones o lecciones con los botones de abajo.</Text>
          </View>
        ) : (
          arbol.map((nodo, i) => (
            <NodoSeccion
              key={nodo.id}
              nodo={nodo}
              depth={0}
              cursoId={cursoId}
              preguntasMap={preguntasMap}
              hijosTotales={arbol.length}
              indice={i}
              onReload={load}
              onOpenModal={openModal}
              onAbrirPreguntas={abrirPreguntas}
              onAbrirContenido={abrirContenido}
              onMover={handleMover}
              navigation={navigation}
            />
          ))
        )}
      </ScrollView>

      <View style={[s.fabWrap, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={s.fabLabel}>Agregar al curso</Text>
        <View style={s.fabRow}>
          <TouchableOpacity
            style={[s.fab, { backgroundColor: NAVY }]}
            onPress={() => handleAgregarRaiz('seccion')}
            activeOpacity={0.85}
          >
            <Ionicons name="folder-open" size={16} color="#fff" />
            <Text style={s.fabTxt}>Sección</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.fab, { backgroundColor: GREEN }]}
            onPress={() => handleAgregarRaiz('leccion')}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text" size={16} color="#fff" />
            <Text style={s.fabTxt}>Lección</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ModalInput
        visible={modalVisible}
        titulo={modal?.titulo ?? ''}
        placeholder={modal?.placeholder}
        valor={modal?.valor}
        multiline={modal?.multiline}
        onSave={(v) => modal?.onSave(v)}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14, backgroundColor: BG,
  },
  backBtn:     { width: 32 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#111', textAlign: 'center' },
  pubBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: NAVY,
    borderRadius: 100, paddingVertical: 6, paddingHorizontal: 12,
    minWidth: 100, justifyContent: 'center',
  },
  pubBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  pubTxt:       { fontSize: 12, fontWeight: '800', color: NAVY },
  pubTxtActive: { color: '#fff' },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  cursoCard: {
    backgroundColor: WHITE, borderRadius: 14,
    marginBottom: 18, overflow: 'hidden',
  },
  cursoTop: { flexDirection: 'row', gap: 12, padding: 14 },
  cursoIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(43,76,114,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  cursoTitulo: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 2 },
  cursoDesc:   { fontSize: 12, color: '#777', marginBottom: 8, lineHeight: 17 },
  cursoMeta:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  nivelPill:   { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  nivelTxt:    { fontSize: 11, fontWeight: '800' },
  idiomaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0F0F0', borderRadius: 6,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  idiomaTxt: { fontSize: 11, fontWeight: '700', color: '#666' },
  cursoActions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  cursoActionDiv: { width: 1, backgroundColor: '#F0F0F0' },
  cursoAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, height: 40,
  },
  cursoActionTxt: { fontSize: 12, fontWeight: '700', color: NAVY },

  sectionLabel: {
    fontSize: 11, color: '#888', fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 10, marginLeft: 4,
  },

  emptyBox: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24 },
  emptyTxt: { fontSize: 15, fontWeight: '800', color: '#444', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  fabWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 8,
    backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: '#E8E8E8',
  },
  fabLabel: { fontSize: 11, color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  fabRow: { flexDirection: 'row', gap: 8 },
  fab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 46, borderRadius: 12,
  },
  fabTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const n = StyleSheet.create({
  card: {
    backgroundColor: WHITE, borderRadius: 12,
    marginBottom: 8, overflow: 'hidden',
  },
  cardLeccion: { backgroundColor: '#FBFCFD', borderWidth: 1, borderColor: '#EFEFEF' },

  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 12,
  },

  expandBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  leccionDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(43,76,114,0.10)',
  },

  titulo:        { fontSize: 14, fontWeight: '700', color: '#111' },
  tituloLeccion: { fontWeight: '600', color: '#333', fontSize: 13 },

  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  metaTxt: { fontSize: 11, color: '#999' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F2F2F2', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeOk:  { backgroundColor: '#E9F5EE' },
  badgeTxt: { fontSize: 10, fontWeight: '700', color: '#999' },

  moveBtns: { flexDirection: 'row', gap: 4 },
  moveBtn: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },

  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  action: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3, height: 36,
    borderRightWidth: 1, borderRightColor: '#F0F0F0',
  },
  actionTxt: { fontSize: 11, fontWeight: '700' },
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
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111',
    height: 50, borderWidth: 1, borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  inputMulti: { height: 130, paddingTop: 12, textAlignVertical: 'top' },
  btnRow: { flexDirection: 'row', gap: 10 },
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
