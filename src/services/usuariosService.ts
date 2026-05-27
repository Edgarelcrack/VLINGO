import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export const getUserProfile = async (userId: string): Promise<{ data: UserProfile | null; error: string | null }> => {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, email, nivel, tipo, fecha_registro, xp_total, puntos_reading, puntos_writing, puntos_listening, puntos_speaking')
    .eq('id', userId)
    .single();
  return { data: data as UserProfile | null, error: error?.message ?? null };
};

export const validarCodigoInvitacion = async (
  codigo: string,
  tipo: string
): Promise<{ valido: boolean }> => {
  const { data, error } = await supabase.rpc('validar_codigo_invitacion', {
    p_codigo: codigo.trim(),
    p_tipo: tipo.trim(),
  });
  if (error) {
    console.warn('[validarCodigoInvitacion] error:', error.message);
    return { valido: false };
  }
  return { valido: data === true };
};

export const consumirCodigoInvitacion = async (
  codigo: string,
  tipo: string
): Promise<{ consumido: boolean }> => {
  const { data, error } = await supabase.rpc('consumir_codigo_invitacion', {
    p_codigo: codigo.trim(),
    p_tipo: tipo.trim(),
  });
  if (error) {
    console.warn('[consumirCodigoInvitacion] error:', error.message);
    return { consumido: false };
  }
  return { consumido: data === true };
};

export const ascenderAProfesor = async (
  codigo: string
): Promise<{ ok: boolean; error: string | null }> => {
  const { data, error } = await supabase.rpc('ascender_a_profesor', {
    p_codigo: codigo.trim(),
  });
  if (error) return { ok: false, error: error.message };
  if (data !== true) return { ok: false, error: 'Código inválido o ya utilizado' };
  return { ok: true, error: null };
};

export const actualizarNivel = async (
  userId: string,
  nivel: string,
): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from('usuario')
    .update({ nivel })
    .eq('id', userId);
  return { error: error?.message ?? null };
};
