declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  /** Solo fallback de desarrollo. En producción la URL vigente viene de Supabase (ver src/lib/config.ts). */
  export const API_URL: string;
  /** Clave compartida que la API exige en la cabecera x-api-key. */
  export const API_KEY: string;
}
