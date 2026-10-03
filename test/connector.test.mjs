import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createHospitalConnector, HospitalConnectorError, validateDirectory } from '../src/hospital-connector.mjs';
import { createSampleHospital, sampleDirectory } from '../integrations/sample-hospital/server.mjs';
import { createWorkflow } from '../src/workflow.mjs';
import { createApp } from '../server.mjs';

const token = randomBytes(32).toString('hex');
const day = '2026-10-03';
const directory = () => sampleDirectory({ today: day, days: 21 });

async function start(options = {}) {
  const instance = createSampleHospital({ token, directory: directory(), ...options });
  instance.server.listen(0, '127.0.0.1');
  await once(instance.server, 'listening');
  const baseUrl = `http://127.0.0.1:${instance.server.address().port}`;
  return { ...instance, baseUrl, connector: createHospitalConnector({ baseUrl, token }) };
}

test('sample hospital authenticates, validates its directory and reserves capacity idempotently over HTTP', async () => {
  const hospital = await start();
  try {
    assert.equal((await fetch(hospital.baseUrl + '/directory')).status, 401);
    assert.deepEqual(await hospital.connector.health(), { configured: true, reachable: true, kind: 'sample-contract' });
    const imported = await hospital.connector.directory();
    assert.equal(imported.specialists.length, 6);
    assert.equal(imported.slots.length, 252);
    const slotId = imported.slots[0].id;
    const first = await hospital.connector.reserve({ idempotencyKey: 'opaque_1', slotId });
    assert.deepEqual(await hospital.connector.reserve({ idempotencyKey: 'opaque_1', slotId }), first);
    assert.deepEqual(await hospital.connector.lookup('opaque_1'), first);
    assert.equal(await hospital.connector.lookup('missing_key'), null);
    const attempts = await Promise.allSettled([
      hospital.connector.reserve({ idempotencyKey: 'opaque_2', slotId }),
      hospital.connector.reserve({ idempotencyKey: 'opaque_3', slotId }),
    ]);
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(attempts.find(result => result.status === 'rejected').reason.status, 409);
    await assert.rejects(hospital.connector.reserve({ idempotencyKey: 'opaque_1', slotId: imported.slots[1].id }), { status: 409 });
    assert.deepEqual(await hospital.connector.cancel(first.id), { id: first.id, status: 'cancelled' });
    assert.deepEqual(await hospital.connector.cancel(first.id), { id: first.id, status: 'cancelled' });
    assert.equal((await hospital.connector.lookup('opaque_1')).status, 'cancelled');
    await assert.rejects(hospital.connector.reserve({ idempotencyKey: 'opaque_1', slotId }), { status: 409 });
    assert.equal((await hospital.connector.cancelByKey('opaque_never_sent')).status, 'cancelled');
    await assert.rejects(hospital.connector.reserve({ idempotencyKey: 'opaque_never_sent', slotId }), { status: 409 });
    const unknownField = await fetch(hospital.baseUrl + '/bookings', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ idempotencyKey: 'opaque_4', slotId, patientName: 'must not cross this API' }) });
    assert.equal(unknownField.status, 400);
  } finally { await hospital.close(); }
});

test('reservations and idempotency survive a sample hospital restart', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'vishwas-hospital-'));
  const dbPath = join(folder, 'hospital.sqlite');
  let hospital;
  try {
    hospital = await start({ dbPath });
    const slotId = directory().slots[0].id;
    const before = await hospital.connector.reserve({ idempotencyKey: 'persisted_1', slotId });
    await hospital.close();
    hospital = await start({ dbPath });
    assert.deepEqual(await hospital.connector.reserve({ idempotencyKey: 'persisted_1', slotId }), before);
  } finally { await hospital?.close(); await rm(folder, { recursive: true, force: true }); }
});

test('workflow only commits after a hospital acknowledgment; conflicts can release the reservation', async () => {
  const hospital = await start();
  const workflow = createWorkflow(':memory:', { key: randomBytes(32) });
  try {
    workflow.act('import_directory', await hospital.connector.directory());
    const patient = workflow.act('create_patient', { name: 'Connector Demo', language: 'Hindi', contactConsent: true, caregiverConsent: false, departmentId: 'endocrinology', scheduleConsent: true });
    const episodeId = patient.result.episodeId;
    let preview = workflow.previewAcceptance({ episodeId }, 'Demo staff');
    assert.equal(workflow.getState().episodes.find(value => value.id === episodeId).status, 'department_inquiry');
    const key = `${episodeId}:${preview.result.slotId}`;
    const reservation = await hospital.connector.reserve({ idempotencyKey: key, slotId: preview.result.slotId });
    workflow.act('set_date', { date: day });
    assert.throws(() => workflow.commitAcceptance(preview), { status: 409 });
    await hospital.connector.cancel(reservation.id);
    assert.equal(workflow.getState().episodes.find(value => value.id === episodeId).status, 'department_inquiry');
    preview = workflow.previewAcceptance({ episodeId }, 'Demo staff');
    const retry = await hospital.connector.reserve({ idempotencyKey: `${key}:retry`, slotId: preview.result.slotId });
    assert.notEqual(retry.id, reservation.id);
    assert.equal(workflow.commitAcceptance(preview).result.status, 'booked');

    const second = workflow.act('create_patient', { name: 'Outage Demo', language: 'English', contactConsent: true, caregiverConsent: false, departmentId: 'neurology', scheduleConsent: true });
    const pending = workflow.previewAcceptance({ episodeId: second.result.episodeId }, 'Demo staff');
    await hospital.close();
    await assert.rejects(hospital.connector.reserve({ idempotencyKey: second.result.episodeId, slotId: pending.result.slotId }), { status: 503 });
    assert.equal(workflow.getState().episodes.find(value => value.id === second.result.episodeId).status, 'department_inquiry');
  } finally { if (hospital.server.listening) await hospital.close(); workflow.close(); }
});

test('connector refuses malformed remote data, redirects, unsafe transport and leaks no credentials', async () => {
  assert.throws(() => createHospitalConnector({ baseUrl: 'http://hospital.example', token }), /HTTPS/);
  assert.throws(() => createHospitalConnector({ baseUrl: 'https://user:password@example.com', token }), /embedded credentials/);
  assert.throws(() => createHospitalConnector({ baseUrl: 'http://127.0.0.1:4100', token: 'too-short' }), /TOKEN/);
  const badDirectory = directory();
  badDirectory.slots[0].specialistId = 'unknown';
  assert.throws(() => validateDirectory(badDirectory), HospitalConnectorError);
  badDirectory.slots[0].specialistId = badDirectory.specialists[0].id;
  badDirectory.slots[0].date = '2026-02-30';
  assert.throws(() => validateDirectory(badDirectory), HospitalConnectorError);
  let mode = 'malformed';
  const remote = createServer((request, response) => {
    if (mode === 'redirect') { response.writeHead(302, { location: 'https://example.com' }); response.end(); return; }
    if (mode === 'timeout') return;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ departments: [] }));
  });
  remote.listen(0, '127.0.0.1');
  await once(remote, 'listening');
  try {
    const connector = createHospitalConnector({ baseUrl: `http://127.0.0.1:${remote.address().port}`, token, timeoutMs: 100 });
    await assert.rejects(connector.directory(), { status: 502 });
    mode = 'redirect';
    await assert.rejects(connector.directory(), error => error.status === 503 && !error.message.includes(token) && !error.message.includes('example.com'));
    mode = 'timeout';
    await assert.rejects(connector.directory(), { status: 504 });
  } finally { remote.closeAllConnections(); await new Promise(resolve => remote.close(resolve)); }
});

test('staff API sync and one acceptance reach the sample hospital; duplicate clicks and outages stay safe', async () => {
  const hospital = await start();
  const app = createApp({ mode: 'demo', dbPath: ':memory:', key: randomBytes(32).toString('hex'), hospitalConnector: hospital.connector });
  await app.ready;
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  let auth = {};
  const post = async (path, body) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...auth }, body: JSON.stringify(body) });
    return { response, body: await response.json() };
  };
  const action = (type, payload) => post('/api/actions', { type, payload });
  try {
    const login = await post('/api/session/demo', { role: 'staff' });
    auth = { cookie: login.response.headers.get('set-cookie').split(';')[0], 'x-csrf-token': login.body.csrfToken };
    const sync = await post('/api/connector/sync', {});
    assert.equal(sync.response.status, 200);
    const intake = await action('create_patient', { name: 'HTTP Demo', language: 'Hindi', contactConsent: true, caregiverConsent: false, departmentId: 'endocrinology', scheduleConsent: true });
    assert.equal(intake.response.status, 200);
    const episodeId = intake.body.result.episodeId;
    const [first, repeat] = await Promise.all([action('accept_inquiry', { episodeId }), action('accept_inquiry', { episodeId })]);
    assert.equal(first.response.status, 200);
    assert.equal(repeat.response.status, 200);
    assert.equal(first.body.result.status, 'booked');
    assert.equal(repeat.body.result.slotId, first.body.result.slotId);
    const slotId = first.body.result.slotId;
    await hospital.connector.reserve({ idempotencyKey: 'other_system_booking', slotId });
    await assert.rejects(hospital.connector.reserve({ idempotencyKey: 'over_capacity', slotId }), { status: 409 });

    const next = await action('create_patient', { name: 'Offline HTTP Demo', language: 'Hindi', contactConsent: true, caregiverConsent: false, departmentId: 'neurology', scheduleConsent: true });
    await hospital.close();
    const offline = await action('accept_inquiry', { episodeId: next.body.result.episodeId });
    assert.equal(offline.response.status, 503);
    const state = await (await fetch(base + '/api/state', { headers: auth })).json();
    assert.equal(state.episodes.find(value => value.id === next.body.result.episodeId).status, 'department_inquiry');
  } finally { await app.close(); if (hospital.server.listening) await hospital.close(); }
});

async function openDemo(dbPath, key, hospitalConnector) {
  const app = createApp({ mode: 'demo', dbPath, key, hospitalConnector });
  await app.ready;
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const login = await fetch(base + '/api/session/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'staff' }) });
  const session = await login.json();
  const headers = { 'content-type': 'application/json', cookie: login.headers.get('set-cookie').split(';')[0], 'x-csrf-token': session.csrfToken };
  const post = async (path, body) => fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });
  const action = (type, payload) => post('/api/actions', { type, payload });
  const state = async () => (await fetch(base + '/api/state', { headers })).json();
  const status = async () => (await fetch(base + '/api/connector/status', { headers })).json();
  return { app, base, action, post, state, status };
}

test('startup replays an encrypted intent after remote confirmation but lost acknowledgment', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'vishwas-booking-recovery-'));
  const dbPath = join(folder, 'app.sqlite');
  const key = randomBytes(32).toString('hex');
  let hospital;
  let app;
  try {
    hospital = await start({ dbPath: join(folder, 'hospital.sqlite') });
    let lost;
    const dropped = { ...hospital.connector, reserve: async args => {
      const result = await hospital.connector.reserve(args);
      lost = result;
      throw new HospitalConnectorError(504, 'Hospital acknowledgment was lost');
    } };
    let demo = await openDemo(dbPath, key, dropped);
    app = demo.app;
    assert.equal((await demo.post('/api/connector/sync', {})).status, 200);
    const intake = await (await demo.action('create_patient', { name: 'Recovery Demo', language: 'Hindi', contactConsent: true, caregiverConsent: false, departmentId: 'endocrinology', scheduleConsent: true })).json();
    const episodeId = intake.result.episodeId;
    assert.equal((await demo.action('accept_inquiry', { episodeId })).status, 504);
    assert.equal((await demo.status()).pendingBookings, 1);
    assert.equal((await demo.state()).episodes.find(value => value.id === episodeId).status, 'department_inquiry');
    const inspect = new DatabaseSync(dbPath);
    const intent = inspect.prepare('SELECT id, json FROM booking_intents').get();
    inspect.close();
    assert.notEqual(intent.id, episodeId);
    assert.equal(JSON.parse(intent.json).v, 2);
    assert.ok(!intent.json.includes(episodeId) && !intent.json.includes(lost.idempotencyKey));
    await app.close(); app = null;
    const offlineConnector = hospital.connector;
    await hospital.close(); hospital = null;

    demo = await openDemo(dbPath, key, offlineConnector);
    app = demo.app;
    await app.recoverBookings();
    assert.equal((await demo.status()).pendingBookings, 1);
    assert.equal((await demo.state()).episodes.find(value => value.id === episodeId).status, 'department_inquiry');
    await app.close(); app = null;
    hospital = await start({ dbPath: join(folder, 'hospital.sqlite') });

    demo = await openDemo(dbPath, key, hospital.connector);
    app = demo.app;
    await app.recoverBookings();
    const recovered = await demo.state();
    const episode = recovered.episodes.find(value => value.id === episodeId);
    assert.equal(episode.status, 'booked');
    assert.equal(episode.hospitalReservation.id, lost.id);
    assert.deepEqual(await hospital.connector.lookup(lost.idempotencyKey), lost);
    assert.equal((await demo.status()).pendingBookings, 0);
    assert.ok(recovered.audit.some(entry => entry.episodeId === episodeId && entry.action === 'accept_inquiry' && entry.actor === 'Demo staff'));
    assert.ok(recovered.audit.some(entry => entry.episodeId === episodeId && entry.action === 'reconcile_booking' && entry.actor === 'System reconciliation'));
  } finally { await app?.close(); await hospital?.close(); await rm(folder, { recursive: true, force: true }); }
});

test('changed slot retires an uncertain remote booking before a fresh booking can proceed', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'vishwas-booking-change-'));
  const dbPath = join(folder, 'app.sqlite');
  const key = randomBytes(32).toString('hex');
  let hospital;
  let app;
  try {
    hospital = await start({ dbPath: join(folder, 'hospital.sqlite') });
    let lost;
    const dropped = { ...hospital.connector, reserve: async args => {
      lost = await hospital.connector.reserve(args);
      throw new HospitalConnectorError(504, 'Hospital acknowledgment was lost');
    } };
    let demo = await openDemo(dbPath, key, dropped);
    app = demo.app;
    await demo.post('/api/connector/sync', {});
    const intake = await (await demo.action('create_patient', { name: 'Changed Slot Demo', language: 'English', contactConsent: true, caregiverConsent: false, departmentId: 'neurology', scheduleConsent: true })).json();
    const episodeId = intake.result.episodeId;
    assert.equal((await demo.action('accept_inquiry', { episodeId })).status, 504);
    assert.equal((await demo.action('set_date', { date: '2026-10-04' })).status, 200);
    await app.close(); app = null;
    await hospital.close(); hospital = await start({ dbPath: join(folder, 'hospital.sqlite') });

    demo = await openDemo(dbPath, key, hospital.connector);
    app = demo.app;
    await app.recoverBookings();
    assert.equal((await demo.status()).pendingBookings, 0);
    assert.equal((await hospital.connector.lookup(lost.idempotencyKey)).status, 'cancelled');
    assert.equal((await demo.state()).episodes.find(value => value.id === episodeId).status, 'department_inquiry');
    const accepted = await demo.action('accept_inquiry', { episodeId });
    assert.equal(accepted.status, 200);
    const booked = (await accepted.json()).episodes.find(value => value.id === episodeId);
    assert.equal(booked.status, 'booked');
    assert.notEqual(booked.slotId, lost.slotId);
    await assert.rejects(hospital.connector.reserve({ idempotencyKey: lost.idempotencyKey, slotId: lost.slotId }), { status: 409 });
  } finally { await app?.close(); await hospital?.close(); await rm(folder, { recursive: true, force: true }); }
});

test('withdrawn scheduling consent cancels an uncertain booking and leaves staff scheduling visible', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'vishwas-booking-consent-'));
  const dbPath = join(folder, 'app.sqlite');
  const key = randomBytes(32).toString('hex');
  let hospital;
  let app;
  try {
    hospital = await start({ dbPath: join(folder, 'hospital.sqlite') });
    let lost;
    const dropped = { ...hospital.connector, reserve: async args => {
      lost = await hospital.connector.reserve(args);
      throw new HospitalConnectorError(504, 'Hospital acknowledgment was lost');
    } };
    let demo = await openDemo(dbPath, key, dropped);
    app = demo.app;
    await demo.post('/api/connector/sync', {});
    const patient = await fetch(demo.base + '/api/session/patient', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Consent Recovery Demo', language: 'English', contactConsent: true, caregiverConsent: false, departmentId: 'neurology', scheduleConsent: true }),
    });
    const intake = await patient.json();
    const episodeId = intake.result.episodeId;
    assert.equal((await demo.action('accept_inquiry', { episodeId })).status, 504);
    const otherPatient = await fetch(demo.base + '/api/session/patient', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Other Consent Demo', language: 'English', contactConsent: false, caregiverConsent: false, departmentId: 'neurology', scheduleConsent: false }),
    });
    const otherEpisodeId = (await otherPatient.json()).result.episodeId;
    const patientHeaders = { 'content-type': 'application/json', cookie: patient.headers.get('set-cookie').split(';')[0], 'x-csrf-token': intake.session.csrfToken };
    assert.equal((await fetch(demo.base + '/api/actions', {
      method: 'POST', headers: patientHeaders,
      body: JSON.stringify({ type: 'set_scheduling_consent', payload: { episodeId: otherEpisodeId, scheduleConsent: true } }),
    })).status, 404);
    const patientAction = await fetch(demo.base + '/api/actions', {
      method: 'POST', headers: patientHeaders,
      body: JSON.stringify({ type: 'set_scheduling_consent', payload: { episodeId, scheduleConsent: false } }),
    });
    assert.equal(patientAction.status, 200);
    await app.close(); app = null;
    await hospital.close(); hospital = await start({ dbPath: join(folder, 'hospital.sqlite') });

    demo = await openDemo(dbPath, key, hospital.connector);
    app = demo.app;
    await app.recoverBookings();
    const state = await demo.state();
    const episode = state.episodes.find(value => value.id === episodeId);
    assert.equal(episode.status, 'awaiting_staff_scheduling');
    assert.equal(episode.scheduleConsent, false);
    assert.equal((await hospital.connector.lookup(lost.idempotencyKey)).status, 'cancelled');
    assert.equal((await demo.status()).pendingBookings, 0);
    assert.ok(state.audit.some(entry => entry.episodeId === episodeId && entry.action === 'reconcile_booking'));
  } finally { await app?.close(); await hospital?.close(); await rm(folder, { recursive: true, force: true }); }
});
