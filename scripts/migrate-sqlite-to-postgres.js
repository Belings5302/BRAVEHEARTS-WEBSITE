require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Pool } = require('pg');

const sqlitePath = path.resolve(process.argv[2] || 'data/database.sqlite');
if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite database not found: ${sqlitePath}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL && !process.env.DB_NAME) {
  console.error('Set DATABASE_URL or DB_* environment variables before migrating.');
  process.exit(1);
}

const TABLES = [
  'users',
  'products',
  'admins',
  'games',
  'players',
  'news',
  'gallery',
  'polls',
  'standings',
  'orders',
  'order_items',
  'payments',
  'subscriptions',
  'admin_sessions',
  'password_reset_tokens',
  'player_stats',
  'poll_votes',
  'notifications',
  'admin_logs',
  'seeding_flags'
];

const pool = new Pool(process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'bravehearts',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || undefined
    });

function readSqliteTable(table) {
  const py = String.raw`
import json, sqlite3, sys
conn = sqlite3.connect(sys.argv[1])
conn.row_factory = sqlite3.Row
table = sys.argv[2]
rows = [dict(row) for row in conn.execute('SELECT * FROM "' + table.replace('"', '""') + '"')]
print(json.dumps(rows, default=str))
`;
  const result = spawnSync('python', ['-c', py, sqlitePath, table], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });
  if (result.status !== 0) {
    throw new Error(`Failed reading SQLite table ${table}: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout || '[]');
}

async function tableExists(client, table) {
  const result = await client.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
  return Boolean(result.rows[0]?.name);
}

async function columnsFor(client, table) {
  const result = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table]
  );
  return new Map(result.rows.map(row => [row.column_name, row.data_type]));
}

function coerceValue(value, dataType) {
  if (value === null || value === undefined) return value;
  if ((dataType || '').includes('timestamp') || dataType === 'date') {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 100000000000) {
      return new Date(numeric).toISOString();
    }
  }
  return value;
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function resetSequence(client, table) {
  const cols = await columnsFor(client, table);
  if (!cols.has('id')) return;
  const result = await client.query('SELECT pg_get_serial_sequence($1, $2) AS seq', [table, 'id']);
  const seq = result.rows[0]?.seq;
  if (seq) {
    await client.query(`SELECT setval($1, COALESCE((SELECT MAX(id) FROM ${quoteIdent(table)}), 0) + 1, false)`, [seq]);
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET session_replication_role = replica');

    for (const table of [...TABLES].reverse()) {
      if (await tableExists(client, table)) {
        await client.query(`DELETE FROM ${quoteIdent(table)}`);
      }
    }

    const summary = [];
    for (const table of TABLES) {
      if (!(await tableExists(client, table))) continue;
      const pgColumns = await columnsFor(client, table);
      const rows = readSqliteTable(table);
      let inserted = 0;
      for (const row of rows) {
        const columns = Object.keys(row).filter(column => pgColumns.has(column));
        if (columns.length === 0) continue;
        const placeholders = columns.map((_, index) => `$${index + 1}`);
        const values = columns.map(column => coerceValue(row[column], pgColumns.get(column)));
        await client.query(
          `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(', ')}) VALUES (${placeholders.join(', ')})`,
          values
        );
        inserted += 1;
      }
      summary.push({ table, inserted });
    }

    await client.query('SET session_replication_role = DEFAULT');
    for (const table of TABLES) {
      if (await tableExists(client, table)) await resetSequence(client, table);
    }
    await client.query('COMMIT');

    console.table(summary);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
