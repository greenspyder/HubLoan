import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
export async function localEncryptionKey(path) {
  await mkdir(dirname(path), { recursive: true });
  try { await writeFile(path, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const key = (await readFile(path, 'utf8')).trim();
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Local encryption key is invalid.');
  return key;
}
