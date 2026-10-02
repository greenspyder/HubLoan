import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initialWorkspace, AppError } from './domain.mjs';
import { normalizeWorkspace } from './autonomy.mjs';

export function postgresConfig(value) {
  if (/^postgres(ql)?:\/\//i.test(value)) return { connectionString: value };
  const fields = Object.fromEntries(value.split(';').filter(Boolean).map(part => { const index = part.indexOf('='); return [part.slice(0, index).trim().toLowerCase().replaceAll(' ', ''), part.slice(index + 1).trim()]; }));
  if (!fields.host) throw new Error('Configuração do PostgreSQL inválida.');
  const config = { host: fields.host, port: Number(fields.port || 5432), user: fields.username || fields.userid, password: fields.password, database: fields.database };
  if (fields.sslmode && fields.sslmode.toLowerCase() !== 'disable') config.ssl = { rejectUnauthorized: true };
  return config;
}
export async function createStore({ connectionString, file = 'data/agents.sqlite' } = {}) {
  let sqlite, pool;
  if (connectionString) {
    const { Pool } = await import('pg');
    pool = new Pool({ ...postgresConfig(connectionString), max: 5, connectionTimeoutMillis: 10000 });
    await pool.query('CREATE TABLE IF NOT EXISTS agent_workspaces (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)');
    await pool.query('CREATE TABLE IF NOT EXISTS shop_files (product_id TEXT PRIMARY KEY, data BYTEA NOT NULL, preview BYTEA)');
  } else {
    const { DatabaseSync } = await import('node:sqlite');
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    sqlite = new DatabaseSync(file);
    sqlite.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS agent_workspaces (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS shop_files (product_id TEXT PRIMARY KEY, data BLOB NOT NULL, preview BLOB)');
  }
  const mode = pool ? 'postgres' : 'sqlite';
  async function read(id) {
    const row = pool ? (await pool.query('SELECT data, revision FROM agent_workspaces WHERE id=$1', [id])).rows[0] : sqlite.prepare('SELECT data, revision FROM agent_workspaces WHERE id=?').get(id);
    return row ? { workspace: normalizeWorkspace(JSON.parse(row.data)), revision: row.revision } : { workspace: normalizeWorkspace(initialWorkspace()), revision: -1 };
  }
  async function mutate(id, operation) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const { workspace, revision } = await read(id);
      const result = operation(workspace);
      const data = JSON.stringify(workspace);
      let success;
      if (pool) {
        const query = revision === -1 ? await pool.query('INSERT INTO agent_workspaces(id,data) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, data]) : await pool.query('UPDATE agent_workspaces SET data=$1, revision=revision+1 WHERE id=$2 AND revision=$3', [data, id, revision]);
        success = query.rowCount === 1;
      } else {
        const query = revision === -1 ? sqlite.prepare('INSERT OR IGNORE INTO agent_workspaces(id,data) VALUES(?,?)').run(id, data) : sqlite.prepare('UPDATE agent_workspaces SET data=?,revision=revision+1 WHERE id=? AND revision=?').run(data, id, revision);
        success = query.changes === 1;
      }
      if (success) return { workspace, result };
    }
    throw new AppError('O espaço está ocupado. Tente novamente.', 409);
  }
  async function autonomousSpaces(after = '') {
    const rows = pool ? (await pool.query(`SELECT id, data::jsonb->'autonomy'->'grant' AS grant FROM agent_workspaces WHERE id > $1 AND data::jsonb @> '{"autonomy":{"enabled":true}}'::jsonb ORDER BY id LIMIT 100`, [after])).rows : sqlite.prepare("SELECT id, json_extract(data, '$.autonomy.grant') AS grant FROM agent_workspaces WHERE id > ? AND json_extract(data, '$.autonomy.enabled')=1 ORDER BY id LIMIT 100").all(after);
    return rows.map(row => ({ id: row.id, grant: typeof row.grant === 'string' ? JSON.parse(row.grant) : row.grant }));
  }
  async function commerceSpaces() {
    const rows = pool ? (await pool.query(`SELECT id, data::jsonb->'commerce'->'grant' AS grant FROM agent_workspaces WHERE data::jsonb @> '{"commerce":{"background":true}}'::jsonb LIMIT 100`)).rows : sqlite.prepare("SELECT id, json_extract(data, '$.commerce.grant') AS grant FROM agent_workspaces WHERE json_extract(data, '$.commerce.background')=1 LIMIT 100").all();
    return rows.filter(row => row.grant).map(row => ({ id: row.id, grant: typeof row.grant === 'string' ? JSON.parse(row.grant) : row.grant }));
  }
  async function shopBySlug(slug) {
    const rows = pool ? (await pool.query("SELECT id, data FROM agent_workspaces WHERE data::jsonb->'shop'->>'slug'=$1 LIMIT 1", [slug])).rows : sqlite.prepare("SELECT id, data FROM agent_workspaces WHERE json_extract(data, '$.shop.slug')=? LIMIT 1").all(slug);
    return rows[0] ? { id: rows[0].id, workspace: normalizeWorkspace(JSON.parse(rows[0].data)) } : null;
  }
  async function shopSpaces() {
    return pool ? (await pool.query(`SELECT id FROM agent_workspaces WHERE data::jsonb @> '{"shop":{"autoPublish":true,"enabled":true}}'::jsonb LIMIT 100`)).rows : sqlite.prepare("SELECT id FROM agent_workspaces WHERE json_extract(data, '$.shop.autoPublish')=1 AND json_extract(data, '$.shop.enabled')=1 LIMIT 100").all();
  }
  async function marketingSpaces() {
    return pool ? (await pool.query(`SELECT id FROM agent_workspaces WHERE data::jsonb @> '{"marketing":{"enabled":true}}'::jsonb OR data::jsonb->'marketing'->'campaigns' @> '[{"status":"publishing"}]'::jsonb LIMIT 100`)).rows : sqlite.prepare("SELECT DISTINCT w.id FROM agent_workspaces w LEFT JOIN json_each(w.data, '$.marketing.campaigns') c WHERE json_extract(w.data, '$.marketing.enabled')=1 OR json_extract(c.value, '$.status')='publishing' LIMIT 100").all();
  }
  async function engineeringSpaces() {
    return pool ? (await pool.query(`SELECT id FROM agent_workspaces WHERE data::jsonb @> '{"engineering":{"enabled":true}}'::jsonb OR data::jsonb->'engineering'->'jobs' @> '[{"status":"queued"}]'::jsonb OR data::jsonb->'engineering'->'jobs' @> '[{"status":"running"}]'::jsonb LIMIT 100`)).rows : sqlite.prepare("SELECT DISTINCT w.id FROM agent_workspaces w LEFT JOIN json_each(w.data, '$.engineering.jobs') j WHERE json_extract(w.data, '$.engineering.enabled')=1 OR json_extract(j.value, '$.status') IN ('queued','running') LIMIT 100").all();
  }
  async function writeSaleFile(productId, bytes, preview = null) {
    if (pool) await pool.query('INSERT INTO shop_files(product_id,data,preview) VALUES($1,$2,$3)', [productId, bytes, preview]);
    else sqlite.prepare('INSERT INTO shop_files(product_id,data,preview) VALUES(?,?,?)').run(productId, bytes, preview);
  }
  async function readSaleFile(productId, preview = false) {
    const column = preview ? 'preview' : 'data';
    const row = pool ? (await pool.query(`SELECT ${column} AS data FROM shop_files WHERE product_id=$1`, [productId])).rows[0] : sqlite.prepare(`SELECT ${column} AS data FROM shop_files WHERE product_id=?`).get(productId);
    if (!row?.data) throw new AppError('Arquivo indisponível. Contate o vendedor.', 404);
    return Buffer.from(row.data);
  }
  async function removeSaleFile(productId) {
    if (pool) await pool.query('DELETE FROM shop_files WHERE product_id=$1', [productId]);
    else sqlite.prepare('DELETE FROM shop_files WHERE product_id=?').run(productId);
  }
  return { read, mutate, autonomousSpaces, commerceSpaces, shopBySlug, shopSpaces, marketingSpaces, engineeringSpaces, writeSaleFile, readSaleFile, removeSaleFile, mode, close: async () => { if (pool) await pool.end(); else sqlite.close(); } };
}
