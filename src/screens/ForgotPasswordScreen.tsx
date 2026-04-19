import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const NAVY  = '#2B4C72';
const BG    = '#F2F4F6';
const WHITE = '#fff';
const RED   = '#E05A4E';

type Step = 'form' | 'sent';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { resetPassword } = useAuth();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState<Step>('form');
  const [error, setError]     = useState('');

  const handleReset = async () => {
    if (!email.trim()) { setError('El correo es requerido'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Correo inválido'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) setError(err);
    else setStep('sent');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>

          <View style={s.logoWrap}>
            <View style={s.logoCircle}>
              <Text style={s.logoText}>V</Text>
            </View>
            <Text style={s.appName}>VLINGO</Text>
            <Text style={s.tagline}>Recupera tu acceso</Text>
          </View>

          {step === 'form' ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Recuperar contraseña</Text>
              <Text style={s.cardSub}>
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </Text>

              <Text style={s.label}>Correo electrónico</Text>
              <View style={[s.inputWrap, error ? s.inputError : null]}>
                <Text style={s.inputIcon}></Text>
                <TextInput
                  style={s.input}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#BBB"
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.btn, loading && { opacity: 0.7 }]}
                onPress={handleReset}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={WHITE} />
                  : <Text style={s.btnText}>Enviar enlace</Text>
                }
              </TouchableOpacity>
            </View>

          ) : (
            <View style={s.card}>
              <View style={s.successIconWrap}>
                <Text style={s.successEmoji}>📬</Text>
              </View>

              <Text style={s.cardTitle}>¡Correo enviado!</Text>
              <Text style={s.cardSub}>
                Revisá tu bandeja de entrada en{' '}
                <Text style={s.emailHighlight}>{email}</Text>
                {' '}y sigue el enlace para restablecer tu contraseña.
              </Text>

              <View style={s.infoBox}>
                <Text style={s.infoText}>Si no lo ves, revisa la carpeta de spam.</Text>
              </View>
              <TouchableOpacity
                style={s.btn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={s.btnText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.btnOutline}
                onPress={() => { setStep('form'); setEmail(''); }}
                activeOpacity={0.85}
              >
                <Text style={s.btnOutlineText}>Reenviar correo</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center' },

  // Back
  backBtn:  { marginBottom: 8 },
  backText: { color: NAVY, fontSize: 14, fontWeight: '600' },

  // Logo — exact copy from LoginScreen
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: NAVY, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  logoText: { fontSize: 32, fontWeight: '900', color: WHITE },
  appName:  { fontSize: 26, fontWeight: '800', color: '#111', letterSpacing: 4, marginBottom: 4 },
  tagline:  { fontSize: 13, color: '#888' },

  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 8 },
  cardSub:   { fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 4 },

  label: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1, borderColor: '#E8E8E8',
    borderRadius: 10, paddingHorizontal: 12, height: 50,
  },
  inputError: { borderColor: RED },
  inputIcon:  { fontSize: 15, marginRight: 8 },
  input:      { flex: 1, fontSize: 14, color: '#111' },
  errorText:  { fontSize: 11, color: RED, marginTop: 4 },

  btn: {
    backgroundColor: NAVY,
    borderRadius: 10,
    height: 50,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 20,
    shadowColor: NAVY, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: WHITE },

  btnOutline: {
    borderWidth: 1.5, borderColor: NAVY,
    borderRadius: 10,
    height: 50,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 12,
  },
  btnOutlineText: { fontSize: 15, fontWeight: '700', color: NAVY },

  successIconWrap: { alignItems: 'center', marginBottom: 16 },
  successEmoji:    { fontSize: 40 },
  emailHighlight:  { color: NAVY, fontWeight: '600' },

  infoBox: {
    backgroundColor: '#EBF0F6',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  infoText: { fontSize: 12, color: '#4A6080', lineHeight: 18 },
});