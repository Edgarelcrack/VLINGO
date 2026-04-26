import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSecciones, agregarSeccion, actualizarSeccion,
  eliminarSeccion, publicarCurso, despublicarCurso,
  buildTree,
} from '../services/cursosService';
import { Seccion, SeccionArbol, ContenidoBloque } from '../types';

const NAVY = '#2B4C72';
const BG   = '#F2F4F6';

// ── Modal de entrada de texto (cross-platform) ────────────────────────────────
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
  useEffect(() => { setTxt(valor ?? ''); }, [valor, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={m.sheet}>
          <Text style={m.sheetTitle}>{titulo}</Text>
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

// ── Tipo del modal de entrada ──────────────────────────────────────────────────
type ModalConfig = {
  titulo: string;
  placeholder?: string;
  valor?: string;
  multiline?: boolean;
  onSave: (v: string) => void;
};

// ── Nodo recursivo del árbol ───────────────────────────────────────────────────
function NodoSeccion({
  nodo, depth, cursoId, onReload, onOpenModal,
}: {
  nodo: SeccionArbol;
  depth: number;
  cursoId: string;
  onReload: () => void;
  onOpenModal: (cfg: ModalConfig) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const indent = depth * 16;
  const isLeccion = nodo.tipo === 'leccion';

  const handleAgregarHijo = (tipo: 'seccion' | 'leccion') => {
    onOpenModal({
      titulo: tipo === 'leccion' ? 'Nueva lección' : 'Nueva subsección',
      placeholder: 'Título',
      onSave: async (titulo) => {
        await agregarSeccion({
          curso_id: cursoId,
          parent_id: nodo.id,
          titulo,
          orden: nodo.hijos.length,
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

  const handleEditContenido = () => {
    const bloques = nodo.contenido?.bloques ?? [];
    const texto = bloques
      .filter(b => b.tipo === 'texto')
      .map(b => b.valor ?? '')
      .join('\n\n');
    onOpenModal({
      titulo: `Contenido: ${nodo.titulo}`,
      placeholder: 'Escribe el contenido de la lección…',
      valor: texto,
      multiline: true,
      onSave: async (contenidoTxt) => {
        const bloquesList: ContenidoBloque[] = contenidoTxt
          .split('\n\n')
          .filter(t => t.trim())
          .map(t => ({ tipo: 'texto', valor: t.trim() }));
        await actualizarSeccion(nodo.id, { contenido: { bloques: bloquesList } });
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
    <View>
      <View style={[n.row, { marginLeft: indent }]}>
        {!isLeccion ? (
          <TouchableOpacity onPress={() => setExpanded(e => !e)} style={n.iconBtn}>
            <Text style={n.expandIcon}>{expanded ? '▾' : '▸'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={n.iconBtn}><Text style={{ fontSize: 12 }}>📄</Text></View>
        )}

        <Text style={[n.titulo, isLeccion && n.tituloLeccion]} numberOfLines={1}>
          {nodo.titulo}
        </Text>

        {isLeccion && (
          <TouchableOpacity style={n.actionBtn} onPress={handleEditContenido}>
            <Text style={n.actionTxt}>Editar</Text>
          </TouchableOpacity>
        )}

        {!isLeccion && (
          <>
            <TouchableOpacity style={n.actionBtn} onPress={() => handleAgregarHijo('seccion')}>
              <Text style={n.actionTxt}>+Sec</Text>
            </TouchableOpacity>
            <TouchableOpacity style={n.actionBtn} onPress={() => handleAgregarHijo('leccion')}>
              <Text style={n.actionTxt}>+Lec</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={n.actionBtn} onPress={handleRenombrar}>
          <Text style={n.actionTxt}>Renombrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={n.actionBtn} onPress={handleEliminar}>
          <Text style={[n.actionTxt, { color: '#E05A4E' }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {expanded && nodo.hijos.map(h => (
        <NodoSeccion
          key={h.id}
          nodo={h}
          depth={depth + 1}
          cursoId={cursoId}
          onReload={onReload}
          onOpenModal={onOpenModal}
        />
      ))}
    </View>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────
export default function EditorSeccionesScreen({ navigation, route }: any) {
  const { cursoId, titulo } = route?.params ?? {};

  const [arbol, setArbol]         = useState<SeccionArbol[]>([]);
  const [loading, setLoading]     = useState(true);
  const [publicado, setPublicado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modal, setModal]         = useState<ModalConfig | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = (cfg: ModalConfig) => {
    setModal(cfg);
    setModalVisible(true);
  };

  const load = useCallback(async () => {
    if (!cursoId) return;
    const { data } = await getSecciones(cursoId);
    setArbol(buildTree(data));
  }, [cursoId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

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
    if (!publicado && arbol.length === 0) {
      Alert.alert('Sin contenido', 'Agrega al menos una sección antes de publicar.');
      return;
    }
    setGuardando(true);
    const { error } = publicado
      ? await despublicarCurso(cursoId)
      : await publicarCurso(cursoId);

    if (error) {
      Alert.alert('Error', error);
    } else {
      const next = !publicado;
      setPublicado(next);
      if (next) Alert.alert('¡Publicado!', 'El curso ya es visible para los estudiantes.');
    }
    setGuardando(false);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{titulo ?? 'Editor'}</Text>
        <TouchableOpacity
          style={[s.pubBtn, publicado && s.pubBtnActive]}
          onPress={togglePublicar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator size="small" color={publicado ? '#fff' : NAVY} />
            : <Text style={[s.pubTxt, publicado && s.pubTxtActive]}>
                {publicado ? 'Publicado ✓' : 'Publicar'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Leyenda */}
        <View style={s.legend}>
          <Text style={s.legendTxt}>Editar · Renombrar · Eliminar · +Sec · +Lec</Text>
        </View>

        {arbol.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}></Text>
            <Text style={s.emptyTxt}>El curso está vacío</Text>
            <Text style={s.emptySub}>Usa los botones de abajo para agregar contenido</Text>
          </View>
        ) : (
          <View style={s.tree}>
            {arbol.map(nodo => (
              <NodoSeccion
                key={nodo.id}
                nodo={nodo}
                depth={0}
                cursoId={cursoId}
                onReload={load}
                onOpenModal={openModal}
              />
            ))}
          </View>
        )}

        {/* Botones raíz */}
        <View style={s.addRow}>
          <TouchableOpacity style={s.addBtn} onPress={() => handleAgregarRaiz('seccion')}>
            <Text style={s.addTxt}>+ Sección</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.addBtn, s.addBtnGreen]} onPress={() => handleAgregarRaiz('leccion')}>
            <Text style={[s.addTxt, s.addTxtGreen]}>+ Lección</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de entrada cross-platform */}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: BG,
  },
  backBtn:     { width: 32 },
  backArrow:   { fontSize: 22, color: '#111' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111', textAlign: 'center' },
  pubBtn: {
    borderWidth: 1.5, borderColor: NAVY,
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
    minWidth: 84, alignItems: 'center',
  },
  pubBtnActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  pubTxt:       { fontSize: 12, fontWeight: '700', color: NAVY },
  pubTxtActive: { color: '#fff' },

  content: { paddingHorizontal: 16, paddingTop: 8 },

  legend: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 12, gap: 2 },
  legendTxt: { fontSize: 11, color: '#888' },

  tree: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 4, marginBottom: 16,
  },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTxt:  { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptySub:  { fontSize: 12, color: '#999', textAlign: 'center' },

  addRow: { flexDirection: 'row', gap: 10 },
  addBtn: {
    flex: 1, height: 46,
    backgroundColor: 'rgba(43,76,114,0.09)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  addBtnGreen: { backgroundColor: 'rgba(46,125,50,0.09)' },
  addTxt:      { fontSize: 13, fontWeight: '700', color: NAVY },
  addTxtGreen: { color: '#2E7D32' },
});

const n = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12, gap: 4,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  iconBtn:     { width: 24, alignItems: 'center' },
  expandIcon:  { fontSize: 14, color: '#888' },

  titulo:       { flex: 1, fontSize: 14, fontWeight: '600', color: '#222' },
  tituloLeccion:{ color: '#555', fontWeight: '500', fontSize: 13 },

  actionBtn: { paddingHorizontal: 4 },
  actionTxt: { fontSize: 15, color: NAVY },
});

const m = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 14 },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111',
    height: 50, borderWidth: 1, borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  inputMulti: { height: 130 },
  btnRow:      { flexDirection: 'row', gap: 10 },
  btnCancel: {
    flex: 1, height: 46, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
  },
  btnCancelTxt: { fontSize: 14, fontWeight: '600', color: '#888' },
  btnSave: {
    flex: 1, height: 46, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: NAVY,
  },
  btnSaveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
