type FilterSpec =
  | { type: string; col: string; val: unknown }
  | { type: 'not'; col: string; op: string; val: unknown }
  | { type: 'or'; expr: string };

interface OrderSpec {
  col: string;
  ascending: boolean;
}

export interface DbResponse<T = any[]> {
  data: T;
  count?: number | null;
  error: { message: string; code?: string } | null;
}

async function postDbRequest<T = any>(body: Record<string, unknown>, timeoutMs = 0): Promise<DbResponse<T>> {
  const controller = timeoutMs > 0 && typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });

    const rawText = await res.text();
    let parsed: any = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }

    if (!res.ok) {
      const serverMsg =
        parsed?.error?.message ||
        (rawText && !rawText.trim().startsWith('<') ? rawText.slice(0, 240) : '') ||
        `Error HTTP ${res.status} (${res.statusText || 'Error del servidor'})`;
      return {
        data: (parsed?.data ?? null) as T,
        count: parsed?.count ?? null,
        error: {
          message: serverMsg,
          code: parsed?.error?.code || String(res.status),
        },
      };
    }

    if (parsed && typeof parsed === 'object') {
      return parsed as DbResponse<T>;
    }

    return {
      data: null as T,
      count: null,
      error: { message: 'Respuesta inválida del servidor de base de datos.' },
    };
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    return {
      data: null as T,
      count: null,
      error: {
        message: isAbort
          ? 'Tiempo de espera agotado conectando con la base de datos.'
          : err?.message || 'Error de conexión con la base de datos',
      },
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function executeCustomDbAction<T = any>(
  body: Record<string, unknown>,
  timeoutMs = 15000
): Promise<DbResponse<T>> {
  return postDbRequest<T>(body, timeoutMs);
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Error leyendo archivo'));
    reader.readAsDataURL(file);
  });
}

class NeonQueryBuilder<T = any[]> implements PromiseLike<DbResponse<T>> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private columns = '*';
  private head = false;
  private countMode: string | null = null;
  private filters: FilterSpec[] = [];
  private orders: OrderSpec[] = [];
  private limitVal: number | null = null;
  private singleMode = false;
  private maybeSingleMode = false;
  private payloadVal: unknown = null;
  private onConflictCol: string | undefined;
  private returning = false;
  private pendingPromise: Promise<DbResponse<T>> | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*', opts?: { count?: 'exact'; head?: boolean }): NeonQueryBuilder<any[]> {
    if (this.action === 'insert' || this.action === 'update' || this.action === 'upsert' || this.action === 'delete') {
      this.returning = true;
      this.columns = columns || '*';
    } else {
      this.action = 'select';
      this.columns = columns || '*';
      if (opts?.head) this.head = true;
      if (opts?.count) this.countMode = opts.count;
    }
    return this as unknown as NeonQueryBuilder<any[]>;
  }

  insert(payload: unknown): NeonQueryBuilder<any[]> {
    this.action = 'insert';
    this.payloadVal = payload;
    return this as unknown as NeonQueryBuilder<any[]>;
  }

  update(payload: unknown): NeonQueryBuilder<any[]> {
    this.action = 'update';
    this.payloadVal = payload;
    return this as unknown as NeonQueryBuilder<any[]>;
  }

  upsert(payload: unknown, opts?: { onConflict?: string }): NeonQueryBuilder<any[]> {
    this.action = 'upsert';
    this.payloadVal = payload;
    this.onConflictCol = opts?.onConflict;
    return this as unknown as NeonQueryBuilder<any[]>;
  }

  delete(): NeonQueryBuilder<any[]> {
    this.action = 'delete';
    return this as unknown as NeonQueryBuilder<any[]>;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ type: 'neq', col, val });
    return this;
  }

  ilike(col: string, val: string) {
    this.filters.push({ type: 'ilike', col, val });
    return this;
  }

  like(col: string, val: string) {
    this.filters.push({ type: 'like', col, val });
    return this;
  }

  gt(col: string, val: unknown) {
    this.filters.push({ type: 'gt', col, val });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push({ type: 'gte', col, val });
    return this;
  }

  lt(col: string, val: unknown) {
    this.filters.push({ type: 'lt', col, val });
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push({ type: 'lte', col, val });
    return this;
  }

  is(col: string, val: null | boolean) {
    this.filters.push({ type: 'is', col, val });
    return this;
  }

  in(col: string, val: unknown[]) {
    this.filters.push({ type: 'in', col, val });
    return this;
  }

  not(col: string, op: string, val: unknown) {
    this.filters.push({ type: 'not', col, op, val });
    return this;
  }

  or(expr: string) {
    this.filters.push({ type: 'or', expr });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  single(): NeonQueryBuilder<any> {
    this.singleMode = true;
    return this as unknown as NeonQueryBuilder<any>;
  }

  maybeSingle(): NeonQueryBuilder<any> {
    this.maybeSingleMode = true;
    return this as unknown as NeonQueryBuilder<any>;
  }

  private exec(): Promise<DbResponse<T>> {
    if (this.pendingPromise) return this.pendingPromise;
    this.pendingPromise = (async () => {
      const res = await postDbRequest<T>({
        table: this.table,
        action: this.action,
        columns: this.columns,
        head: this.head,
        count: this.countMode,
        filters: this.filters,
        order: this.orders,
        limit: this.limitVal,
        single: this.singleMode,
        maybeSingle: this.maybeSingleMode,
        payload: this.payloadVal,
        onConflict: this.onConflictCol,
        returning: this.returning,
      });
      return res;
    })();
    return this.pendingPromise;
  }

  then<TResult1 = DbResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: DbResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

class NoopChannel {
  on(_event: string, _filter: any, _cb?: (payload: any) => void) {
    return this;
  }
  subscribe() {
    return this;
  }
}

export const supabase = {
  from(table: string) {
    return new NeonQueryBuilder<any[]>(table);
  },

  channel(_name: string) {
    return new NoopChannel();
  },

  removeChannel(_ch: any) {
    return Promise.resolve('ok');
  },

  auth: {
    async signInWithPassword(_creds: { email: string; password: string }) {
      return { data: { session: null, user: null }, error: { message: 'Use local KANT directory auth' } };
    },
    async updateUser(_attrs: { password?: string }) {
      return { data: { user: null }, error: null };
    },
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(
          path: string,
          file: File | Blob,
          opts?: { contentType?: string; cacheControl?: string; upsert?: boolean }
        ) {
          try {
            const base64 = await fileToBase64(file);
            const res = await fetch('/api/file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'upload',
                bucket,
                path,
                contentType: opts?.contentType || file.type || 'application/octet-stream',
                base64,
              }),
            });
            return await res.json();
          } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Error subiendo archivo' } };
          }
        },

        async list(
          folder = '',
          opts?: { search?: string; limit?: number; sortBy?: { column: string; order: string } }
        ): Promise<{ data: any[]; error: { message: string } | null }> {
          try {
            const res = await fetch('/api/file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'list',
                bucket,
                folder,
                search: opts?.search || '',
                limit: opts?.limit,
              }),
            });
            return await res.json();
          } catch (err: any) {
            return { data: [], error: { message: err?.message || 'Error listando archivos' } };
          }
        },

        getPublicUrl(path: string) {
          const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
          const cleanPath = String(path || '').replace(/^\/+/, '');
          return {
            data: {
              publicUrl: `${origin}/api/file?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(cleanPath)}`,
            },
          };
        },
      };
    },
  },
};
