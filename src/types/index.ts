export type TipoUsuario = 'estudiante' | 'profesor' | 'administrador';
export type EstadoSeccion = 'locked' | 'active' | 'done';
export type TipoSeccion = 'seccion' | 'leccion';

export type UserProfile = {
  id: string;
  nombre: string;
  email: string;
  nivel: string | null;
  tipo: TipoUsuario;
  fecha_registro: string;
};

export type Curso = {
  id: string;
  titulo: string;
  descripcion: string | null;
  nivel: string | null;
  idioma_objetivo: string;
  imagen_url: string | null;
  publicado: boolean;
  creado_por: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type ContenidoBloque = {
  tipo: 'texto' | 'lista' | 'ejercicio' | 'audio_url';
  valor?: string;
  items?: string[];
  pregunta?: string;
  respuesta?: string;
};

export type Seccion = {
  id: string;
  curso_id: string;
  parent_id: string | null;
  titulo: string;
  descripcion: string | null;
  orden: number;
  tipo: TipoSeccion;
  contenido: { bloques: ContenidoBloque[] } | null;
  creado_por: string;
  fecha_creacion: string;
};

export type SeccionArbol = Seccion & {
  hijos: SeccionArbol[];
  estado?: EstadoSeccion;
};

export type ProgresoUsuario = {
  id: string;
  usuario_id: string;
  seccion_id: string;
  estado: EstadoSeccion;
  completado_en: string | null;
};
