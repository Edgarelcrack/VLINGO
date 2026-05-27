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
): Promise<{ valido: boolean; codigoId: string | null }> => {

  const codigoNormalizado = codigo.trim();
  const tipoNormalizado = tipo.trim();

  const { data, error } = await supabase
    .from('codigo_invitacion')
    .select('*')
    .eq('codigo', codigoNormalizado)
    .eq('tipo_destino', tipoNormalizado)
    .eq('usado', false);

  console.log("DEBUG VALIDACION:", {
    codigoNormalizado,
    tipoNormalizado,
    data,
    error
  });

  if (error) {
    console.log("ERROR REAL:", error);
    return { valido: false, codigoId: null };
  }

  if (!data || data.length === 0) {
    return { valido: false, codigoId: null };
  }

  return { valido: true, codigoId: data[0].id };
};

export const marcarCodigoUsado = async (codigoId: string): Promise<void> => {
  await supabase
    .from('codigo_invitacion')
    .update({ usado: true })
    .eq('id', codigoId);
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
