import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '../theme';

type Msg = { id: number; type: 'bot' | 'user' | 'fix'; text: string };

const INIT: Msg[] = [
  { id: 1, type: 'bot',  text: 'Buenos días usuario, continuemos con nuestra preparación. Dime la situación para corregir errores' },
  { id: 2, type: 'user', text: 'Sure, In my last job, two designers was arguing about the logo. I listen to both and suggested to combine their ideas' },
  { id: 3, type: 'fix',  text: 'ese es un error clasico, "Listened" es la forma en pasado correcta de la palabra, ademas que la forma correcta es "were arguing"' },
  { id: 4, type: 'user', text: 'Muchas gracias por corregir mis errores.' },
];

export default function ChatScreen({ navigation }: any) {
  const [msgs, setMsgs] = useState<Msg[]>(INIT);
  const [input, setInput] = useState('');
  const ref = useRef<ScrollView>(null);

  const send = () => {
    if (!input.trim()) return;
    setMsgs(p => [...p, { id: Date.now(), type: 'user', text: input.trim() }]);
    setInput('');
    setTimeout(() => {
      setMsgs(p => [...p, { id: Date.now() + 1, type: 'bot', text: '¡Muy bien! Sigamos practicando 😊' }]);
    }, 700);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}></Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>ChatBot</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={ref}
          contentContainerStyle={s.msgs}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
        >
          <Text style={s.timeLabel}>hoy, 9:41</Text>

          {msgs.map(m => (
            <View key={m.id} style={m.type === 'user' ? s.rowRight : s.rowLeft}>
              {m.type === 'fix' ? (
                <View style={s.fixBubble}>
                  <Text style={s.fixText}>{m.text}</Text>
                </View>
              ) : (
                <View style={[s.bubble, m.type === 'user' ? s.bubbleUser : s.bubbleBot]}>
                  <Text style={[s.bubbleText, m.type === 'user' && s.bubbleTextUser]}>
                    {m.text}
                  </Text>
                </View>
              )}
            </View>
          ))}

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Input bar */}
        <View style={s.inputBar}>
          <View style={s.inputIcon}>
            <Text style={{ fontSize: 18 }}>⌨️</Text>
          </View>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            returnKeyType="send"
            onSubmitEditing={send}
            multiline
          />
          <TouchableOpacity style={s.sendBtn} onPress={send} activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F4F6' },

  // Header (nuevo, como en el Figma)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F4F6',
    borderBottomWidth: 0,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  backArrow: { fontSize: 22, color: '#111', fontWeight: '400' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  // Messages
  msgs: { padding: 16, paddingTop: 8 },
  timeLabel: { textAlign: 'center', fontSize: 11, color: '#AAA', marginBottom: 20 },

  rowLeft:  { alignItems: 'flex-start', marginBottom: 12 },
  rowRight: { alignItems: 'flex-end',   marginBottom: 12 },

  bubble: { maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18 },
  bubbleBot: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    // subtle shadow
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: '#2B4C72',
    borderTopRightRadius: 4,
  },
  bubbleText: { fontSize: 13, color: '#222', lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },

  // Fix bubble — same as bot but text slightly muted
  fixBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 18, borderTopLeftRadius: 4,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  fixText: { fontSize: 13, color: '#444', lineHeight: 20 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  inputIcon: { paddingBottom: 2 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    paddingVertical: 6,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#2B4C72',
    alignItems: 'center', justifyContent: 'center',
  },
});