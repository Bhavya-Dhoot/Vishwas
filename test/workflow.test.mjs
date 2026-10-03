import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../server.mjs';

async function start(dbPath) {
  const app = createApp({ dbPath, enableScheduler: false });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return {
    get: async () => {
      const response = await fetch(`${base}/api/state`);
      assert.equal(response.status, 200);
      return response.json();
    },
    action: async (type, payload = {}, expectedStatus = 200) => {
      const response = await fetch(`${base}/api/actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, payload }),
      });
      const body = await response.json();
      if (expectedStatus === 'error') {
        assert.ok([400, 404, 409].includes(response.status), `${type}: ${response.status} ${JSON.stringify(body)}`);
        assert.equal(typeof body.error, 'string');
      } else {
        assert.equal(response.status, expectedStatus, `${type}: ${JSON.stringify(body)}`);
      }
      return body;
    },
    postRaw: async (body, contentType) => fetch(`${base}/api/actions`, {
      method: 'POST', headers: { 'content-type': contentType }, body,
    }),
    close: app.close,
  };
}

async function isolated(run) {
  const dir = await mkdtemp(join(tmpdir(), 'vishwash-test-'));
  const dbPath = join(dir, 'demo.sqlite');
  try {
    await run(dbPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function dayAfter(date, days = 1) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function episode(state, id) {
  const found = state.episodes.find((item) => item.id === id);
  assert.ok(found, `missing episode ${id}`);
  return found;
}

function availableSlots(state) {
  return state.slots.filter((slot) => {
    const occupied = state.episodes.filter((item) => item.slotId === slot.id).length;
    return slot.date >= state.today && occupied < slot.capacity;
  });
}

function departmentOf(state, slot) {
  const specialist = state.specialists.find((item) => item.id === slot.specialistId);
  assert.ok(specialist);
  return specialist.departmentId;
}

function matchingPair(state) {
  const slots = availableSlots(state).sort((a, b) => a.date.localeCompare(b.date));
  for (const first of slots) {
    const second = slots.find((candidate) =>
      candidate.id !== first.id &&
      departmentOf(state, candidate) === departmentOf(state, first) &&
      candidate.date >= dayAfter(first.date, 3));
    if (second) return [first, second];
  }
  assert.fail('seed needs two available slots in one department at least three days apart');
}

async function intake(api, options = {}) {
  const created = await api.action('create_patient', {
    name: 'Demo Test Person', language: 'English', contactConsent: true,
    caregiverConsent: false, referralNote: 'Synthetic referral', ...options,
  });
  assert.ok(created.result?.patientId);
  assert.ok(created.result?.episodeId);
  return created.result;
}

test('intake to attested visit, separate overdue follow-up, barrier handling, verified return, and restart', async () => isolated(async (dbPath) => {
  let api = await start(dbPath);
  try {
    const initial = await api.get();
    const [firstSlot, laterSlot] = matchingPair(initial);
    const departmentId = departmentOf(initial, firstSlot);
    const wrongSlot = availableSlots(initial).find((slot) => departmentOf(initial, slot) !== departmentId);
    assert.ok(wrongSlot, 'seed needs an available slot in another department');

    const { patientId, episodeId } = await intake(api);
    await api.action('book', { episodeId, slotId: firstSlot.id }, 'error');
    await api.action('confirm_route', {
      episodeId, departmentId, confirmedBy: 'Demo staff', referralNote: 'Reviewed synthetic referral',
    });
    await api.action('book', { episodeId, slotId: wrongSlot.id }, 'error');
    await api.action('book', { episodeId, slotId: firstSlot.id, arbitrary: true }, 'error');
    let state = await api.get();
    const documentId = episode(state, episodeId).checklist[0].id;
    await api.action('checklist', { episodeId, documentId, ready: true });
    await api.action('book', { episodeId, slotId: firstSlot.id });
    assert.equal(episode(await api.get(), episodeId).status, 'booked');
    if (firstSlot.date > initial.today) {
      await api.action('check_in', { episodeId }, 'error');
    }
    await api.action('set_date', { date: firstSlot.date });
    await api.action('check_in', { episodeId });
    await api.action('complete_visit', { episodeId, confirmedBy: 'Demo clinician', evidence: '' }, 'error');
    const followUpDate = dayAfter(firstSlot.date);
    const completed = await api.action('complete_visit', {
      episodeId, confirmedBy: 'Demo clinician', evidence: 'Synthetic attendance register', followUpDate,
    });
    const followUpId = completed.result?.episodeId;
    assert.ok(followUpId && followUpId !== episodeId);
    state = await api.get();
    assert.equal(episode(state, episodeId).status, 'completed');
    assert.equal(episode(state, episodeId).attendanceConfirmedBy, 'Demo clinician');
    assert.equal(episode(state, followUpId).kind, 'follow_up');
    assert.equal(episode(state, followUpId).status, 'ready_to_book');
    assert.equal(episode(state, followUpId).originalDueDate, followUpDate);

    await api.action('set_date', { date: dayAfter(followUpDate) });
    await api.action('run_reminders');
    const reminderCount = (await api.get()).messages.filter((m) => m.episodeId === followUpId && m.kind === 'reminder').length;
    assert.ok(reminderCount > 0, 'overdue, consented follow-up should receive a simulated reminder');
    await api.action('run_reminders');
    assert.equal((await api.get()).messages.filter((m) => m.episodeId === followUpId && m.kind === 'reminder').length, reminderCount);

    await api.action('patient_reply', { episodeId: followUpId, barrier: 'travel', text: 'Demo travel conflict' });
    state = await api.get();
    const draft = state.messages.find((m) => m.episodeId === followUpId && m.direction === 'outbound' && m.status === 'draft');
    assert.ok(draft, 'logistics barrier should produce an approval draft');
    assert.equal(episode(state, followUpId).status, 'ready_to_book');
    await api.action('approve_message', { messageId: draft.id, approvedBy: 'Demo staff' });
    assert.equal(episode(await api.get(), followUpId).status, 'ready_to_book');
    await api.action('resolve_barrier', { episodeId: followUpId, resolvedBy: 'Demo staff', note: 'Transport arranged in demo' });
    assert.equal(episode(await api.get(), followUpId).needsHelp, false);
    await api.action('book', { episodeId: followUpId, slotId: laterSlot.id });
    state = await api.get();
    assert.equal(episode(state, followUpId).status, 'booked');
    assert.equal(episode(state, followUpId).originalDueDate, followUpDate);
    assert.equal(episode(state, followUpId).dueDate, followUpDate);
    assert.equal(state.patients.find((p) => p.id === patientId).contactConsent, true);
    await api.action('set_date', { date: laterSlot.date });
    await api.action('check_in', { episodeId: followUpId });
    await api.action('complete_visit', {
      episodeId: followUpId, confirmedBy: 'Demo clinician', evidence: 'Synthetic return attendance',
    });
    assert.equal(episode(await api.get(), followUpId).status, 'completed');
  } finally {
    await api.close();
  }
  api = await start(dbPath);
  try {
    const state = await api.get();
    const patient = state.patients.find((p) => p.name === 'Demo Test Person');
    assert.ok(patient, 'patient should survive server restart');
    const visits = state.episodes.filter((item) => item.patientId === patient.id);
    assert.equal(visits.length, 2);
    assert.equal(visits.find((item) => item.kind === 'initial').status, 'completed');
    assert.equal(visits.find((item) => item.kind === 'follow_up').status, 'completed');
  } finally {
    await api.close();
  }
}));

test('rescheduling keeps the first due date and does not imply attendance', async () => isolated(async (dbPath) => {
  const api = await start(dbPath);
  try {
    const state = await api.get();
    const [firstSlot, laterSlot] = matchingPair(state);
    const { episodeId } = await intake(api, { name: 'Demo Reschedule' });
    await api.action('confirm_route', {
      episodeId, departmentId: departmentOf(state, firstSlot),
      confirmedBy: 'Demo staff', referralNote: 'Synthetic referral',
    });
    await api.action('book', { episodeId, slotId: firstSlot.id });
    const original = episode(await api.get(), episodeId);
    assert.equal(original.originalDueDate, firstSlot.date);
    await api.action('book', { episodeId, slotId: laterSlot.id });
    const rescheduled = episode(await api.get(), episodeId);
    assert.equal(rescheduled.slotId, laterSlot.id);
    assert.equal(rescheduled.originalDueDate, original.originalDueDate);
    assert.equal(rescheduled.dueDate, original.dueDate);
    assert.equal(rescheduled.status, 'booked');
    assert.equal(rescheduled.completedAt, null);
  } finally {
    await api.close();
  }
}));

test('capacity, consent, medical barriers, and invalid transitions are enforced by HTTP API', async () => isolated(async (dbPath) => {
  const api = await start(dbPath);
  try {
    const seed = await api.get();
    const slot = availableSlots(seed).sort((a, b) => a.capacity - b.capacity)[0];
    assert.ok(slot);
    const departmentId = departmentOf(seed, slot);
    const first = await intake(api, { name: 'Demo Caregiver Case', caregiverConsent: true, caregiverName: 'Demo Helper' });
    await api.action('confirm_route', { episodeId: first.episodeId, departmentId, confirmedBy: 'Demo staff', referralNote: 'Synthetic referral' });
    await api.action('book', { episodeId: first.episodeId, slotId: slot.id });
    const occupied = (await api.get()).episodes.filter((item) => item.slotId === slot.id).length;
    for (let i = occupied; i < slot.capacity; i++) {
      const next = await intake(api, { name: `Demo Capacity ${i}` });
      await api.action('confirm_route', { episodeId: next.episodeId, departmentId, confirmedBy: 'Demo staff', referralNote: 'Synthetic referral' });
      await api.action('book', { episodeId: next.episodeId, slotId: slot.id });
    }
    const excess = await intake(api, { name: 'Demo Excess' });
    await api.action('confirm_route', { episodeId: excess.episodeId, departmentId, confirmedBy: 'Demo staff', referralNote: 'Synthetic referral' });
    await api.action('book', { episodeId: excess.episodeId, slotId: slot.id }, 'error');
    assert.equal(episode(await api.get(), excess.episodeId).status, 'ready_to_book');

    await api.action('set_date', { date: slot.date });
    await api.action('run_reminders');
    let state = await api.get();
    const reminders = state.messages.filter((m) => m.episodeId === first.episodeId && m.kind === 'reminder');
    assert.deepEqual(new Set(reminders.map((m) => m.recipient)), new Set(['patient', 'caregiver']));
    await api.action('run_reminders');
    assert.equal((await api.get()).messages.filter((m) => m.episodeId === first.episodeId && m.kind === 'reminder').length, reminders.length);

    await api.action('patient_reply', { episodeId: first.episodeId, barrier: 'cost', text: 'Demo cost question' });
    state = await api.get();
    const draft = state.messages.find((m) => m.episodeId === first.episodeId && m.direction === 'outbound' && m.status === 'draft');
    assert.ok(draft);
    await api.action('enhance_draft', { messageId: 'unknown' }, 'error');
    await api.action('enhance_draft', { messageId: draft.id });
    state = await api.get();
    assert.equal(state.messages.find((m) => m.id === draft.id).source, 'clinic_template');
    assert.equal(state.messages.find((m) => m.id === draft.id).status, 'draft');
    assert.equal(episode(state, first.episodeId).status, 'booked');
    await api.action('update_consent', { patientId: first.patientId, contactConsent: false, caregiverConsent: false });
    await api.action('enhance_draft', { messageId: draft.id }, 'error');
    await api.action('approve_message', { messageId: draft.id, approvedBy: 'Demo staff' }, 'error');
    await api.action('set_date', { date: dayAfter(slot.date) });
    await api.action('run_reminders');
    assert.equal((await api.get()).messages.filter((m) => m.episodeId === first.episodeId && m.kind === 'reminder').length, reminders.length);
    await api.action('update_consent', { patientId: first.patientId, contactConsent: true, caregiverConsent: false });
    await api.action('approve_message', { messageId: draft.id, approvedBy: 'Demo staff' });
    await api.action('enhance_draft', { messageId: draft.id }, 'error');
    const beforeMedical = (await api.get()).messages.filter((m) => m.episodeId === first.episodeId && m.direction === 'outbound' && m.status === 'draft').length;
    await api.action('patient_reply', { episodeId: first.episodeId, barrier: 'medical', text: 'Demo clinical question' });
    state = await api.get();
    assert.equal(state.messages.filter((m) => m.episodeId === first.episodeId && m.direction === 'outbound' && m.status === 'draft').length, beforeMedical);
    assert.equal(episode(state, first.episodeId).status, 'booked');

    await api.action('complete_visit', { episodeId: first.episodeId, confirmedBy: 'Demo staff', evidence: 'No check-in' }, 'error');
    await api.action('checklist', { episodeId: first.episodeId, documentId: 'unknown', ready: true }, 'error');
    await api.action('confirm_route', { episodeId: first.episodeId, departmentId, confirmedBy: 'Demo staff', referralNote: 'Reroute' }, 'error');
    await api.action('not_an_action', {}, 'error');
    await api.action('create_patient', {
      name: 'Demo Invalid', language: 'English', contactConsent: 'yes', caregiverConsent: false,
    }, 'error');
    await api.action('create_patient', {
      name: 'Demo Invalid', language: 'English', contactConsent: true, caregiverConsent: true,
    }, 'error');
    await api.action('set_date', { date: '2026-02-30' }, 'error');
    const wrongContent = await api.postRaw('{}', 'text/plain');
    assert.equal(wrongContent.status, 400);
  } finally {
    await api.close();
  }
}));
