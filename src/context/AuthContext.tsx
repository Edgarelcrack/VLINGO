import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: name.trim() },
      },
    });
    if (error) return { error: error.message };
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
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );
    if (error) return { error: error.message };
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
