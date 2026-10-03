import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
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
    const attempts = await Promise.allSettled([
      hospital.connector.reserve({ idempotencyKey: 'opaque_2', slotId }),
      hospital.connector.reserve({ idempotencyKey: 'opaque_3', slotId }),
    ]);
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(attempts.find(result => result.status === 'rejected').reason.status, 409);
    await assert.rejects(hospital.connector.reserve({ idempotencyKey: 'opaque_1', slotId: imported.slots[1].id }), { status: 409 });
    assert.deepEqual(await hospital.connector.cancel(first.id), { id: first.id, status: 'cancelled' });
    assert.deepEqual(await hospital.connector.cancel(first.id), { id: first.id, status: 'cancelled' });
    assert.deepEqual(await hospital.connector.reserve({ idempotencyKey: 'opaque_1', slotId }), first);
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
    const retry = await hospital.connector.reserve({ idempotencyKey: key, slotId: preview.result.slotId });
    assert.equal(retry.id, reservation.id);
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
