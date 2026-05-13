import { supabase } from '../lib/supabase';
import { Pregunta, TipoPregunta } from '../types';

export const MAX_PREGUNTAS_POR_SECCION = 10;

export const getPreguntasPorSeccion = async (
  seccionId: string
): Promise<{ data: Pregunta[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('pregunta')
    .select('*')
    .eq('seccion_id', seccionId)
    .order('orden');
  return { data: (data as Pregunta[]) ?? [], error: error?.message ?? null };
};

export const contarPreguntas = async (seccionId: string): Promise<number> => {
  const { count } = await supabase
    .from('pregunta')
    .select('id', { count: 'exact', head: true })
    .eq('seccion_id', seccionId);
  return count ?? 0;
};

export const crearPregunta = async (params: {
  seccion_id: string;
  tipo: TipoPregunta;
  enunciado: string;
  opciones: string[];
  respuesta_correcta: number;
}): Promise<{ data: Pregunta | null; error: string | null }> => {
  if (params.opciones.length !== 4) {
    return { data: null, error: 'Cada pregunta debe tener exactamente 4 opciones' };
  }
  if (params.respuesta_correcta < 0 || params.respuesta_correcta > 3) {
    return { data: null, error: 'La opción correcta debe ser un índice válido (0-3)' };
  }
  if (!params.enunciado.trim()) {
    return { data: null, error: 'El enunciado no puede estar vacío' };
  }
  if (params.opciones.some(o => !o.trim())) {
    return { data: null, error: 'Todas las opciones deben tener texto' };
  }

  const total = await contarPreguntas(params.seccion_id);
  if (total >= MAX_PREGUNTAS_POR_SECCION) {
    return { data: null, error: `Máximo ${MAX_PREGUNTAS_POR_SECCION} preguntas por sección` };
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('pregunta')
    .insert({
      seccion_id: params.seccion_id,
      tipo: params.tipo,
      enunciado: params.enunciado.trim(),
      opciones: params.opciones.map(o => o.trim()),
      respuesta_correcta: params.respuesta_correcta,
      orden: total,
      creado_por: user?.id,
    })
    .select()
    .single();
  return { data: data as Pregunta | null, error: error?.message ?? null };
};

export const actualizarPregunta = async (
  id: string,
  updates: Partial<Pick<Pregunta, 'tipo' | 'enunciado' | 'opciones' | 'respuesta_correcta'>>
): Promise<{ error: string | null }> => {
  if (updates.opciones && updates.opciones.length !== 4) {
    return { error: 'Cada pregunta debe tener exactamente 4 opciones' };
  }
  if (
    updates.respuesta_correcta !== undefined &&
    (updates.respuesta_correcta < 0 || updates.respuesta_correcta > 3)
  ) {
    return { error: 'La opción correcta debe ser un índice válido (0-3)' };
  }
  if (updates.enunciado !== undefined && !updates.enunciado.trim()) {
    return { error: 'El enunciado no puede estar vacío' };
  }
  if (updates.opciones && updates.opciones.some(o => !o.trim())) {
    return { error: 'Todas las opciones deben tener texto' };
  }

  const payload: Record<string, unknown> = { ...updates };
  if (updates.enunciado) payload.enunciado = updates.enunciado.trim();
  if (updates.opciones) payload.opciones = updates.opciones.map(o => o.trim());

  const { error } = await supabase.from('pregunta').update(payload).eq('id', id);
  return { error: error?.message ?? null };
};

export const eliminarPregunta = async (id: string): Promise<{ error: string | null }> => {
  const { error } = await supabase.from('pregunta').delete().eq('id', id);
  return { error: error?.message ?? null };
};
