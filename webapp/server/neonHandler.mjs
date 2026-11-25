import { neon, types } from '@neondatabase/serverless';

// Preservar columnas DATE de PostgreSQL como string 'YYYY-MM-DD' igual que PostgREST
if (types?.setTypeParser) {
  types.setTypeParser(1082, (val) => val);
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

function getSql(dbUrl) {
  const url = dbUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está configurada en el servidor.');
  }
  return neon(url);
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

export async function executeDbRequest(body, dbUrl) {
  const table = String(body?.table || '').trim();
  const tableMeta = TABLE_SCHEMA[table];
  if (!tableMeta) {
    return { status: 400, body: { data: null, error: { message: `Tabla no permitida: ${table}` } } };
  }

  const sql = getSql(dbUrl);
  const action = String(body?.action || 'select').toLowerCase();
  const params = [];

  try {
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
  } catch (err) {
    console.error(`[NeonDB ${action} ${table}] Error:`, err);
    return {
      status: 500,
      body: { data: null, error: { message: err?.message || 'Error ejecutando consulta en Neon Postgres' } },
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
    const sql = getSql(dbUrl);
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
  } catch (err) {
    console.error('[NeonFile GET] Error:', err);
    return { status: 500, body: err?.message || 'Error leyendo archivo' };
  }
}

export async function executeFilePost(body, dbUrl) {
  const action = String(body?.action || 'upload').toLowerCase();
  const bucket = String(body?.bucket || 'evidencias').trim();
  const sql = getSql(dbUrl);

  try {
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
  } catch (err) {
    console.error('[NeonFile POST] Error:', err);
    return { status: 500, body: { data: null, error: { message: err?.message || 'Error guardando archivo' } } };
  }
}
