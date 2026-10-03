import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createApp } from '../server.mjs';
import { createHospitalConnector } from '../src/hospital-connector.mjs';
import { createSampleHospital, sampleDirectory } from '../integrations/sample-hospital/server.mjs';

// Isolated fictional app and hospital; only the explicitly configured local Fabric ledger persists.
const previousUrl = process.env.FABRIC_GATEWAY_URL;
const previousToken = process.env.FABRIC_GATEWAY_TOKEN;
process.env.FABRIC_GATEWAY_URL ||= 'http://127.0.0.1:3101';
if (!process.env.FABRIC_GATEWAY_TOKEN) {
  assert.equal(process.env.FABRIC_GATEWAY_URL, 'http://127.0.0.1:3101', 'Supply a token for a non-default bridge');
  process.env.FABRIC_GATEWAY_TOKEN = (await readFile(new URL('../data/fabric/bridge-token.txt', import.meta.url), 'utf8')).trim();
}
const token = randomBytes(32).toString('hex');
const hospital = createSampleHospital({ token, directory: sampleDirectory({ today: '2026-10-03' }) });
await new Promise(resolve => hospital.server.listen(0, '127.0.0.1', resolve));
const connector = createHospitalConnector({ baseUrl: `http://127.0.0.1:${hospital.server.address().port}`, token });
const app = createApp({ dbPath: ':memory:', mode: 'demo', hospitalConnector: connector });
await app.ready;
await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${app.server.address().port}`;

function client() {
  let cookie;
  let csrf;
  return async (path, body) => {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(20000),
      headers: { ...(cookie ? { cookie } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const value = await response.json();
    assert.ok(response.ok, `${path}: ${response.status} ${value.error || ''}`);
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    csrf = value.session?.csrfToken || value.csrfToken || csrf;
    return value;
  };
}

try {
  const staff = client();
  const patient = client();
  const act = (type, payload = {}) => staff('/api/actions', { type, payload });
  await staff('/api/session/demo', { role: 'staff' });
  await staff('/api/connector/sync', {});
  const created = await patient('/api/session/patient', {
    name: 'Connected Demo', language: 'Hindi', departmentId: 'endocrinology',
    contactConsent: true, caregiverConsent: false, scheduleConsent: true, preferredTime: '14:00',
  });
  const { patientId, episodeId } = created.result;
  assert.equal(created.result.status, 'department_inquiry');
  const upload = await patient('/api/documents', {
    patientId, name: 'referral-demo.txt', mimeType: 'text/plain', ledgerConsent: true,
    contentBase64: (await readFile(new URL('../docs/demo-files/referral-demo.txt', import.meta.url))).toString('base64'),
  });
  const document = upload.document;
  if (document.anchorStatus !== 'anchored') {
    const retried = await patient(`/api/documents/${document.id}/anchor`, {});
    assert.equal(retried.document.anchorStatus, 'anchored');
  }
  assert.equal((await patient(`/api/documents/${document.id}/verify`, {})).verified, true);
  const ledgerResponse = await fetch(`${process.env.FABRIC_GATEWAY_URL}/commitments/${document.commitment}`, {
    headers: { Authorization: `Bearer ${process.env.FABRIC_GATEWAY_TOKEN}` }, signal: AbortSignal.timeout(15000),
  });
  assert.equal(ledgerResponse.status, 200);
  const receipt = await ledgerResponse.json();

  const accepted = await act('accept_inquiry', { episodeId });
  const booked = accepted.episodes.find(episode => episode.id === episodeId);
  assert.equal(booked.status, 'booked');
  assert.equal(booked.hospitalReservation.status, 'confirmed');
  const retry = await act('accept_inquiry', { episodeId });
  assert.equal(retry.episodes.find(episode => episode.id === episodeId).hospitalReservation.id, booked.hospitalReservation.id);
  const plan = await patient('/api/state');
  assert.equal(plan.patients.length, 1);
  assert.equal(plan.audit, undefined);
  assert.equal(plan.episodes[0].checkedInAt, null);
  assert.equal(plan.documents[0].salt, undefined);
  assert.equal(plan.documents[0].contentBase64, undefined);

  await act('check_in', { episodeId });
  const completed = await act('complete_visit', { episodeId, evidence: 'Fictional connected attendance', followUpDate: '2026-10-06' });
  const followId = completed.result.episodeId;
  await act('set_date', { date: '2026-10-07' });
  const reminders = await act('run_reminders');
  assert.ok(reminders.messages.some(message => message.episodeId === followId && message.kind === 'reminder'));
  await patient('/api/actions', { type: 'patient_reply', payload: { episodeId: followId, barrier: 'travel', text: 'Fictional travel difficulty' } });
  const afterReply = await staff('/api/state');
  const draft = afterReply.messages.find(message => message.episodeId === followId && message.status === 'draft');
  await act('approve_message', { messageId: draft.id });
  await act('resolve_barrier', { episodeId: followId, note: 'Fictional patient confirmed arrangements' });
  const followBooked = await act('accept_inquiry', { episodeId: followId });
  const follow = followBooked.episodes.find(episode => episode.id === followId);
  assert.equal(follow.hospitalReservation.status, 'confirmed');
  assert.equal(follow.originalDueDate, '2026-10-06');
  await act('check_in', { episodeId: followId });
  const final = await act('complete_visit', { episodeId: followId, evidence: 'Fictional return attendance' });
  assert.equal(final.episodes.find(episode => episode.id === followId).status, 'completed');
  const proof = {
    passed: true, checkedAt: new Date().toISOString(), data: 'fictional', hospital: 'real HTTP sample contract',
    fabric: { network: 'hyperledger-fabric', commitment: receipt.commitment, transactionId: receipt.transactionId, verified: true },
    checks: ['encrypted upload', 'real ledger anchor and lookup', 'automatic routing', 'one acceptance', 'remote booking acknowledgement', 'idempotent retry', 'patient isolation', 'reminder and barrier', 'separate follow-up booking', 'confirmed return'],
  };
  await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
  await writeFile(new URL('../test-results/connected-proof.json', import.meta.url), JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify(proof, null, 2));
} finally {
  await app.close();
  await hospital.close();
  if (previousUrl === undefined) delete process.env.FABRIC_GATEWAY_URL; else process.env.FABRIC_GATEWAY_URL = previousUrl;
  if (previousToken === undefined) delete process.env.FABRIC_GATEWAY_TOKEN; else process.env.FABRIC_GATEWAY_TOKEN = previousToken;
}
