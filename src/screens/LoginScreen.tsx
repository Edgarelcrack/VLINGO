import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const NAVY   = '#2B4C72';
const BG     = '#F2F4F6';
const WHITE  = '#fff';
const RED    = '#E05A4E';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim())                    e.email    = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Correo inválido';
    if (!password)                         e.password = 'La contraseña es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : error
      );
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoWrap}>
            <View style={s.logoCircle}>
              <Text style={s.logoText}>V</Text>
            </View>
            <Text style={s.appName}>VLINGO</Text>
            <Text style={s.tagline}>Aprende inglés con IA</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Iniciar sesión</Text>

            <Text style={s.label}>Correo electrónico</Text>
            <View style={[s.inputWrap, errors.email ? s.inputError : null]}>
              <Text style={s.inputIcon}></Text>
              <TextInput
                style={s.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#BBB"
                value={email}
                onChangeText={t => { setEmail(t); setErrors(p => ({ ...p, email: undefined })); }}
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
                placeholder="Tu contraseña"
                placeholderTextColor="#BBB"
                value={password}
                onChangeText={t => { setPassword(t); setErrors(p => ({ ...p, password: undefined })); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)}>
                <Text style={s.eyeIcon}>{showPass ? '' : ''}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={s.errorText}>{errors.password}</Text> : null}

            <TouchableOpacity
              style={s.forgotWrap}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={WHITE} />
                : <Text style={s.btnText}>Iniciar sesión</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={s.switchRow}>
            <Text style={s.switchText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.switchLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center' },

  // Logo
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
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 20 },

  label: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1, borderColor: '#E8E8E8',
    borderRadius: 10, paddingHorizontal: 12, height: 50,
  },
  inputError: { borderColor: RED },
  inputIcon:  { fontSize: 15, marginRight: 8 },
  eyeIcon:    { fontSize: 15, paddingHorizontal: 4 },
  input: { flex: 1, fontSize: 14, color: '#111' },
  errorText: { fontSize: 11, color: RED, marginTop: 4 },

 
  forgotWrap: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 4 },
  forgotText: { fontSize: 12, color: NAVY, fontWeight: '600' },

 
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
});