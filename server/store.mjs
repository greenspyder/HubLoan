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
  } else {
    const { DatabaseSync } = await import('node:sqlite');
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    sqlite = new DatabaseSync(file);
    sqlite.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS agent_workspaces (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)');
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
  return { read, mutate, autonomousSpaces, commerceSpaces, mode, close: async () => { if (pool) await pool.end(); else sqlite.close(); } };
}
