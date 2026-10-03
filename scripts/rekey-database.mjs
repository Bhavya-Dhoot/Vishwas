import { DatabaseSync } from 'node:sqlite';
import { createHmac, randomBytes } from 'node:crypto';
import { openSync, closeSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seal, unseal } from '../src/security.mjs';

// Copy-only rotation: a consistent source snapshot stays intact. Stop the app before
// taking a replacement snapshot, then verify it before switching DB_PATH/STATE_KEY.
export function rekeyCopy({ sourcePath, targetPath, oldKey, newKey }) {
  if (resolve(sourcePath) === resolve(targetPath)) throw new Error('Rotation requires a new destination');
  if (oldKey.equals(newKey)) throw new Error('Rotation requires a different key');
  let source, target, created = false;
  const counts = { state: 0, documents: 0, pendingBookings: 0 };
  const read = (value, context) => unseal(value, oldKey, JSON.parse(value).v === 1 ? undefined : context);
  try {
    source = new DatabaseSync(sourcePath, { readOnly: true });
    source.exec('BEGIN');
    const tables = source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name);
    if (!tables.includes('app_state') || tables.some(name => !['app_state', 'documents', 'booking_intents'].includes(name))) throw new Error('Unexpected database schema; rotation refused');
    closeSync(openSync(targetPath, 'wx', 0o600));
    created = true;
    target = new DatabaseSync(targetPath);
    target.exec('BEGIN IMMEDIATE; CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL); CREATE TABLE documents (id TEXT PRIMARY KEY, encrypted TEXT NOT NULL); CREATE TABLE booking_intents (id TEXT PRIMARY KEY, json TEXT NOT NULL)');
    const row = source.prepare('SELECT json FROM app_state WHERE id=1').get();
    if (!row) throw new Error('Workflow state missing');
    const state = read(row.json, 'app-state:1');
    if (!['patients', 'episodes', 'departments', 'specialists', 'slots', 'messages', 'audit'].every(k => Array.isArray(state?.[k]))) throw new Error('Invalid workflow state');
    const verifyWrite = (value, context) => {
      const encrypted = seal(value, newKey, context);
      if (JSON.stringify(unseal(encrypted, newKey, context)) !== JSON.stringify(value)) throw new Error('Rekey verification failed');
      return encrypted;
    };
    target.prepare('INSERT INTO app_state VALUES (1, ?)').run(verifyWrite(state, 'app-state:1'));
    counts.state = 1;
    if (tables.includes('documents')) for (const docRow of source.prepare('SELECT id, encrypted FROM documents').iterate()) {
      const document = read(docRow.encrypted, `document:${docRow.id}`);
      if (document?.id !== docRow.id) throw new Error('Document row identity mismatch');
      target.prepare('INSERT INTO documents VALUES (?, ?)').run(docRow.id, verifyWrite(document, `document:${docRow.id}`));
      counts.documents++;
    }
    if (tables.includes('booking_intents')) for (const intentRow of source.prepare('SELECT id, json FROM booking_intents').iterate()) {
      const intent = unseal(intentRow.json, oldKey, `booking-intent:${intentRow.id}`);
      if (typeof intent?.episodeId !== 'string' || createHmac('sha256', oldKey).update(intent.episodeId).digest('hex') !== intentRow.id) throw new Error('Booking intent row identity mismatch');
      const newId = createHmac('sha256', newKey).update(intent.episodeId).digest('hex');
      target.prepare('INSERT INTO booking_intents VALUES (?, ?)').run(newId, verifyWrite(intent, `booking-intent:${newId}`));
      counts.pendingBookings++;
    }
    if (target.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('SQLite integrity check failed');
    target.exec('COMMIT');
    source.exec('COMMIT');
    return counts;
  } catch (error) {
    target?.close(); target = null;
    // Only remove the exact new file this call created; never touch source or a pre-existing target.
    if (created) rmSync(targetPath, { force: true });
    throw error;
  } finally { target?.close(); source?.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [offline, sourcePath, targetPath, oldKeyPath, newKeyPath] = process.argv.slice(2);
  if (offline !== '--offline' || !sourcePath || !targetPath || !oldKeyPath || !newKeyPath) throw new Error('Stop the application, then: node scripts/rekey-database.mjs --offline <source.sqlite> <new.sqlite> <old-key-file> <new-key-file-outside-repository>');
  const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
  const resolvedKey = join(realpathSync(dirname(resolve(newKeyPath))), resolve(newKeyPath).split(/[\\/]/).at(-1));
  const keyRelative = relative(root, resolvedKey);
  if (!keyRelative || !keyRelative.startsWith('..') && !isAbsolute(keyRelative)) throw new Error('New key must be outside the repository, including symlink targets');
  const bytes = readFileSync(oldKeyPath);
  const oldKey = bytes.length === 32 ? bytes : /^[a-f0-9]{64}$/i.test(bytes.toString().trim()) ? Buffer.from(bytes.toString().trim(), 'hex') : null;
  if (!oldKey) throw new Error('Old key file must hold 32 raw bytes or 64 hex characters');
  const newKey = randomBytes(32);
  writeFileSync(resolvedKey, newKey.toString('hex') + '\n', { flag: 'wx', mode: 0o600 });
  try {
    console.log(JSON.stringify({ copiedAndVerified: true, ...rekeyCopy({ sourcePath, targetPath, oldKey, newKey }), sourcePreserved: true, note: 'Keep the original DB/key until the new copy is opened and recovery tested. Switch configuration privately; no key is printed.' }));
  } catch (error) { rmSync(resolvedKey, { force: true }); throw error; }
}
