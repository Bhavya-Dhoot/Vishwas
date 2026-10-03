import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createWorkflow } from '../src/workflow.mjs';
import { createApp } from '../server.mjs';
import { passwordMatches, seal, unseal } from '../src/security.mjs';

const key = randomBytes(32);

test('context-bound envelopes authenticate their record context and keep legacy migration explicit', () => {
  const localKey = randomBytes(32);
  const envelope = seal({ id: 'record-a' }, localKey, 'document:record-a');
  assert.equal(JSON.parse(envelope).v, 2);
  assert.deepEqual(unseal(envelope, localKey, 'document:record-a'), { id: 'record-a' });
  assert.throws(() => unseal(envelope, localKey, 'document:record-b'), /authenticated/);
  assert.throws(() => unseal(envelope, localKey), /context/);

  const legacy = seal({ id: 'record-a' }, localKey);
  assert.equal(JSON.parse(legacy).v, 1);
  assert.deepEqual(unseal(legacy, localKey), { id: 'record-a' });
  assert.throws(() => unseal(legacy, localKey, 'document:record-a'), /explicit migration/);
  assert.throws(() => seal({}, randomBytes(16), 'record-a'), /32 bytes/);
});

test('password verification rejects malformed stored verifiers', () => {
  assert.equal(passwordMatches('password', null), false);
  assert.equal(passwordMatches('password', [randomBytes(16), randomBytes(31)]), false);
});

test('snapshot is encrypted, requires its key, and refuses tampering and plaintext', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vishwas-security-'));
  const path = join(dir, 'state.sqlite');
  try {
    let workflow = createWorkflow(path, { key });
    workflow.act('create_patient', { name: 'Sensitive Test', language: 'English', contactConsent: true, caregiverConsent: false });
    workflow.close();
    const db = new DatabaseSync(path);
    const saved = db.prepare('SELECT json FROM app_state WHERE id = 1').get().json;
    assert.ok(!saved.includes('Sensitive Test'));
    assert.match(saved, /"nonce"/);
    assert.equal(JSON.parse(saved).v, 2);
    const beforeNonce = JSON.parse(saved).nonce;
    workflow = createWorkflow(path, { key });
    assert.ok(workflow.getState().patients.some(p => p.name === 'Sensitive Test'));
    workflow.act('set_date', { date: '2026-10-04' });
    workflow.close();
    const updated = db.prepare('SELECT json FROM app_state WHERE id = 1').get().json;
    assert.notEqual(JSON.parse(updated).nonce, beforeNonce);
    assert.throws(() => createWorkflow(path, { key: randomBytes(32) }), /key does not match/);
    const tampered = JSON.parse(updated);
    tampered.data = randomBytes(32).toString('base64');
    db.prepare('UPDATE app_state SET json = ? WHERE id = 1').run(JSON.stringify(tampered));
    assert.throws(() => createWorkflow(path, { key }), /authenticated/);
    db.prepare('UPDATE app_state SET json = ? WHERE id = 1').run(JSON.stringify({ patients: [] }));
    assert.throws(() => createWorkflow(path, { key }), /Plaintext/);
    db.close();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

async function app(options) {
  const instance = createApp({ dbPath: ':memory:', key: key.toString('hex'), ...options });
  await instance.ready;
  instance.server.listen(0, '127.0.0.1');
  await once(instance.server, 'listening');
  const base = `http://127.0.0.1:${instance.server.address().port}`;
  return { base, close: instance.close };
}

async function post(base, path, body, session) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(session ? { cookie: session.cookie, 'x-csrf-token': session.csrfToken } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json(), response };
}

function session(result) {
  return { cookie: result.response.headers.get('set-cookie').split(';')[0], csrfToken: result.body.csrfToken ?? result.body.session.csrfToken };
}

test('demo sessions isolate patients and enforce roles, CSRF, logout and server actor', async () => {
  const { base, close } = await app({ mode: 'demo' });
  try {
    assert.equal((await fetch(base + '/api/state')).status, 401);
    assert.equal((await post(base, '/api/actions', { type: 'reset_demo', payload: {} })).status, 401);
    const one = await post(base, '/api/session/demo', { role: 'patient', patientId: 'patient_routing' });
    const patient = session(one);
    const csrfMissing = await fetch(base + '/api/actions', { method: 'POST', headers: { 'content-type': 'application/json', cookie: patient.cookie }, body: JSON.stringify({ type: 'checklist', payload: { episodeId: 'episode_routing', documentId: 'referral', ready: true } }) });
    assert.equal(csrfMissing.status, 403);
    const csrfWrong = await fetch(base + '/api/actions', { method: 'POST', headers: { 'content-type': 'application/json', cookie: patient.cookie, 'x-csrf-token': 'wrong' }, body: JSON.stringify({ type: 'checklist', payload: { episodeId: 'episode_routing', documentId: 'referral', ready: true } }) });
    assert.equal(csrfWrong.status, 403);
    const state = await (await fetch(base + '/api/state', { headers: { cookie: patient.cookie } })).json();
    assert.deepEqual(state.patients.map(p => p.id), ['patient_routing']);
    assert.ok(state.episodes.every(e => e.patientId === 'patient_routing'));
    assert.equal(state.audit, undefined);
    assert.equal((await post(base, '/api/actions', { type: 'checklist', payload: { episodeId: 'episode_booked', documentId: 'referral', ready: true } }, patient)).status, 404);
    assert.equal((await post(base, '/api/actions', { type: 'update_consent', payload: { patientId: 'patient_booked', contactConsent: false, caregiverConsent: false } }, patient)).status, 404);
    assert.equal((await post(base, '/api/actions', { type: 'book', payload: { episodeId: 'episode_routing', slotId: 'sp_general_2026-10-03_morning' } }, patient)).status, 403);
    assert.equal((await post(base, '/api/actions', { type: 'checklist', payload: { episodeId: 'episode_routing', documentId: 'referral', ready: true } })).status, 401);
    const staffResult = await post(base, '/api/session/demo', { role: 'staff' }, patient);
    const staff = session(staffResult);
    assert.equal((await fetch(base + '/api/state', { headers: { cookie: patient.cookie } })).status, 401);
    assert.equal((await post(base, '/api/actions', { type: 'confirm_route', payload: { episodeId: 'episode_routing', departmentId: 'general_medicine', referralNote: 'Review', confirmedBy: 'Impersonator' } }, staff)).status, 400);
    const routed = await post(base, '/api/actions', { type: 'confirm_route', payload: { episodeId: 'episode_routing', departmentId: 'general_medicine', referralNote: 'Review' } }, staff);
    assert.equal(routed.status, 200);
    assert.equal(routed.body.episodes.find(e => e.id === 'episode_routing').routeConfirmedBy, 'Demo staff');
    assert.equal((await post(base, '/api/session/logout', {}, staff)).status, 200);
    assert.equal((await fetch(base + '/api/state', { headers: { cookie: staff.cookie } })).status, 401);
  } finally { await close(); }
});

test('protected mode requires secrets and disables public staff demo and date reset', async () => {
  assert.throws(() => createApp({ mode: 'protected', dbPath: ':memory:', staffPassword: '' }), /STAFF_PASSWORD/);
  const missingKey = createApp({ mode: 'protected', dbPath: ':memory:', key: '', staffPassword: 'correct horse battery staple' });
  await assert.rejects(missingKey.ready, /STATE_KEY/);
  const { base, close } = await app({ mode: 'protected', staffPassword: 'correct horse battery staple' });
  try {
    assert.equal((await post(base, '/api/session/demo', { role: 'staff' })).status, 404);
    const invalid = await post(base, '/api/session/login', { password: 'wrong' });
    assert.equal(invalid.status, 401);
    const login = await post(base, '/api/session/login', { password: 'correct horse battery staple' });
    assert.equal(login.status, 200);
    const staff = session(login);
    const state = await (await fetch(base + '/api/state', { headers: { cookie: staff.cookie } })).json();
    assert.equal(state.patients.length, 0);
    assert.equal((await post(base, '/api/actions', { type: 'reset_demo', payload: {} }, staff)).status, 403);
    assert.equal((await post(base, '/api/actions', { type: 'set_date', payload: { date: '2026-10-03' } }, staff)).status, 403);
    const intake = await post(base, '/api/session/patient', { name: 'New Patient', language: 'English', contactConsent: false, caregiverConsent: false });
    assert.equal(intake.status, 200);
    const own = session(intake);
    assert.equal((await fetch(base + '/api/state', { headers: { cookie: own.cookie } })).status, 200);
    assert.equal((await post(base, '/api/actions', { type: 'confirm_route', payload: { episodeId: intake.body.result.episodeId, departmentId: 'general_medicine', referralNote: '' } }, own)).status, 403);
    for (let attempt = 0; attempt < 5; attempt++) assert.equal((await post(base, '/api/session/login', { password: '' })).status, 401);
    assert.equal((await post(base, '/api/session/login', { password: 'correct horse battery staple' })).status, 429);
  } finally { await close(); }
});
