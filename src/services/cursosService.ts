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

export const getCurso = async (
  id: string
): Promise<{ data: Curso | null; error: string | null }> => {
  const { data, error } = await supabase.from('curso').select('*').eq('id', id).maybeSingle();
  return { data: data as Curso | null, error: error?.message ?? null };
};

export type StatsCurso = {
  totalSecciones: number;
  totalLecciones: number;
  totalPreguntas: number;
};

export const getStatsCurso = async (cursoId: string): Promise<StatsCurso> => {
  const { data: secciones } = await supabase
    .from('seccion')
    .select('id, tipo')
    .eq('curso_id', cursoId);

  const lst = (secciones as { id: string; tipo: string }[] | null) ?? [];
  const ids = lst.map(s => s.id);
  const totalSecciones = lst.filter(s => s.tipo === 'seccion').length;
  const totalLecciones = lst.filter(s => s.tipo === 'leccion').length;

  if (ids.length === 0) {
    return { totalSecciones, totalLecciones, totalPreguntas: 0 };
  }

  const { count } = await supabase
    .from('pregunta')
    .select('id', { count: 'exact', head: true })
    .in('seccion_id', ids);

  return { totalSecciones, totalLecciones, totalPreguntas: count ?? 0 };
};

export const contarPreguntasPorSecciones = async (
  seccionIds: string[]
): Promise<Record<string, number>> => {
  if (seccionIds.length === 0) return {};
  const { data } = await supabase
    .from('pregunta')
    .select('seccion_id')
    .in('seccion_id', seccionIds);
  const map: Record<string, number> = {};
  ((data as { seccion_id: string }[] | null) ?? []).forEach(p => {
    map[p.seccion_id] = (map[p.seccion_id] ?? 0) + 1;
  });
  return map;
};

export const moverSeccion = async (
  id: string,
  direccion: 'arriba' | 'abajo'
): Promise<{ error: string | null }> => {
  const { data: actual } = await supabase
    .from('seccion')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!actual) return { error: 'Sección no encontrada' };

  let q = supabase
    .from('seccion')
    .select('*')
    .eq('curso_id', actual.curso_id);
  q = actual.parent_id === null ? q.is('parent_id', null) : q.eq('parent_id', actual.parent_id);

  const { data: hermanas } = await q.order('orden');
  const lista = (hermanas as Seccion[] | null) ?? [];
  const idx = lista.findIndex(s => s.id === id);
  if (idx === -1) return { error: 'Posición no encontrada' };

  const objetivo = direccion === 'arriba' ? idx - 1 : idx + 1;
  if (objetivo < 0 || objetivo >= lista.length) return { error: null };

  const otro = lista[objetivo];
  const ordenA = actual.orden;
  const ordenB = otro.orden;

  const { error: e1 } = await supabase
    .from('seccion').update({ orden: ordenB }).eq('id', actual.id);
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase
    .from('seccion').update({ orden: ordenA }).eq('id', otro.id);
  return { error: e2?.message ?? null };
};


export const getSeccion = async (
  id: string
): Promise<{ data: Seccion | null; error: string | null }> => {
  const { data, error } = await supabase
    .from('seccion')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return { data: data as Seccion | null, error: error?.message ?? null };
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

const getEstadoActual = async (
  userId: string,
  seccionId: string
): Promise<EstadoSeccion | null> => {
  const { data } = await supabase
    .from('progreso_usuario')
    .select('estado')
    .eq('usuario_id', userId)
    .eq('seccion_id', seccionId)
    .maybeSingle();
  return (data?.estado as EstadoSeccion) ?? null;
};

const getHermanas = async (
  cursoId: string,
  parentId: string | null
): Promise<Seccion[]> => {
  let q = supabase.from('seccion').select('*').eq('curso_id', cursoId);
  q = parentId === null ? q.is('parent_id', null) : q.eq('parent_id', parentId);
  const { data } = await q.order('orden');
  return (data as Seccion[]) ?? [];
};

export const XP_POR_SECCION = 10;

const otorgarXP = async (userId: string, monto: number): Promise<void> => {
  const { error } = await supabase.rpc('incrementar_xp', {
    p_user_id: userId,
    p_monto: monto,
  });
  if (error) console.warn('[otorgarXP] error:', error.message);
};

export const marcarCompletadaYAvanzar = async (
  userId: string,
  seccionId: string
): Promise<{ error: string | null; xpGanado: number }> => {
  const estadoPrevio = await getEstadoActual(userId, seccionId);
  if (estadoPrevio === 'done') {
    return { error: null, xpGanado: 0 };
  }

  const { error: errDone } = await upsertProgreso(userId, seccionId, 'done');
  if (errDone) return { error: errDone, xpGanado: 0 };

  await otorgarXP(userId, XP_POR_SECCION);
  let xpGanado = XP_POR_SECCION;

  const { data: actual } = await supabase
    .from('seccion')
    .select('*')
    .eq('id', seccionId)
    .maybeSingle();
  if (!actual) return { error: null, xpGanado };

  const hermanas = await getHermanas(actual.curso_id, actual.parent_id);
  const siguiente = hermanas.find(h => h.orden > actual.orden);

  if (siguiente) {
    const estadoSig = await getEstadoActual(userId, siguiente.id);
    if (estadoSig !== 'done' && estadoSig !== 'active') {
      await upsertProgreso(userId, siguiente.id, 'active');
    }
    return { error: null, xpGanado };
  }

  if (actual.parent_id) {
    const ids = hermanas.map(h => h.id);
    const { data: progs } = await supabase
      .from('progreso_usuario')
      .select('seccion_id, estado')
      .eq('usuario_id', userId)
      .in('seccion_id', ids);
    const doneCount = (progs ?? []).filter(p => p.estado === 'done').length;
    if (doneCount === ids.length) {
      const cascada = await marcarCompletadaYAvanzar(userId, actual.parent_id);
      return {
        error: cascada.error,
        xpGanado: xpGanado + cascada.xpGanado,
      };
    }
  }

  return { error: null, xpGanado };
};
