const crypto = require('crypto');
const { Pool } = require('pg');

function getPgConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'bravehearts',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || undefined
  };
}

const pool = new Pool(getPgConfig());

function normalizeSql(sql, params = []) {
  let index = 0;
  return {
    text: String(sql).replace(/\?/g, () => `$${++index}`),
    values: Array.isArray(params) ? params : []
  };
}

function normalizeParams(params, callback) {
  if (typeof params === 'function') {
    return { params: [], callback: params };
  }
  return { params: Array.isArray(params) ? params : [], callback };
}

function createRunContext(result) {
  return {
    lastID: result?.rows?.[0]?.id,
    changes: result?.rowCount || 0
  };
}

function run(sql, params, callback) {
  const normalized = normalizeParams(params, callback);
  const trimmed = String(sql).trim().toUpperCase();

  if (trimmed === 'BEGIN TRANSACTION') return run('BEGIN', [], normalized.callback);
  if (trimmed === 'COMMIT') return run('COMMIT', [], normalized.callback);
  if (trimmed === 'ROLLBACK') return run('ROLLBACK', [], normalized.callback);

  let query = normalizeSql(sql, normalized.params);
  if (/^INSERT\s+/i.test(query.text) && !/\bRETURNING\b/i.test(query.text) && !/^INSERT\s+INTO\s+admin_sessions\b/i.test(query.text)) {
    query = { ...query, text: `${query.text} RETURNING id` };
  }

  pool.query(query.text, query.values)
    .then(result => normalized.callback?.call(createRunContext(result), null))
    .catch(error => normalized.callback?.(error));
}

function get(sql, params, callback) {
  const normalized = normalizeParams(params, callback);
  const query = normalizeSql(sql, normalized.params);
  pool.query(query.text, query.values)
    .then(result => normalized.callback?.(null, result.rows[0]))
    .catch(error => normalized.callback?.(error));
}

function all(sql, params, callback) {
  const normalized = normalizeParams(params, callback);
  const query = normalizeSql(sql, normalized.params);
  pool.query(query.text, query.values)
    .then(result => normalized.callback?.(null, result.rows))
    .catch(error => normalized.callback?.(error));
}

function prepare(sql) {
  return {
    run: (...args) => {
      const callback = typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
      run(sql, args, callback);
    },
    finalize: (callback) => callback?.()
  };
}

function serialize(callback) {
  callback?.();
}

async function ensureSupportTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seeding_flags (
      entity VARCHAR(100) PRIMARY KEY,
      seeded_at TIMESTAMPTZ NOT NULL
    )
  `);
}

const ready = ensureSupportTables().catch(error => {
  console.error('Failed to initialize PostgreSQL support tables:', error);
  process.exitCode = 1;
});

const db = {
  run,
  get,
  all,
  prepare,
  serialize,
  close: (callback) => pool.end().then(() => callback?.()).catch(callback),
  pool,
  ready
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = { db, pool, hashPassword };
