import { createServer } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { validateDirectory } from '../../src/hospital-connector.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const identifier = /^[A-Za-z0-9_.:-]{1,200}$/;

export function sampleDirectory({ today = new Date().toISOString().slice(0, 10), days = 21 } = {}) {
  const departments = [
    { id: 'general_medicine', name: 'General Medicine', location: 'Ground floor, Desk A' },
    { id: 'endocrinology', name: 'Endocrinology', location: 'First floor, Desk B' },
    { id: 'neurology', name: 'Neurology', location: 'First floor, Desk C' },
  ];
  const specialists = [
    { id: 'sp_general', name: 'Dr. Mira Shah (Demo)', departmentId: 'general_medicine', languages: ['English', 'Hindi'], room: 'G-01' },
    { id: 'sp_general_2', name: 'Dr. Samir Gupta (Demo)', departmentId: 'general_medicine', languages: ['English'], room: 'G-02' },
    { id: 'sp_endo', name: 'Dr. Arjun Mehta (Demo)', departmentId: 'endocrinology', languages: ['English', 'Hindi'], room: 'F-02' },
    { id: 'sp_endo_2', name: 'Dr. Nisha Kapoor (Demo)', departmentId: 'endocrinology', languages: ['English'], room: 'F-04' },
    { id: 'sp_neuro', name: 'Dr. Kavya Rao (Demo)', departmentId: 'neurology', languages: ['English', 'Hindi'], room: 'F-03' },
    { id: 'sp_neuro_2', name: 'Dr. Dev Sen (Demo)', departmentId: 'neurology', languages: ['English'], room: 'F-05' },
  ];
  const slots = [];
  for (let offset = 0; offset < days; offset++) {
    const value = new Date(`${today}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    const date = value.toISOString().slice(0, 10);
    for (const specialist of specialists) for (const [period, time] of [['morning', '10:00'], ['afternoon', '14:00']]) {
      slots.push({ id: `${specialist.id}_${date}_${period}`, specialistId: specialist.id, date, time, capacity: 2 });
    }
  }
  return { departments, specialists, slots };
}

export function createSampleHospital({ token, dbPath = ':memory:', directory = sampleDirectory() } = {}) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9._~-]{24,512}$/.test(token)) throw new Error('A secret token of at least 24 characters is required');
  const catalog = validateDirectory(directory);
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, booking_key TEXT NOT NULL UNIQUE, slot_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN (\'confirmed\', \'cancelled\')))');
  const expected = Buffer.from(`Bearer ${token}`);
  const reply = (response, status, data) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); response.end(JSON.stringify(data)); };
  const shape = row => ({ id: row.id, idempotencyKey: row.booking_key, slotId: row.slot_id, status: row.status });
  const lookup = db.prepare('SELECT * FROM reservations WHERE booking_key = ?');
  const occupied = db.prepare('SELECT COUNT(*) AS count FROM reservations WHERE slot_id = ? AND status = \'confirmed\'');

  const server = createServer(async (request, response) => {
    const supplied = Buffer.from(request.headers.authorization ?? '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply(response, 401, { error: 'Authentication required' });
    if (request.headers.origin) return reply(response, 403, { error: 'Server-to-server API only' });
    const path = request.url?.split('?')[0];
    try {
      if (request.method === 'GET' && path === '/health') return reply(response, 200, { status: 'ok', kind: 'sample-hospital', data: 'fictional' });
      if (request.method === 'GET' && path === '/directory') return reply(response, 200, catalog);
      if (request.method === 'POST' && path === '/bookings') {
        if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) return reply(response, 415, { error: 'JSON required' });
        let size = 0;
        const chunks = [];
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 2048) { reply(response, 413, { error: 'Request is too large' }); return; }
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(response, 400, { error: 'Invalid JSON' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 2 || typeof body.idempotencyKey !== 'string' || typeof body.slotId !== 'string' || !identifier.test(body.idempotencyKey) || !identifier.test(body.slotId)) return reply(response, 400, { error: 'Only opaque idempotencyKey and slotId are accepted' });
        const slot = catalog.slots.find(value => value.id === body.slotId);
        if (!slot) return reply(response, 404, { error: 'Unknown slot' });
        // ponytail: One SQLite transaction handles the sample API; a vendor adapter must preserve these reservation semantics.
        db.exec('BEGIN IMMEDIATE');
        let result;
        try {
          const existing = lookup.get(body.idempotencyKey);
          if (existing && existing.slot_id !== body.slotId) { db.exec('ROLLBACK'); return reply(response, 409, { error: 'Booking key is already bound to another slot' }); }
          if (existing?.status === 'confirmed') result = shape(existing);
          else {
            if (occupied.get(body.slotId).count >= slot.capacity) { db.exec('ROLLBACK'); return reply(response, 409, { error: 'Slot capacity is full' }); }
            const reservationId = existing?.id ?? `reservation_${randomUUID()}`;
            db.prepare('INSERT INTO reservations(id, booking_key, slot_id, status) VALUES (?, ?, ?, \'confirmed\') ON CONFLICT(booking_key) DO UPDATE SET status = \'confirmed\'').run(reservationId, body.idempotencyKey, body.slotId);
            result = { id: reservationId, idempotencyKey: body.idempotencyKey, slotId: body.slotId, status: 'confirmed' };
          }
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        return reply(response, 200, result);
      }
      const cancellation = /^\/bookings\/([A-Za-z0-9_.:-]{1,200})$/.exec(path ?? '');
      if (request.method === 'DELETE' && cancellation) {
        const value = db.prepare('SELECT id FROM reservations WHERE id = ?').get(cancellation[1]);
        if (!value) return reply(response, 404, { error: 'Unknown reservation' });
        db.prepare('UPDATE reservations SET status = \'cancelled\' WHERE id = ?').run(value.id);
        return reply(response, 200, { id: value.id, status: 'cancelled' });
      }
      return reply(response, 404, { error: 'Not found' });
    } catch { reply(response, 500, { error: 'Sample hospital operation failed' }); }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return { server, close: async () => { if (server.listening) await new Promise(resolveClose => server.close(resolveClose)); db.close(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const tokenPath = process.env.HOSPITAL_API_TOKEN_FILE || join(process.env.LOCALAPPDATA || homedir(), 'Vishwas', 'sample-hospital-api.token');
  let token = process.env.HOSPITAL_API_TOKEN;
  if (!token) {
    await mkdir(dirname(tokenPath), { recursive: true });
    try { token = (await readFile(tokenPath, 'utf8')).trim(); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      token = randomBytes(32).toString('hex');
      await writeFile(tokenPath, token, { flag: 'wx', mode: 0o600 });
    }
  }
  const dbPath = resolve(process.env.SAMPLE_HOSPITAL_DB || join(root, 'data', 'sample-hospital.sqlite'));
  await mkdir(dirname(dbPath), { recursive: true });
  const hospital = createSampleHospital({ token, dbPath });
  const port = Number(process.env.SAMPLE_HOSPITAL_PORT || 4100);
  hospital.server.listen(port, '127.0.0.1', () => process.stdout.write(`Sample hospital API: http://127.0.0.1:${port}\nFictional directory only. Token file: ${tokenPath}\n`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await hospital.close(); process.exit(0); });
}
