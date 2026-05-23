import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { TipoUsuario } from '../types';

const NAVY  = '#2B4C72';
const BG    = '#F2F4F6';
const WHITE = '#fff';
const RED   = '#E05A4E';
const AMBER = '#F0A500';
const BLUE  = '#3A7BD5';

export default function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [tipo, setTipo]             = useState<TipoUsuario>('estudiante');
  const [nivel, setNivel]           = useState('');
  const [codigo, setCodigo]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())   e.name = 'El nombre es requerido';
    if (!email.trim())  e.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido';
    if (!password)      e.password = 'La contraseña es requerida';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (!confirm)       e.confirm = 'Confirma tu contraseña';
    else if (confirm !== password) e.confirm = 'Las contraseñas no coinciden';
    if (tipo === 'estudiante' && !nivel) {
      e.nivel = 'Selecciona tu nivel de inglés';
    }
    if (tipo === 'profesor' && !codigo.trim()) {
      e.codigo = 'El código de invitación es requerido para profesores';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(email, password, name, tipo, codigo || undefined, nivel || undefined);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert(
        '¡Cuenta creada!',
        'Revisa tu correo para confirmar tu cuenta.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  const clear = (field: string) =>
    setErrors(p => { const n = { ...p }; delete n[field]; return n; });

  const strength =
    password.length === 0   ? null :
    password.length < 6     ? { label: 'Débil',   color: RED,   width: '33%' } :
    password.length < 10    ? { label: 'Media',   color: AMBER, width: '66%' } :
                              { label: 'Fuerte',  color: BLUE,  width: '100%' };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
            <Text style={s.tagline}>Crea tu cuenta gratis</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Crear cuenta</Text>
            <Text style={s.cardSub}>Únete y empieza a aprender inglés</Text>

            {/* Tipo de cuenta */}
            <Text style={s.label}>Tipo de cuenta</Text>
            <View style={s.tipoRow}>
              <TouchableOpacity
                style={[s.tipoBtn, tipo === 'estudiante' && s.tipoBtnActive]}
                onPress={() => { setTipo('estudiante'); setCodigo(''); clear('codigo'); }}
              >
                <Text style={[s.tipoBtnTxt, tipo === 'estudiante' && s.tipoBtnTxtActive]}>
                  Estudiante
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tipoBtn, tipo === 'profesor' && s.tipoBtnActive]}
                onPress={() => setTipo('profesor')}
              >
                <Text style={[s.tipoBtnTxt, tipo === 'profesor' && s.tipoBtnTxtActive]}>
                  Profesor
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nivel — solo estudiante */}
            {tipo === 'estudiante' && (
              <>
                <Text style={s.label}>Nivel de inglés</Text>
                <View style={s.nivelGrid}>
                  {NIVELES.map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[s.nivelBtn, nivel === n && s.nivelBtnActive]}
                      onPress={() => { setNivel(n); clear('nivel'); }}
                    >
                      <Text style={[s.nivelBtnTxt, nivel === n && s.nivelBtnTxtActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.nivel ? <Text style={s.errorText}>{errors.nivel}</Text> : null}
              </>
            )}

            {/* Nombre */}
            <Text style={s.label}>Nombre completo</Text>
            <View style={[s.inputWrap, errors.name ? s.inputError : null]}>
              <Text style={s.inputIcon}></Text>
              <TextInput
                style={s.input}
                placeholder="Tu nombre"
                placeholderTextColor="#BBB"
                value={name}
                onChangeText={t => { setName(t); clear('name'); }}
                autoCapitalize="words"
              />
            </View>
            {errors.name ? <Text style={s.errorText}>{errors.name}</Text> : null}

            {/* Email */}
            <Text style={s.label}>Correo electrónico</Text>
            <View style={[s.inputWrap, errors.email ? s.inputError : null]}>
              <Text style={s.inputIcon}></Text>
              <TextInput
                style={s.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#BBB"
                value={email}
                onChangeText={t => { setEmail(t); clear('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email ? <Text style={s.errorText}>{errors.email}</Text> : null}

            {/* Password */}
            <Text style={s.label}>Contraseña</Text>
            <View style={[s.inputWrap, errors.password ? s.inputError : null]}>
              <Text style={s.inputIcon}></Text>
              <TextInput
                style={s.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#BBB"
                value={password}
                onChangeText={t => { setPassword(t); clear('password'); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)}>
                <Text style={s.eyeIcon}>{showPass ? '' : ''}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={s.errorText}>{errors.password}</Text> : null}

            {strength && (
              <View style={s.strengthWrap}>
                <View style={s.strengthTrack}>
                  <View style={[s.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
                </View>
                <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            {/* Confirm */}
            <Text style={s.label}>Confirmar contraseña</Text>
            <View style={[s.inputWrap, errors.confirm ? s.inputError : null]}>
              <Text style={s.inputIcon}></Text>
              <TextInput
                style={s.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#BBB"
                value={confirm}
                onChangeText={t => { setConfirm(t); clear('confirm'); }}
                secureTextEntry={!showConf}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConf(p => !p)}>
                <Text style={s.eyeIcon}>{showConf ? '' : ''}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirm ? <Text style={s.errorText}>{errors.confirm}</Text> : null}

            {/* Invitation code — only for profesor */}
            {tipo === 'profesor' && (
              <>
                <Text style={s.label}>Código de invitación</Text>
                <View style={[s.inputWrap, errors.codigo ? s.inputError : null]}>
                  <Text style={s.inputIcon}></Text>
                  <TextInput
                    style={s.input}
                    placeholder="Código proporcionado por tu institución"
                    placeholderTextColor="#BBB"
                    value={codigo}
                    onChangeText={t => { setCodigo(t); clear('codigo'); }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
                {errors.codigo
                  ? <Text style={s.errorText}>{errors.codigo}</Text>
                  : <Text style={s.hintText}>Solicita tu código al administrador de la plataforma</Text>
                }
              </>
            )}

            <TouchableOpacity
              style={[s.btn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={WHITE} />
                : <Text style={s.btnText}>Crear cuenta</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={s.switchRow}>
            <Text style={s.switchText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.switchLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, paddingBottom: 80 },

  backBtn:  { marginBottom: 8 },
  backText: { color: NAVY, fontSize: 14, fontWeight: '600' },

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
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 4 },
  cardSub:   { fontSize: 13, color: '#888', marginBottom: 4 },

  // Tipo selector
  tipoRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tipoBtn: {
    flex: 1, height: 42,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  tipoBtnActive: { borderColor: NAVY, backgroundColor: 'rgba(43,76,114,0.07)' },
  tipoBtnTxt:    { fontSize: 13, fontWeight: '600', color: '#999' },
  tipoBtnTxtActive: { color: NAVY },

  label:      { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1, borderColor: '#E8E8E8',
    borderRadius: 10, paddingHorizontal: 12, height: 50,
  },
  inputError: { borderColor: RED },
  inputIcon:  { fontSize: 15, marginRight: 8 },
  eyeIcon:    { fontSize: 15, paddingHorizontal: 4 },
  input:      { flex: 1, fontSize: 14, color: '#111' },
  errorText:  { fontSize: 11, color: RED, marginTop: 4 },
  hintText:   { fontSize: 11, color: '#AAA', marginTop: 4 },

  strengthWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthTrack: { flex: 1, height: 3, backgroundColor: '#E8E8E8', borderRadius: 100 },
  strengthFill:  { height: 3, borderRadius: 100 },
  strengthLabel: { fontSize: 11, fontWeight: '600', width: 44 },

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

  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: 13, color: '#888' },
  switchLink: { fontSize: 13, color: NAVY, fontWeight: '700' },

  nivelGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  nivelBtn:        {
    width: '30%', height: 42,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  nivelBtnActive:  { borderColor: NAVY, backgroundColor: 'rgba(43,76,114,0.07)' },
  nivelBtnTxt:     { fontSize: 14, fontWeight: '700', color: '#999' },
  nivelBtnTxtActive: { color: NAVY },
});
