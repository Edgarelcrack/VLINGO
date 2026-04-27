import { supabase } from '../lib/supabase';
import { Curso, Seccion, SeccionArbol, ProgresoUsuario, EstadoSeccion } from '../types';



export const getCursos = async (
  tipo: string,
  userId: string
): Promise<{ data: Curso[]; error: string | null }> => {
  let query = supabase.from('curso').select('*');

  if (tipo === 'estudiante') {
    query = query.eq('publicado', true);
  } else if (tipo === 'profesor') {
    query = query.or(`publicado.eq.true,creado_por.eq.${userId}`);
  }
  // administrador sees all — no filter

  const { data, error } = await query.order('fecha_creacion', { ascending: false });
  return { data: (data as Curso[]) ?? [], error: error?.message ?? null };
};

export const getMisCursos = async (
  userId: string
): Promise<{ data: Curso[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('curso')
    .select('*')
    .eq('creado_por', userId)
    .order('fecha_creacion', { ascending: false });
  return { data: (data as Curso[]) ?? [], error: error?.message ?? null };
};

export const crearCurso = async (params: {
  titulo: string;
  descripcion?: string;
  nivel?: string;
  idioma_objetivo?: string;
}): Promise<{ data: Curso | null; error: string | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('curso')
    .insert({
      titulo: params.titulo.trim(),
      descripcion: params.descripcion?.trim() ?? null,
      nivel: params.nivel ?? null,
      idioma_objetivo: params.idioma_objetivo ?? 'inglés',
      creado_por: user?.id,
    })
    .select()
    .single();
  return { data: data as Curso | null, error: error?.message ?? null };
};

export const actualizarCurso = async (
  id: string,
  updates: Partial<Pick<Curso, 'titulo' | 'descripcion' | 'nivel' | 'idioma_objetivo' | 'publicado'>>
): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from('curso')
    .update({ ...updates, fecha_actualizacion: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
};

export const publicarCurso = async (id: string): Promise<{ error: string | null }> => {
  return actualizarCurso(id, { publicado: true });
};

export const despublicarCurso = async (id: string): Promise<{ error: string | null }> => {
  return actualizarCurso(id, { publicado: false });
};

export const eliminarCurso = async (id: string): Promise<{ error: string | null }> => {
  const { error } = await supabase.from('curso').delete().eq('id', id);
  return { error: error?.message ?? null };
};


export const getSecciones = async (
  cursoId: string
): Promise<{ data: Seccion[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('seccion')
    .select('*')
    .eq('curso_id', cursoId)
    .order('orden');
  return { data: (data as Seccion[]) ?? [], error: error?.message ?? null };
};

export const buildTree = (secciones: Seccion[]): SeccionArbol[] => {
  const map: Record<string, SeccionArbol> = {};
  secciones.forEach(s => { map[s.id] = { ...s, hijos: [] }; });

  const roots: SeccionArbol[] = [];
  secciones.forEach(s => {
    if (s.parent_id && map[s.parent_id]) {
      map[s.parent_id].hijos.push(map[s.id]);
    } else if (!s.parent_id) {
      roots.push(map[s.id]);
    }
  });
  return roots;
};

export const agregarSeccion = async (params: {
  curso_id: string;
  parent_id?: string | null;
  titulo: string;
  orden: number;
  tipo?: 'seccion' | 'leccion';
  contenido?: object | null;
}): Promise<{ data: Seccion | null; error: string | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('seccion')
    .insert({
      curso_id: params.curso_id,
      parent_id: params.parent_id ?? null,
      titulo: params.titulo.trim(),
      orden: params.orden,
      tipo: params.tipo ?? 'seccion',
      contenido: params.contenido ?? null,
      creado_por: user?.id,
    })
    .select()
    .single();
  return { data: data as Seccion | null, error: error?.message ?? null };
};

export const actualizarSeccion = async (
  id: string,
  updates: Partial<Pick<Seccion, 'titulo' | 'descripcion' | 'orden' | 'contenido'>>
): Promise<{ error: string | null }> => {
  const { error } = await supabase.from('seccion').update(updates).eq('id', id);
  return { error: error?.message ?? null };
};

export const eliminarSeccion = async (id: string): Promise<{ error: string | null }> => {
  const { error } = await supabase.from('seccion').delete().eq('id', id);
  return { error: error?.message ?? null };
};

export const contarSecciones = async (cursoId: string): Promise<number> => {
  const { count } = await supabase
    .from('seccion')
    .select('id', { count: 'exact', head: true })
    .eq('curso_id', cursoId);
  return count ?? 0;
};


export const getProgresoPorCurso = async (
  userId: string,
  cursoId: string
): Promise<{ data: ProgresoUsuario[]; error: string | null }> => {
  const { data: secciones } = await supabase
    .from('seccion')
    .select('id')
    .eq('curso_id', cursoId);

  if (!secciones || secciones.length === 0) return { data: [], error: null };

  const ids = secciones.map((s: { id: string }) => s.id);
  const { data, error } = await supabase
    .from('progreso_usuario')
    .select('*')
    .eq('usuario_id', userId)
    .in('seccion_id', ids);

  return { data: (data as ProgresoUsuario[]) ?? [], error: error?.message ?? null };
};

export const upsertProgreso = async (
  userId: string,
  seccionId: string,
  estado: EstadoSeccion
): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from('progreso_usuario')
    .upsert(
      {
        usuario_id: userId,
        seccion_id: seccionId,
        estado,
        completado_en: estado === 'done' ? new Date().toISOString() : null,
      },
      { onConflict: 'usuario_id,seccion_id' }
    );
  return { error: error?.message ?? null };
};

export const inicializarProgreso = async (
  userId: string,
  cursoId: string
): Promise<void> => {
  const { data: secciones } = await supabase
    .from('seccion')
    .select('id, orden')
    .eq('curso_id', cursoId)
    .is('parent_id', null)
    .order('orden')
    .limit(1);

  if (!secciones || secciones.length === 0) return;

  await supabase
    .from('progreso_usuario')
    .upsert(
      { usuario_id: userId, seccion_id: secciones[0].id, estado: 'active' },
      { onConflict: 'usuario_id,seccion_id' }
    );
};
