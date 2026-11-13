// Supabase falso en memoria: solo implementa lo que usa marcarCompletadaYAvanzar.
type Row = Record<string, any>;
 
export function createFakeSupabase(initial: { seccion: Row[]; progreso_usuario?: Row[] }) {
  const db: Record<string, Row[]> = {
    seccion: initial.seccion.map(r => ({ ...r })),
    progreso_usuario: (initial.progreso_usuario ?? []).map(r => ({ ...r })),
  };
  const rpcCalls: { fn: string; args: any }[] = [];
 
  function from(table: string) {
    const filters: ((r: Row) => boolean)[] = [];
    let mode: 'select' | 'upsert' = 'select';
    let payload: Row = {};
    let conflictKeys: string[] = [];
    let orderKey: string | null = null;
    let max: number | null = null;
 
    const run = () => {
      if (mode === 'upsert') {
        const existente = db[table].find(r => conflictKeys.every(k => r[k] === payload[k]));
        if (existente) Object.assign(existente, payload);
        else db[table].push({ ...payload });
        return { data: null, error: null };
      }
      let rows = db[table].filter(r => filters.every(f => f(r)));
      if (orderKey) rows = [...rows].sort((a, b) => a[orderKey!] - b[orderKey!]);
      if (max !== null) rows = rows.slice(0, max);
      return { data: rows, error: null };
    };
 
    const b: any = {
      select: () => b,
      eq: (k: string, v: any) => { filters.push(r => r[k] === v); return b; },
      is: (k: string, v: any) => { filters.push(r => (r[k] ?? null) === v); return b; },
      in: (k: string, arr: any[]) => { filters.push(r => arr.includes(r[k])); return b; },
      order: (k: string) => { orderKey = k; return b; },
      limit: (n: number) => { max = n; return b; },
      upsert: (p: Row, o?: { onConflict?: string }) => {
        mode = 'upsert'; payload = p; conflictKeys = (o?.onConflict ?? '').split(','); return b;
      },
      maybeSingle: async () => { const r = run(); return { data: (r.data as Row[])[0] ?? null, error: null }; },
      then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  }
 
  return {
    client: {
      from,
      rpc: async (fn: string, args: any) => { rpcCalls.push({ fn, args }); return { data: null, error: null }; },
    },
    db,
    rpcCalls,
    estado: (seccionId: string) => db.progreso_usuario.find(p => p.seccion_id === seccionId)?.estado ?? null,
  };
}
 
