import { supabase } from '../lib/supabase';

export type TipoSkill = 'reading' | 'writing' | 'listening' | 'speaking';

export type TotalesApp = {
  reading:   number;
  writing:   number;
  listening: number;
  speaking:  number;
};

export const incrementarPuntos = async (
  userId: string,
  tipo: TipoSkill,
  monto: number = 1,
): Promise<void> => {
  await supabase.rpc('incrementar_puntos', {
    p_user_id: userId,
    p_tipo: tipo,
    p_monto: monto,
  });
};

export const getTotalesApp = async (): Promise<TotalesApp> => {
  const { data } = await supabase.rpc('get_totales_puntos_app');
  return data ?? { reading: 0, writing: 0, listening: 0, speaking: 0 };
};
