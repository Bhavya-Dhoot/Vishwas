import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createDocuments } from '../src/documents.mjs';
import { createApp } from '../server.mjs';

const owner = { role: 'patient', patientId: 'synthetic_patient' };
const upload = { patientId: owner.patientId, name: 'Synthetic referral', mimeType: 'text/plain', contentBase64: Buffer.from('Only synthetic demo content').toString('base64') };

test('document metadata, salt and bytes persist encrypted and authenticated', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vishwas-document-test-'));
  const path = join(directory, 'documents.sqlite');
  const key = randomBytes(32);
  let docs = createDocuments(path, { key });
  try {
    const doc = docs.upload(upload, owner);
    docs.close();
    docs = createDocuments(path, { key });
    assert.equal(docs.get(doc.id, owner).contentBase64, upload.contentBase64);
    const db = new DatabaseSync(path);
    try {
      const row = db.prepare('SELECT encrypted FROM documents').get();
      for (const secret of [upload.name, upload.patientId, upload.contentBase64, doc.commitment]) assert.equal(row.encrypted.includes(secret), false);
      const envelope = JSON.parse(row.encrypted);
      envelope.tag = randomBytes(16).toString('base64');
      db.prepare('UPDATE documents SET encrypted = ?').run(JSON.stringify(envelope));
      assert.throws(() => docs.get(doc.id, owner), /authenticated/);
    } finally { db.close(); }
  } finally {
    docs.close();
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep));
    rmSync(directory, { recursive: true, force: true });
  }
});

test('documents enforce ownership, explicit ledger consent, salted commitments and offline recovery', async () => {
  const calls = [];
  let available = false;
  const docs = createDocuments(':memory:', { key: randomBytes(32), gatewayUrl: 'http://127.0.0.1:3101', gatewayToken: 'test', fetchImpl: async (url, options) => {
    calls.push(options.body ? JSON.parse(options.body) : String(url));
    if (!available) throw new Error('offline');
    const commitment = options.body ? JSON.parse(options.body).commitment : String(url).split('/').at(-1);
    return { ok: true, json: async () => ({ commitment, exists: true }) };
  } });
  try {
    const first = docs.upload(upload, owner);
    const second = docs.upload({ ...upload, ledgerConsent: true }, owner);
    assert.notEqual(first.commitment, second.commitment);
    assert.equal(first.anchorStatus, 'offchain_saved');
    assert.equal('salt' in first, false);
    assert.equal('contentBase64' in first, false);
    await assert.rejects(docs.anchor(first.id, owner), /consent/);
    await docs.verify(first.id, owner);
    assert.equal(calls.length, 0);
    assert.equal((await docs.anchor(second.id, owner)).anchorStatus, 'anchor_failed');
    assert.deepEqual(calls[0], { commitment: second.commitment });
    available = true;
    assert.equal((await docs.anchor(second.id, owner)).anchorStatus, 'anchored');
    assert.equal((await docs.verify(second.id, owner)).verified, true);
    assert.throws(() => docs.get(first.id, { role: 'patient', patientId: 'someone_else' }), /not found/);
    assert.deepEqual(docs.list({ role: 'patient', patientId: 'someone_else' }), []);
    assert.throws(() => docs.upload({ ...upload, mimeType: 'application/pdf' }, owner), /signature/);
    assert.throws(() => docs.upload({ ...upload, mimeType: 'text/html' }, owner), /Only PDF/);
    assert.throws(() => docs.upload({ ...upload, contentBase64: '/w==' }, owner), /UTF-8/);
    for (let n = 0; n < 3; n++) docs.upload(upload, owner);
    assert.throws(() => docs.upload(upload, owner), /five/);
    assert.equal(docs.delete(second.id, owner).ledgerCommitmentRetained, true);
    assert.throws(() => docs.get(second.id, owner), /not found/);
  } finally { docs.close(); }
});

test('document HTTP routes require sessions, CSRF and owner scope; download is attachment-only', async () => {
  const app = createApp({ dbPath: ':memory:' });
  await app.ready;
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('/api/documents', upload)).status, 401);
    const login = await post('/api/session/patient', { name: 'Synthetic Demo', language: 'English', contactConsent: false, caregiverConsent: false, departmentId: 'neurology', scheduleConsent: true });
    const info = await login.json();
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const headers = { cookie, 'x-csrf-token': info.session.csrfToken };
    const body = { ...upload, patientId: info.result.patientId };
    assert.equal((await post('/api/documents', body, { cookie })).status, 403);
    const saved = await post('/api/documents', body, headers);
    assert.equal(saved.status, 201);
    const { document } = await saved.json();
    const path = `/api/documents/${document.id}`;
    assert.equal((await fetch(base + path + '/download')).status, 401);
    const download = await fetch(base + path + '/download', { headers });
    assert.match(download.headers.get('content-disposition'), /^attachment;/);
    assert.equal(await download.text(), 'Only synthetic demo content');
    const state = await (await fetch(base + '/api/state', { headers })).json();
    assert.equal(state.documents.length, 1);
    assert.equal('contentBase64' in state.documents[0], false);
    const other = await post('/api/session/demo', { role: 'patient', patientId: 'patient_booked' });
    assert.equal((await fetch(base + path + '/download', { headers: { cookie: other.headers.get('set-cookie').split(';')[0] } })).status, 404);
    assert.equal((await post(path + '/anchor', {}, headers)).status, 403);
    assert.equal((await post(path + '/delete', {}, headers)).status, 200);
    assert.equal((await fetch(base + path + '/download', { headers })).status, 404);
  } finally { await app.close(); }
});
