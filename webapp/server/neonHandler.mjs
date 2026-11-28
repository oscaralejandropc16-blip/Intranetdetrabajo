import crypto from 'node:crypto';
import { neon, types as neonTypes } from '@neondatabase/serverless';
import pg from 'pg';

// Preservar columnas DATE de PostgreSQL como string 'YYYY-MM-DD' igual que PostgREST
if (neonTypes?.setTypeParser) {
  neonTypes.setTypeParser(1082, (val) => val);
}
if (pg?.types?.setTypeParser) {
  pg.types.setTypeParser(1082, (val) => val);
}

const TABLE_SCHEMA = {
  bitacora_drafts: {
    cols: {
      id: 'uuid',
      user_id: 'uuid',
      fecha: 'date',
      draft_data: 'jsonb',
      updated_at: 'timestamptz',
    },
  },
  bitacoras: {
    cols: {
      id: 'uuid',
      user_id: 'uuid',
      user_name: 'text',
      fecha: 'date',
      hora_entrada: 'text',
      hora_salida: 'text',
      total_horas: 'numeric',
      resumen: 'text',
      tareas: 'jsonb',
      observaciones: 'text',
      estado: 'text',
      evidencia_url: 'text',
      pdf_url: 'text',
      created_at: 'timestamptz',
      updated_at: 'timestamptz',
      author_id: 'text',
      actuaciones: 'jsonb',
      ingresos: 'jsonb',
      programaciones: 'jsonb',
      evidences: 'jsonb',
      cambios_realizados: 'jsonb',
      respuestas_hilo: 'jsonb',
      ubicacion_entrada: 'text',
      ubicacion_salida: 'text',
      cierre_retrasado: 'boolean',
      pdf_base64: 'text',
      comentario_admin: 'text',
      supervisado_por: 'text',
    },
  },
  candidatos_bolsa: {
    cols: {
      id: 'bigint',
      nombre: 'text',
      email: 'text',
      telefono: 'text',
      cargo: 'text',
      cv_url: 'text',
      estado: 'text',
      notas: 'text',
      created_at: 'timestamptz',
    },
  },
  chat_messages: {
    cols: {
      id: 'uuid',
      sender_id: 'uuid',
      sender_name: 'text',
      recipient_id: 'uuid',
      recipient_name: 'text',
      mensaje: 'text',
      adjunto_url: 'text',
      leido: 'boolean',
      created_at: 'timestamptz',
    },
  },
  expedientes: {
    cols: {
      id: 'uuid',
      numero: 'text',
      titulo: 'text',
      cliente: 'text',
      tribunal: 'text',
      materia: 'text',
      estado: 'text',
      abogado_responsable: 'text',
      created_at: 'timestamptz',
      actuaciones: 'jsonb',
    },
  },
  gastos: {
    cols: {
      id: 'uuid',
      empleado_id: 'uuid',
      empleado_nombre: 'text',
      expediente_numero: 'text',
      concepto: 'text',
      monto: 'numeric',
      moneda: 'text',
      fecha: 'date',
      comprobante_url: 'text',
      estado: 'text',
      motivo_rechazo: 'text',
      created_at: 'timestamptz',
      titulo: 'text',
      periodo: 'text',
      fecha_inicio: 'date',
      fecha_fin: 'date',
      tasa_bcv: 'numeric',
      items: 'jsonb',
      total_usd: 'numeric',
      total_ves: 'numeric',
      comentarios_jefatura: 'text',
    },
  },
  investigaciones_kant: {
    cols: {
      id: 'uuid',
      titulo: 'text',
      categoria: 'text',
      contenido: 'text',
      autor: 'text',
      archivos_url: 'jsonb',
      tags: 'text[]',
      created_at: 'timestamptz',
    },
  },
  profiles: {
    cols: {
      id: 'uuid',
      email: 'text',
      full_name: 'text',
      role: 'text',
      created_at: 'timestamptz',
    },
  },
  tareas_asignadas: {
    cols: {
      id: 'bigint',
      asignado_por: 'text',
      asignado_a: 'text',
      asignado_a_nombre: 'text',
      titulo: 'text',
      descripcion: 'text',
      expediente_asociado: 'text',
      fecha_limite: 'text',
      prioridad: 'text',
      estado: 'text',
      respuesta_empleado: 'text',
      completada_en: 'timestamptz',
      created_at: 'timestamptz',
    },
  },
  archivos_storage: {
    cols: {
      id: 'uuid',
      bucket: 'text',
      path: 'text',
      content_type: 'text',
      size_bytes: 'bigint',
      created_at: 'timestamptz',
    },
  },
};

const schemaCache = new Map();

function isRetryablePoolError(err) {
  const msg = String(err?.message || err || '');
  return (
    err?.code === '53300' ||
    msg.includes('EMAXCONNSESSION') ||
    msg.includes('MaxClientsInSessionMode') ||
    msg.toLowerCase().includes('max clients reached') ||
    msg.toLowerCase().includes('too many clients')
  );
}

async function withPoolRetry(fn, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryablePoolError(err) || attempt === maxRetries) {
        throw err;
      }
      const baseMs = 150 * (attempt + 1) + Math.floor(Math.random() * 120);
      await new Promise((r) => setTimeout(r, baseMs));
    }
  }
  throw lastErr;
}

function getSupabaseTransactionUrl(url) {
  if (url.includes('pooler.supabase.com:5432')) {
    return url.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
  }
  return null;
}

function createPgClient(rawUrl) {
  const isLocal = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
  const disableSsl = rawUrl.includes('sslmode=disable');

  // En pg@8.23+, ?sslmode=require en connectionString sobrescribe ssl.rejectUnauthorized=false
  // y activa verify-full, rompiendo SSL contra Supabase Pooler ("self-signed certificate").
  let cleanUrl = rawUrl;
  try {
    const parsedUrl = new URL(rawUrl);
    if (!isLocal && !disableSsl && parsedUrl.searchParams.has('sslmode')) {
      parsedUrl.searchParams.set('sslmode', 'no-verify');
      cleanUrl = parsedUrl.toString();
    }
  } catch {
    // Mantener rawUrl si no es parseable con URL()
  }

  return new pg.Client({
    connectionString: cleanUrl,
    connectionTimeoutMillis: 10000,
    ssl: isLocal || disableSsl ? false : { rejectUnauthorized: false },
  });
}

async function runWithConnection(dbUrl, fn) {
  const url = String(dbUrl || process.env.DATABASE_URL || '').trim();
  if (!url) {
    throw new Error('DATABASE_URL no está configurada en el servidor.');
  }

  // Driver HTTP sin estado cuando el destino sea Neon
  if (url.includes('.neon.tech')) {
    const neonSql = neon(url);
    return await fn({
      isNeonHttp: true,
      url,
      query: (text, queryParams = []) => neonSql.query(text, queryParams),
      withTransaction: null,
    });
  }

  // En serverless (Vercel) + Supabase Pooler, abrir 1 conexión por petición y cerrarla en finally
  // evita que contenedores congelados retengan sesiones abiertas en Session Mode (:5432).
  const executeOnClient = async (targetUrl) => {
    const client = createPgClient(targetUrl);
    client.on('error', (err) => {
      console.error('[Postgres Client] Error en conexión:', err?.message || err);
    });
    await client.connect();
    try {
      const queryFn = async (text, queryParams = []) => {
        const res = await client.query(text, queryParams);
        return res.rows;
      };
      const withTransaction = async (txFn) => {
        await client.query('BEGIN');
        try {
          const result = await txFn(queryFn);
          await client.query('COMMIT');
          return result;
        } catch (err) {
          try {
            await client.query('ROLLBACK');
          } catch (rbErr) {
            console.error('[Postgres Client] Error en ROLLBACK:', rbErr?.message || rbErr);
          }
          throw err;
        }
      };
      return await fn({
        isNeonHttp: false,
        url: targetUrl,
        query: queryFn,
        withTransaction,
      });
    } finally {
      await client.end().catch(() => {});
    }
  };

  try {
    return await withPoolRetry(() => executeOnClient(url), 2);
  } catch (err) {
    const txPoolerUrl = getSupabaseTransactionUrl(url);
    if (txPoolerUrl && isRetryablePoolError(err)) {
      console.warn('[Postgres] Session Pooler (:5432) saturado; conmutando a Transaction Pooler (:6543).');
      return await executeOnClient(txPoolerUrl);
    }
    throw err;
  }
}

function buildFallbackColumnInfo(table) {
  const tableMeta = TABLE_SCHEMA[table];
  const out = {};
  if (!tableMeta) return out;
  for (const [colName, colType] of Object.entries(tableMeta.cols)) {
    out[colName] = {
      udtName: colType === 'text[]' ? '_text' : colType,
      dataType: colType,
      isNullable: true,
      hasDefault: true,
    };
  }
  return out;
}

async function getTableColumnInfo(queryFn, dbUrl, table) {
  const cacheKey = `${dbUrl || 'env'}::${table}`;
  const cached = schemaCache.get(cacheKey);
  if (cached) return cached;

  try {
    const rows = await queryFn(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const colInfoMap = {};
      for (const r of rows) {
        colInfoMap[r.column_name] = {
          udtName: String(r.udt_name || r.data_type || 'text').toLowerCase(),
          dataType: String(r.data_type || '').toLowerCase(),
          isNullable: r.is_nullable === 'YES',
          hasDefault: r.column_default !== null && r.column_default !== undefined,
        };
      }
      schemaCache.set(cacheKey, colInfoMap);
      return colInfoMap;
    }
  } catch (err) {
    console.warn(`[Schema Inspect ${table}] Fallback a TABLE_SCHEMA:`, err?.message || err);
  }

  return buildFallbackColumnInfo(table);
}

function resolveColumnRef(tableMeta, rawCol, allowJsonPath = true) {
  const clean = String(rawCol || '').trim();
  if (allowJsonPath && clean.includes('->>')) {
    const parts = clean.split('->>');
    if (parts.length !== 2) throw new Error(`Ruta JSON inválida: ${clean}`);
    const [baseCol, jsonKey] = parts;
    if (tableMeta.cols[baseCol] !== 'jsonb') {
      throw new Error(`Columna JSONB inválida: ${baseCol}`);
    }
    if (!/^[a-zA-Z0-9_]+$/.test(jsonKey)) {
      throw new Error(`Clave JSON inválida: ${jsonKey}`);
    }
    return { sql: `("${baseCol}"->>'${jsonKey}')`, type: 'text' };
  }
  const colType = tableMeta.cols[clean];
  if (!colType) {
    throw new Error(`Columna no permitida: ${clean}`);
  }
  return { sql: `"${clean}"`, type: colType };
}

function buildSelectList(tableMeta, rawSelect) {
  const sel = String(rawSelect || '*').trim();
  if (!sel || sel === '*') return '*';
  const cols = sel
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (cols.length === 0) return '*';
  return cols.map((c) => resolveColumnRef(tableMeta, c, false).sql).join(', ');
}

function parsePostgrestInList(raw) {
  if (Array.isArray(raw)) return raw;
  const s = String(raw || '').trim();
  const inner = s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1) : s;
  if (!inner) return [];
  return inner
    .split(',')
    .map((item) => item.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'));
}

function buildCondition(tableMeta, filter, params) {
  const addParam = (val, castSuffix = '') => {
    params.push(val);
    return `$${params.length}${castSuffix}`;
  };

  if (filter.type === 'or') {
    const expr = String(filter.expr || '').trim();
    if (!expr) return 'TRUE';
    const clauses = [];
    // Parsear formato "col.op.val,col2.op2.val2" respetando operadores PostgREST
    for (const part of expr.split(',')) {
      const trimmed = part.trim();
      const firstDot = trimmed.indexOf('.');
      if (firstDot === -1) continue;
      const colRaw = trimmed.slice(0, firstDot);
      const rest = trimmed.slice(firstDot + 1);
      const secondDot = rest.indexOf('.');
      if (secondDot === -1) continue;
      const op = rest.slice(0, secondDot).toLowerCase();
      const val = rest.slice(secondDot + 1);
      clauses.push(buildCondition(tableMeta, { type: op, col: colRaw, val }, params));
    }
    return clauses.length > 0 ? `(${clauses.join(' OR ')})` : 'TRUE';
  }

  if (filter.type === 'not') {
    const ref = resolveColumnRef(tableMeta, filter.col, true);
    const op = String(filter.op || '').toLowerCase();
    if (op === 'in') {
      const list = parsePostgrestInList(filter.val);
      if (list.length === 0) return 'TRUE';
      const p = addParam(list, '::text[]');
      return `(${ref.sql} IS NULL OR NOT (${ref.sql}::text = ANY(${p})))`;
    }
    if (op === 'ilike') {
      const p = addParam(String(filter.val ?? ''), '::text');
      return `(${ref.sql} IS NULL OR NOT (${ref.sql}::text ILIKE ${p}))`;
    }
    if (op === 'eq') {
      const p = addParam(filter.val);
      return `(${ref.sql} IS NULL OR ${ref.sql} <> ${p})`;
    }
    if (op === 'is' && filter.val === null) {
      return `${ref.sql} IS NOT NULL`;
    }
    throw new Error(`Operador NOT no soportado: ${op}`);
  }

  const ref = resolveColumnRef(tableMeta, filter.col, true);
  const t = ref.type;
  const val = filter.val;

  switch (filter.type) {
    case 'eq': {
      if (val === null) return `${ref.sql} IS NULL`;
      const p = addParam(t === 'jsonb' ? JSON.stringify(val) : val);
      return `${ref.sql} = ${p}`;
    }
    case 'neq': {
      if (val === null) return `${ref.sql} IS NOT NULL`;
      const p = addParam(val);
      return `(${ref.sql} IS NULL OR ${ref.sql} <> ${p})`;
    }
    case 'ilike': {
      const p = addParam(String(val ?? ''), '::text');
      return `${ref.sql}::text ILIKE ${p}`;
    }
    case 'like': {
      const p = addParam(String(val ?? ''), '::text');
      return `${ref.sql}::text LIKE ${p}`;
    }
    case 'gt':
      return `${ref.sql} > ${addParam(val)}`;
    case 'gte':
      return `${ref.sql} >= ${addParam(val)}`;
    case 'lt':
      return `${ref.sql} < ${addParam(val)}`;
    case 'lte':
      return `${ref.sql} <= ${addParam(val)}`;
    case 'is':
      if (val === null) return `${ref.sql} IS NULL`;
      if (val === true) return `${ref.sql} IS TRUE`;
      if (val === false) return `${ref.sql} IS FALSE`;
      return `${ref.sql} IS NOT DISTINCT FROM ${addParam(val)}`;
    case 'in': {
      const arr = Array.isArray(val) ? val : parsePostgrestInList(val);
      if (arr.length === 0) return 'FALSE';
      const castMap = {
        uuid: '::uuid[]',
        bigint: '::bigint[]',
        date: '::date[]',
      };
      const cast = castMap[t] || '::text[]';
      const cleaned = t === 'uuid' ? arr.map(String) : arr;
      const p = addParam(cleaned, cast);
      if (cast === '::text[]' && t !== 'text') {
        return `${ref.sql}::text = ANY(${p})`;
      }
      return `${ref.sql} = ANY(${p})`;
    }
    default:
      throw new Error(`Operador de filtro no soportado: ${filter.type}`);
  }
}

function buildWhereClause(tableMeta, filters = [], params) {
  if (!Array.isArray(filters) || filters.length === 0) return '';
  const parts = filters.map((f) => buildCondition(tableMeta, f, params));
  return parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
}

function normalizeWriteValue(colType, val) {
  if (val === undefined || val === null) return null;
  if (colType === 'jsonb') {
    if (typeof val === 'string') {
      // Asegurar JSON válido si viene pre-serializado
      try {
        JSON.parse(val);
        return val;
      } catch {
        return JSON.stringify(val);
      }
    }
    return JSON.stringify(val);
  }
  if ((colType === 'date' || colType === 'uuid' || colType === 'numeric' || colType === 'timestamptz') && val === '') {
    return null;
  }
  return val;
}

function normalizeColumnWrite(colMeta, val, params) {
  const udt = String(colMeta?.udtName || 'text').toLowerCase();
  const pushParam = (v, cast = '') => {
    params.push(v);
    return `$${params.length}${cast}`;
  };

  if (val === undefined || val === null) {
    return pushParam(null);
  }

  if (udt === 'jsonb' || udt === 'json') {
    let jsonStr;
    if (typeof val === 'string') {
      try {
        JSON.parse(val);
        jsonStr = val;
      } catch {
        jsonStr = JSON.stringify(val);
      }
    } else {
      jsonStr = JSON.stringify(val);
    }
    return pushParam(jsonStr, `::${udt}`);
  }

  if (udt === '_text' || udt === 'text[]') {
    let arr;
    if (Array.isArray(val)) {
      arr = val.filter((v) => v !== undefined && v !== null).map(String);
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          arr = Array.isArray(parsed) ? parsed.filter((v) => v !== undefined && v !== null).map(String) : [trimmed];
        } catch {
          arr = [trimmed];
        }
      } else {
        arr = trimmed ? [trimmed] : [];
      }
    } else {
      arr = [String(val)];
    }
    return pushParam(arr, '::text[]');
  }

  if ((udt === 'date' || udt === 'uuid' || udt === 'numeric' || udt === 'timestamptz' || udt === 'timestamp' || udt === 'int8' || udt === 'int4') && val === '') {
    return pushParam(null);
  }

  if ((udt === 'text' || udt === 'varchar' || udt === 'bpchar') && (Array.isArray(val) || (typeof val === 'object' && !(val instanceof Date)))) {
    return pushParam(JSON.stringify(val));
  }

  return pushParam(val);
}

function prepareRowForInsert(row, colInfoMap, isPureInsert) {
  const out = { ...row };
  const nowIso = new Date().toISOString();

  if (colInfoMap?.id && (out.id === undefined || out.id === null || out.id === '')) {
    const idUdt = colInfoMap.id.udtName;
    const needsId = isPureInsert
      ? (idUdt === 'uuid' || (!colInfoMap.id.hasDefault && !colInfoMap.id.isNullable && (idUdt === 'text' || idUdt === 'varchar')))
      : (!colInfoMap.id.hasDefault && !colInfoMap.id.isNullable && (idUdt === 'uuid' || idUdt === 'text' || idUdt === 'varchar'));
    if (needsId) {
      out.id = crypto.randomUUID();
    }
  }

  if (colInfoMap?.created_at && (out.created_at === undefined || out.created_at === null || out.created_at === '')) {
    if (!colInfoMap.created_at.hasDefault && !colInfoMap.created_at.isNullable) {
      out.created_at = nowIso;
    }
  }

  if (colInfoMap?.archivos_url && (out.archivos_url === undefined || out.archivos_url === null)) {
    if (!colInfoMap.archivos_url.hasDefault && !colInfoMap.archivos_url.isNullable) {
      out.archivos_url = [];
    }
  }

  return out;
}

function normalizeResponseRow(row, tableMeta) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const [col, colType] of Object.entries(tableMeta.cols)) {
    if (colType === 'date' && out[col] instanceof Date) {
      out[col] = out[col].toISOString().slice(0, 10);
    } else if (colType === 'date' && typeof out[col] === 'string' && out[col].includes('T')) {
      out[col] = out[col].slice(0, 10);
    }
  }
  return out;
}

function formatCorrelativoCode(year, seq) {
  return `RD-REC-${year}-${String(seq).padStart(3, '0')}`;
}

async function computeHonorariosSeqState(queryFn, rawYear) {
  const targetYear = Number(rawYear) || new Date().getFullYear();
  const prefix = `RD-REC-${targetYear}-`;
  const correlativoTitulo = `CORRELATIVO_RECIBOS_${targetYear}`;

  const counterRows = await queryFn(
    `SELECT id, contenido, created_at
     FROM public.investigaciones_kant
     WHERE categoria = $1 AND titulo = $2
     ORDER BY created_at DESC
     LIMIT 10`,
    ['correlativo_honorario', correlativoTitulo]
  );

  let storedLastSeq = 0;
  for (const row of counterRows || []) {
    if (!row?.contenido) continue;
    try {
      const parsed = typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido;
      const candidate = Number(parsed?.lastSeq ?? parsed?.ultimoCorrelativo ?? 0);
      if (!isNaN(candidate) && candidate > storedLastSeq) {
        storedLastSeq = candidate;
      }
    } catch {
      const m = String(row.contenido).match(/"lastSeq"\s*:\s*(\d+)/);
      if (m) {
        const candidate = parseInt(m[1], 10);
        if (!isNaN(candidate) && candidate > storedLastSeq) storedLastSeq = candidate;
      }
    }
  }

  const titlePattern = `^RD-REC-${targetYear}-([0-9]{1,9})`;
  const jsonPattern = `"numeroRecibo"\\s*:\\s*"RD-REC-${targetYear}-([0-9]{1,9})"`;
  const maxRows = await queryFn(
    `SELECT COALESCE(MAX(
       GREATEST(
         COALESCE(NULLIF(substring("titulo" FROM $2), '')::int, 0),
         COALESCE(NULLIF(substring("contenido" FROM $3), '')::int, 0)
       )
     ), 0)::int AS max_seq
     FROM public.investigaciones_kant
     WHERE categoria = $1`,
    ['recibo_honorario', titlePattern, jsonPattern]
  );

  const maxExistingSeq = Number(maxRows?.[0]?.max_seq) || 0;

  const currentMax = Math.max(storedLastSeq, maxExistingSeq);
  return {
    year: targetYear,
    prefix,
    correlativoTitulo,
    counterRowId: counterRows?.[0]?.id || null,
    storedLastSeq,
    maxExistingSeq,
    currentMax,
  };
}

async function insertInvestigacionesRow(queryFn, colInfoMap, rowObj, returning = false) {
  const prepared = prepareRowForInsert(rowObj, colInfoMap, true);
  const keys = Object.keys(prepared).filter((k) => Boolean(colInfoMap?.[k]));
  if (keys.length === 0) {
    throw new Error('No se encontraron columnas válidas en public.investigaciones_kant.');
  }
  const params = [];
  const placeholders = keys.map((k) => normalizeColumnWrite(colInfoMap[k], prepared[k], params));
  const colSql = keys.map((k) => `"${k}"`).join(', ');
  const retSql = returning ? 'RETURNING id, titulo, created_at' : '';
  const query = `INSERT INTO public."investigaciones_kant" (${colSql}) VALUES (${placeholders.join(', ')}) ${retSql}`;
  return await queryFn(query, params);
}

async function updateHonorariosCounterRow(queryFn, colInfoMap, counterRowId, counterJson, autor, nowIso) {
  const fields = { contenido: counterJson };
  if (colInfoMap?.autor) fields.autor = autor;
  if (colInfoMap?.created_at) fields.created_at = nowIso;

  const keys = Object.keys(fields).filter((k) => Boolean(colInfoMap?.[k]));
  const params = [];
  const setSql = keys
    .map((k) => `"${k}" = ${normalizeColumnWrite(colInfoMap[k], fields[k], params)}`)
    .join(', ');
  params.push(counterRowId);
  const query = `UPDATE public."investigaciones_kant" SET ${setSql} WHERE "id" = $${params.length}`;
  await queryFn(query, params);
}

async function handleEmitReciboHonorario(sql, dbUrl, body) {
  const rawRecibo = body?.recibo;
  if (!rawRecibo || typeof rawRecibo !== 'object') {
    return { status: 400, body: { data: null, error: { message: 'Datos del recibo inválidos o vacíos.' } } };
  }
  if (!String(rawRecibo.clienteNombre || '').trim() || !String(rawRecibo.clienteCedula || '').trim()) {
    return { status: 400, body: { data: null, error: { message: 'El recibo requiere nombre y cédula/RIF del cliente.' } } };
  }
  const montoNum = Number(rawRecibo.monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return { status: 400, body: { data: null, error: { message: 'El monto del recibo debe ser mayor a cero.' } } };
  }

  let targetYear = Number(body?.year) || 0;
  if (!targetYear && rawRecibo.numeroRecibo) {
    const m = String(rawRecibo.numeroRecibo).match(/^RD-REC-(\d{4})-/i);
    if (m) targetYear = parseInt(m[1], 10);
  }
  if (!targetYear || targetYear < 2000 || targetYear > 2100) {
    targetYear = new Date().getFullYear();
  }

  const effectiveUrl = dbUrl || process.env.DATABASE_URL;
  const correlativoTitulo = `CORRELATIVO_RECIBOS_${targetYear}`;

  const persistWithinQueryFn = async (queryFn, useAdvisoryLock) => {
    const colInfoMap = await getTableColumnInfo(queryFn, effectiveUrl, 'investigaciones_kant');
    if (useAdvisoryLock) {
      await queryFn('SELECT pg_advisory_xact_lock(hashtext($1))', [correlativoTitulo]);
    }

    const seqState = await computeHonorariosSeqState(queryFn, targetYear);
    const assignedSeq = seqState.currentMax + 1;
    const assignedNumero = formatCorrelativoCode(targetYear, assignedSeq);
    const nextCorrelativo = formatCorrelativoCode(targetYear, assignedSeq + 1);
    const nowIso = new Date().toISOString();

    const finalRecibo = {
      ...rawRecibo,
      monto: montoNum,
      numeroRecibo: assignedNumero,
      estado: rawRecibo.estado || 'Emitido',
      created_at: rawRecibo.created_at || nowIso,
    };

    const autor = finalRecibo.abogadoReceptor || 'Román & Delgado';
    const counterJson = JSON.stringify({
      year: targetYear,
      prefix: seqState.prefix,
      lastSeq: assignedSeq,
      lastNumero: assignedNumero,
      nextSeq: assignedSeq + 1,
      nextNumero: nextCorrelativo,
      updatedAt: nowIso,
      updatedBy: autor,
    });

    const saveCounter = async () => {
      if (seqState.counterRowId) {
        await updateHonorariosCounterRow(queryFn, colInfoMap, seqState.counterRowId, counterJson, autor, nowIso);
      } else {
        await insertInvestigacionesRow(queryFn, colInfoMap, {
          titulo: correlativoTitulo,
          categoria: 'correlativo_honorario',
          contenido: counterJson,
          autor,
          archivos_url: [],
          tags: ['correlativo', 'honorarios', String(targetYear)],
          created_at: nowIso,
        });
      }
    };

    const receiptRowPayload = {
      titulo: `${assignedNumero} - ${finalRecibo.clienteNombre} (${finalRecibo.moneda} ${finalRecibo.monto})`,
      categoria: 'recibo_honorario',
      contenido: JSON.stringify(finalRecibo),
      autor,
      archivos_url: [],
      tags: ['recibo', finalRecibo.moneda, finalRecibo.tipoRecibo, finalRecibo.clienteNombre]
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
        .map(String),
      created_at: finalRecibo.created_at,
    };

    if (useAdvisoryLock) {
      await saveCounter();
      const insertedRows = await insertInvestigacionesRow(queryFn, colInfoMap, receiptRowPayload, true);
      if (!insertedRows || insertedRows.length === 0) {
        throw new Error('PostgreSQL no devolvió el recibo insertado tras la confirmación.');
      }
      finalRecibo.cloudId = insertedRows[0].id;
    } else {
      // Driver HTTP sin transacción interactiva: insertar primero el recibo y compensar si falla el correlativo
      const insertedRows = await insertInvestigacionesRow(queryFn, colInfoMap, receiptRowPayload, true);
      if (!insertedRows || insertedRows.length === 0) {
        throw new Error('La base de datos no confirmó la inserción del recibo.');
      }
      const insertedId = insertedRows[0].id;
      try {
        await saveCounter();
      } catch (counterErr) {
        try {
          await queryFn('DELETE FROM public."investigaciones_kant" WHERE "id" = $1', [insertedId]);
        } catch (cleanupErr) {
          console.error('[NeonDB emit_recibo_honorario] Error en rollback compensatorio:', cleanupErr);
        }
        throw counterErr;
      }
      finalRecibo.cloudId = insertedId;
    }

    return {
      recibo: finalRecibo,
      correlativoAsignado: assignedNumero,
      nextCorrelativo,
      seq: assignedSeq,
    };
  };

  const data = sql.withTransaction
    ? await sql.withTransaction((txQuery) => persistWithinQueryFn(txQuery, true))
    : await persistWithinQueryFn((t, p) => sql.query(t, p), false);

  return { status: 200, body: { data, error: null } };
}

export async function executeDbRequest(body, dbUrl) {
  const table = String(body?.table || '').trim();
  const tableMeta = TABLE_SCHEMA[table];
  if (!tableMeta) {
    return { status: 400, body: { data: null, error: { message: `Tabla no permitida: ${table}` } } };
  }

  const action = String(body?.action || 'select').toLowerCase();
  const params = [];

  try {
    return await runWithConnection(dbUrl, async (sql) => {

    if (action === 'load_honorarios_data') {
      if (table !== 'investigaciones_kant') {
        return { status: 400, body: { data: null, error: { message: 'Acción inválida para esta tabla.' } } };
      }
      const targetYear = Number(body?.year) || new Date().getFullYear();
      const prefix = `RD-REC-${targetYear}-`;
      const correlativoTitulo = `CORRELATIVO_RECIBOS_${targetYear}`;

      const counterRows = await sql.query(
        `SELECT id, contenido, created_at
         FROM public.investigaciones_kant
         WHERE categoria = $1 AND titulo = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        ['correlativo_honorario', correlativoTitulo]
      );
      const reciboRows = await sql.query(
        `SELECT id, contenido
         FROM public.investigaciones_kant
         WHERE categoria = $1
         ORDER BY created_at DESC
         LIMIT 500`,
        ['recibo_honorario']
      );

      let storedLastSeq = 0;
      for (const row of counterRows || []) {
        if (!row?.contenido) continue;
        try {
          const parsed = typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido;
          const candidate = Number(parsed?.lastSeq ?? parsed?.ultimoCorrelativo ?? 0);
          if (!isNaN(candidate) && candidate > storedLastSeq) storedLastSeq = candidate;
        } catch {
          const m = String(row.contenido).match(/"lastSeq"\s*:\s*(\d+)/);
          if (m) {
            const candidate = parseInt(m[1], 10);
            if (!isNaN(candidate) && candidate > storedLastSeq) storedLastSeq = candidate;
          }
        }
      }

      let maxExistingSeq = 0;
      for (const r of reciboRows || []) {
        if (!r?.contenido) continue;
        try {
          const parsed = typeof r.contenido === 'string' ? JSON.parse(r.contenido) : r.contenido;
          const numStr = String(parsed?.numeroRecibo || '').trim();
          if (numStr.startsWith(prefix)) {
            const seq = parseInt(numStr.slice(prefix.length).split('-')[0], 10);
            if (!isNaN(seq) && seq > maxExistingSeq) maxExistingSeq = seq;
          }
        } catch {
          // Ignorar fila malformada
        }
      }

      if (storedLastSeq === 0 && (reciboRows?.length || 0) >= 500) {
        const seqState = await computeHonorariosSeqState((t, p) => sql.query(t, p), targetYear);
        maxExistingSeq = Math.max(maxExistingSeq, seqState.currentMax);
      }

      const currentMax = Math.max(storedLastSeq, maxExistingSeq);
      const nextSeq = currentMax + 1;
      return {
        status: 200,
        body: {
          data: {
            recibos: reciboRows || [],
            year: targetYear,
            lastSeq: currentMax,
            nextSeq,
            nextCorrelativo: formatCorrelativoCode(targetYear, nextSeq),
          },
          error: null,
        },
      };
    }

    if (action === 'get_honorarios_correlativo') {
      if (table !== 'investigaciones_kant') {
        return { status: 400, body: { data: null, error: { message: 'Acción inválida para esta tabla.' } } };
      }
      const seqState = await computeHonorariosSeqState((t, p) => sql.query(t, p), body?.year);
      const nextSeq = seqState.currentMax + 1;
      return {
        status: 200,
        body: {
          data: {
            year: seqState.year,
            lastSeq: seqState.currentMax,
            nextSeq,
            nextCorrelativo: formatCorrelativoCode(seqState.year, nextSeq),
          },
          error: null,
        },
      };
    }

    if (action === 'emit_recibo_honorario') {
      if (table !== 'investigaciones_kant') {
        return { status: 400, body: { data: null, error: { message: 'Acción inválida para esta tabla.' } } };
      }
      return await handleEmitReciboHonorario(sql, dbUrl, body);
    }

    if (action === 'select') {
      const whereSql = buildWhereClause(tableMeta, body.filters, params);
      if (body.head === true) {
        const query = `SELECT COUNT(*)::int AS cnt FROM public."${table}" ${whereSql}`;
        const rows = await sql.query(query, params);
        return { status: 200, body: { data: null, count: rows[0]?.cnt ?? 0, error: null } };
      }

      const selectCols = buildSelectList(tableMeta, body.columns);
      let orderSql = '';
      if (Array.isArray(body.order) && body.order.length > 0) {
        const orderParts = body.order.map((o) => {
          const ref = resolveColumnRef(tableMeta, o.col, false);
          const dir = o.ascending === false ? 'DESC' : 'ASC';
          return `${ref.sql} ${dir}`;
        });
        orderSql = `ORDER BY ${orderParts.join(', ')}`;
      }

      let limitSql = '';
      if (body.limit !== undefined && body.limit !== null) {
        const lim = Math.max(0, Math.min(2000, parseInt(String(body.limit), 10) || 100));
        limitSql = `LIMIT ${lim}`;
      }

      const query = `SELECT ${selectCols} FROM public."${table}" ${whereSql} ${orderSql} ${limitSql}`;
      const rawRows = await sql.query(query, params);
      const rows = rawRows.map((r) => normalizeResponseRow(r, tableMeta));

      if (body.single) {
        if (rows.length === 0) {
          return { status: 200, body: { data: null, error: { message: 'No rows found', code: 'PGRST116' } } };
        }
        return { status: 200, body: { data: rows[0], error: null } };
      }
      if (body.maybeSingle) {
        return { status: 200, body: { data: rows[0] ?? null, error: null } };
      }
      return {
        status: 200,
        body: { data: rows, count: body.count === 'exact' ? rows.length : null, error: null },
      };
    }

    if (action === 'insert' || action === 'upsert') {
      const inputRows = Array.isArray(body.payload) ? body.payload : [body.payload];
      const validRows = inputRows.filter((r) => r && typeof r === 'object');
      if (validRows.length === 0) {
        return { status: 400, body: { data: null, error: { message: 'Payload vacío para inserción.' } } };
      }

      const allowedKeys = Object.keys(validRows[0]).filter((k) => Boolean(tableMeta.cols[k]));
      if (allowedKeys.length === 0) {
        return { status: 400, body: { data: null, error: { message: 'Sin columnas válidas para insertar.' } } };
      }

      const colListSql = allowedKeys.map((k) => `"${k}"`).join(', ');
      const valueTuples = [];

      for (const row of validRows) {
        const placeholders = allowedKeys.map((k) => {
          const colType = tableMeta.cols[k];
          params.push(normalizeWriteValue(colType, row[k]));
          const p = `$${params.length}`;
          return colType === 'jsonb' ? `${p}::jsonb` : p;
        });
        valueTuples.push(`(${placeholders.join(', ')})`);
      }

      let conflictSql = '';
      if (action === 'upsert') {
        const conflictCols = String(body.onConflict || 'id')
          .split(',')
          .map((c) => c.trim())
          .filter((c) => Boolean(tableMeta.cols[c]));
        if (conflictCols.length === 0) {
          throw new Error('Columna onConflict inválida.');
        }
        const updateSet = allowedKeys
          .filter((k) => !conflictCols.includes(k))
          .map((k) => `"${k}" = EXCLUDED."${k}"`);
        conflictSql =
          updateSet.length > 0
            ? `ON CONFLICT (${conflictCols.map((c) => `"${c}"`).join(', ')}) DO UPDATE SET ${updateSet.join(', ')}`
            : `ON CONFLICT (${conflictCols.map((c) => `"${c}"`).join(', ')}) DO NOTHING`;
      }

      const returningSql = body.returning ? `RETURNING ${buildSelectList(tableMeta, body.columns)}` : '';
      const query = `INSERT INTO public."${table}" (${colListSql}) VALUES ${valueTuples.join(', ')} ${conflictSql} ${returningSql}`;
      const rawRows = await sql.query(query, params);
      const rows = (rawRows || []).map((r) => normalizeResponseRow(r, tableMeta));

      if (body.single || body.maybeSingle) {
        return { status: 200, body: { data: rows[0] ?? null, error: null } };
      }
      return { status: 200, body: { data: body.returning ? rows : null, error: null } };
    }

    if (action === 'update') {
      const payload = body.payload;
      if (!payload || typeof payload !== 'object') {
        return { status: 400, body: { data: null, error: { message: 'Payload inválido en update.' } } };
      }
      const allowedKeys = Object.keys(payload).filter((k) => Boolean(tableMeta.cols[k]));
      if (allowedKeys.length === 0) {
        return { status: 400, body: { data: null, error: { message: 'Sin columnas válidas en update.' } } };
      }

      const setSql = allowedKeys
        .map((k) => {
          const colType = tableMeta.cols[k];
          params.push(normalizeWriteValue(colType, payload[k]));
          const p = `$${params.length}`;
          return colType === 'jsonb' ? `"${k}" = ${p}::jsonb` : `"${k}" = ${p}`;
        })
        .join(', ');

      const whereSql = buildWhereClause(tableMeta, body.filters, params);
      if (!whereSql) {
        return { status: 400, body: { data: null, error: { message: 'UPDATE requiere al menos un filtro.' } } };
      }

      const returningSql = body.returning ? `RETURNING ${buildSelectList(tableMeta, body.columns)}` : '';
      const query = `UPDATE public."${table}" SET ${setSql} ${whereSql} ${returningSql}`;
      const rawRows = await sql.query(query, params);
      const rows = (rawRows || []).map((r) => normalizeResponseRow(r, tableMeta));

      if (body.single || body.maybeSingle) {
        return { status: 200, body: { data: rows[0] ?? null, error: null } };
      }
      return { status: 200, body: { data: body.returning ? rows : null, error: null } };
    }

    if (action === 'delete') {
      const whereSql = buildWhereClause(tableMeta, body.filters, params);
      if (!whereSql) {
        return { status: 400, body: { data: null, error: { message: 'DELETE requiere al menos un filtro.' } } };
      }
      const returningSql = body.returning ? `RETURNING ${buildSelectList(tableMeta, body.columns)}` : '';
      const query = `DELETE FROM public."${table}" ${whereSql} ${returningSql}`;
      const rawRows = await sql.query(query, params);
      const rows = (rawRows || []).map((r) => normalizeResponseRow(r, tableMeta));
      return { status: 200, body: { data: body.returning ? rows : null, error: null } };
    }

    return { status: 400, body: { data: null, error: { message: `Acción no soportada: ${action}` } } };
    });
  } catch (err) {
    console.error(`[NeonDB ${action} ${table}] Error:`, err);
    const pgDetails = [err?.detail, err?.hint].filter(Boolean).join(' — ');
    const message = pgDetails
      ? `${err?.message || 'Error en PostgreSQL'} (${pgDetails})`
      : err?.message || 'Error ejecutando consulta en PostgreSQL';
    return {
      status: 500,
      body: {
        data: null,
        error: {
          message,
          code: err?.code || undefined,
          constraint: err?.constraint || undefined,
        },
      },
    };
  }
}

export async function executeFileGet(queryObj, dbUrl) {
  const bucket = String(queryObj?.bucket || '').trim();
  const filePath = String(queryObj?.path || '').trim();
  if (!bucket || !filePath) {
    return { status: 400, body: 'Faltan parámetros bucket y path.' };
  }
  try {
    return await runWithConnection(dbUrl, async (sql) => {
      const rows = await sql.query(
        `SELECT content_type, encode(data, 'base64') AS data_b64
         FROM public.archivos_storage
         WHERE bucket = $1 AND path = $2
         LIMIT 1`,
        [bucket, filePath]
      );
      if (!rows || rows.length === 0) {
        return { status: 404, body: 'Archivo no encontrado.' };
      }
      const buf = Buffer.from(rows[0].data_b64, 'base64');
      return {
        status: 200,
        contentType: rows[0].content_type || 'application/octet-stream',
        buffer: buf,
      };
    });
  } catch (err) {
    console.error('[NeonFile GET] Error:', err);
    return { status: 500, body: err?.message || 'Error leyendo archivo' };
  }
}

export async function executeFilePost(body, dbUrl) {
  const action = String(body?.action || 'upload').toLowerCase();
  const bucket = String(body?.bucket || 'evidencias').trim();

  try {
    return await runWithConnection(dbUrl, async (sql) => {
      if (action === 'list') {
        const folder = String(body?.folder || '').trim();
        const search = String(body?.search || '').trim();
        const prefix = folder ? `${folder.replace(/\/+$/, '')}/%` : '%';
        let rows;
        if (search) {
          rows = await sql.query(
            `SELECT path AS name, size_bytes, content_type, created_at
             FROM public.archivos_storage
             WHERE bucket = $1 AND path LIKE $2 AND path ILIKE $3
             ORDER BY created_at DESC LIMIT 100`,
            [bucket, prefix, `%${search}%`]
          );
        } else {
          rows = await sql.query(
            `SELECT path AS name, size_bytes, content_type, created_at
             FROM public.archivos_storage
             WHERE bucket = $1 AND path LIKE $2
             ORDER BY created_at DESC LIMIT 100`,
            [bucket, prefix]
          );
        }
        const mapped = rows.map((r) => ({
          name: folder && r.name.startsWith(`${folder}/`) ? r.name.slice(folder.length + 1) : r.name,
          fullPath: r.name,
          size: r.size_bytes,
          metadata: { size: Number(r.size_bytes) || 0, mimetype: r.content_type },
          content_type: r.content_type,
          created_at: r.created_at,
        }));
        return { status: 200, body: { data: mapped, error: null } };
      }

      // Upload (upsert)
      const filePath = String(body?.path || '').replace(/^\/+/, '').trim();
      const contentType = String(body?.contentType || 'application/octet-stream').trim();
      const rawB64 = String(body?.base64 || '');
      const cleanB64 = rawB64.includes('base64,') ? rawB64.split('base64,')[1] : rawB64;

      if (!filePath || !cleanB64) {
        return { status: 400, body: { data: null, error: { message: 'Faltan path o contenido base64.' } } };
      }

      const byteLen = Buffer.from(cleanB64, 'base64').length;
      await sql.query(
        `INSERT INTO public.archivos_storage (bucket, path, content_type, size_bytes, data)
         VALUES ($1, $2, $3, $4, decode($5, 'base64'))
         ON CONFLICT (bucket, path)
         DO UPDATE SET content_type = EXCLUDED.content_type,
                       size_bytes = EXCLUDED.size_bytes,
                       data = EXCLUDED.data,
                       created_at = now()`,
        [bucket, filePath, contentType, byteLen, cleanB64]
      );

      return { status: 200, body: { data: { path: filePath }, error: null } };
    });
  } catch (err) {
    console.error('[NeonFile POST] Error:', err);
    return { status: 500, body: { data: null, error: { message: err?.message || 'Error guardando archivo' } } };
  }
}
