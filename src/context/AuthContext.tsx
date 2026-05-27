import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, TipoUsuario } from '../types';
import { getUserProfile, validarCodigoInvitacion, marcarCodigoUsado } from '../services/usuariosService';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    tipo?: TipoUsuario,
    codigoInvitacion?: string,
    nivel?: string
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  reclamarProfesor: (codigoInvitacion: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]           = useState<Session | null>(null);
  const [user, setUser]                 = useState<User | null>(null);
  const [userProfile, setUserProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]           = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await getUserProfile(userId);
    console.log('[AuthContext] fetchProfile →', { userId, data, error });

    if (data) {
      setUserProfile(data);
      return;
    }

    const errLower = (error ?? '').toLowerCase();
    const isNotFound =
      !error
      || errLower.includes('pgrst116')
      || errLower.includes('no rows')
      || errLower.includes('coerce')
      || errLower.includes('json object');

    if (!isNotFound) {
      console.error('[AuthContext] fetchProfile error (not creating row):', error);
      return;
    }

    const { error: upsertErr } = await supabase.from('usuario').upsert(
      {
        id: userId,
        nombre: 'Usuario',
        email: '',
        tipo: 'estudiante',
        fecha_registro: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (upsertErr) {
      console.error('[AuthContext] fallback upsert failed:', upsertErr.message);
    }

    const { data: retry, error: retryErr } = await getUserProfile(userId);
    console.log('[AuthContext] fetchProfile retry →', { retry, retryErr });
    setUserProfile(retry);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const crearRegistroUsuario = async (
    userId: string,
    nombre: string,
    email: string,
    tipo: TipoUsuario,
    nivel?: string
  ): Promise<string | null> => {
    const nivelFinal = (tipo === 'profesor' || tipo === 'administrador') ? 'C2' : (nivel ?? null);
    const { error } = await supabase
      .from('usuario')
      .upsert(
        { id: userId, nombre, email, tipo, nivel: nivelFinal, fecha_registro: new Date().toISOString() },
        { onConflict: 'id' }
      );
    if (error) {
      console.error('[AuthContext] crearRegistroUsuario upsert failed:', error.message);
    }
    return error?.message ?? null;
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    tipo: TipoUsuario = 'estudiante',
    codigoInvitacion?: string,
    nivel?: string
  ) => {
    if (tipo === 'administrador') {
      return { error: 'Los administradores deben ser creados por otro administrador' };
    }

    if (tipo === 'profesor') {
      if (!codigoInvitacion?.trim()) {
        return { error: 'Los profesores necesitan un código de invitación' };
      }
      const { valido, codigoId } = await validarCodigoInvitacion(codigoInvitacion, 'profesor');
      if (!valido || !codigoId) {
        return { error: 'Código de invitación inválido o ya utilizado' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) return { error: error.message };
      
      if (data?.user && (data.user.identities?.length ?? 0) === 0) {
        return { error: 'Este correo ya está registrado. Inicia sesión o usa otro.' };
      }

      if (data?.user) {
        const upsertError = await crearRegistroUsuario(
          data.user.id,
          name.trim(),
          email.trim().toLowerCase(),
          'profesor',
          nivel
        );
        if (upsertError) return { error: 'Error asignando rol de profesor: ' + upsertError };
        await marcarCodigoUsado(codigoId);
        await fetchProfile(data.user.id);
      }
      return { error: null };
    }

    // Estudiante
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) return { error: error.message };

    if (data?.user && (data.user.identities?.length ?? 0) === 0) {
      return { error: 'Este correo ya está registrado. Inicia sesión o usa otro.' };
    }

    if (data?.user) {
      const upsertError = await crearRegistroUsuario(
        data.user.id,
        name.trim(),
        email.trim().toLowerCase(),
        'estudiante',
        nivel
      );
      if (upsertError) {
        return { error: 'Error creando perfil de usuario: ' + upsertError };
      }
      await fetchProfile(data.user.id);
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove([
      'vlingo_api_user_id',
      'vlingo_session_id',
      'vlingo_api_email',
    ]);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );
    if (error) return { error: error.message };
    return { error: null };
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id);
  };

  const reclamarProfesor = async (codigoInvitacion: string) => {
    if (!user) return { error: 'No hay sesión activa' };
    const { valido, codigoId } = await validarCodigoInvitacion(codigoInvitacion.trim(), 'profesor');
    if (!valido || !codigoId) return { error: 'Código de invitación inválido o ya utilizado' };
    const { error } = await supabase
      .from('usuario')
      .update({ tipo: 'profesor' })
      .eq('id', user.id);
    if (error) return { error: error.message };
    await marcarCodigoUsado(codigoId);
    await fetchProfile(user.id);
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, user, userProfile, loading, signUp, signIn, signOut, resetPassword, reclamarProfesor, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
