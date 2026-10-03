import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createApp } from '../server.mjs';
import { HospitalConnectorError } from '../src/hospital-connector.mjs';

test('connected acceptance waits for remote capacity and remains idempotent; reset cannot orphan reservations', async () => {
  let reservations = 0;
  let available = false;
  let directory;
  const remote = new Map();
  const hospitalConnector = {
    configured: true,
    health: async () => ({ configured: true, reachable: true, kind: 'sample-contract' }),
    directory: async () => directory,
    reserve: async ({ slotId, idempotencyKey }) => {
      reservations++;
      if (remote.get(idempotencyKey)?.status === 'cancelled') throw new HospitalConnectorError(409, 'Cancelled key');
      if (!available) throw new HospitalConnectorError(409, 'No hospital capacity');
      const result = { id: 'synthetic_reservation', slotId, idempotencyKey, status: 'confirmed' };
      remote.set(idempotencyKey, result);
      return result;
    },
    lookup: async key => remote.get(key) ?? null,
    cancelByKey: async key => {
      const existing = remote.get(key);
      remote.set(key, { id: existing?.id ?? 'synthetic_cancelled', slotId: existing?.slotId ?? '', idempotencyKey: key, status: 'cancelled' });
      return { id: remote.get(key).id, idempotencyKey: key, status: 'cancelled' };
    },
    cancel: async () => { throw new Error('Unexpected cancellation'); },
  };
  const app = createApp({ dbPath: ':memory:', hospitalConnector });
  await app.ready;
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    directory = await (await fetch(base + '/api/directory')).json();
    assert.deepEqual(Object.keys(directory).sort(), ['departments', 'slots', 'specialists']);
    assert.equal((await fetch(base + '/api/connector/status')).status, 401);
    const patient = await post('/api/session/patient', { name: 'Synthetic Connector Test', language: 'English', contactConsent: false, caregiverConsent: false, departmentId: 'neurology', scheduleConsent: true });
    const patientBody = await patient.json();
    const patientHeaders = { cookie: patient.headers.get('set-cookie').split(';')[0], 'x-csrf-token': patientBody.session.csrfToken };
    assert.equal((await post('/api/connector/sync', {}, patientHeaders)).status, 403);
    const staff = await post('/api/session/demo', { role: 'staff' });
    const staffBody = await staff.json();
    const headers = { cookie: staff.headers.get('set-cookie').split(';')[0], 'x-csrf-token': staffBody.csrfToken };
    assert.equal((await post('/api/connector/sync', {}, headers)).status, 200);
    const acceptance = { type: 'accept_inquiry', payload: { episodeId: patientBody.result.episodeId } };
    assert.equal((await post('/api/actions', acceptance, headers)).status, 409);
    let state = await (await fetch(base + '/api/state', { headers })).json();
    assert.notEqual(state.episodes.find(e => e.id === patientBody.result.episodeId).status, 'booked');
    available = true;
    const results = await Promise.all([post('/api/actions', acceptance, headers), post('/api/actions', acceptance, headers)]);
    assert.deepEqual(results.map(r => r.status), [200, 200]);
    assert.equal(reservations, 2);
    state = await results[1].json();
    assert.equal(state.result.status, 'booked');
    assert.equal((await post('/api/actions', { type: 'book', payload: {} }, headers)).status, 409);
    assert.equal((await post('/api/actions', { type: 'reset_demo', payload: {} }, headers)).status, 409);
    hospitalConnector.configured = false;
    assert.equal((await post('/api/actions', { type: 'reset_demo', payload: {} }, headers)).status, 409);
    assert.equal((await post('/api/actions', acceptance, headers)).status, 503);
  } finally { await app.close(); }
});
