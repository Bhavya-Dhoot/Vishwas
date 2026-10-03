import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createWorkflow } from '../src/workflow.mjs';
import { seal, unseal } from '../src/security.mjs';

const key = Buffer.alloc(32, 7);

function draft(workflow, barrier = 'travel') {
  workflow.act('patient_reply', { episodeId: 'episode_booked', barrier });
  return workflow.getState().messages.find(message => message.status === 'draft' && message.barrier === barrier);
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('enhancement uses the draft barrier even after a later patient reply', async () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const travel = draft(workflow);
    draft(workflow, 'cost');
    let input;
    await workflow.enhanceDraft(travel.id, async value => {
      input = value;
      return { text: 'Travel help', source: 'clinic_template' };
    });
    assert.deepEqual(input, { barrier: 'travel', language: 'English' });
    assert.equal(workflow.getState().messages.find(message => message.id === travel.id).text, 'Travel help');
    assert.equal(workflow.getState().episodes.find(episode => episode.id === 'episode_booked').barrier, 'cost');
  } finally { workflow.close(); }
});

test('enhancement rechecks consent and retains changes made while the generator waits', async () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const travel = draft(workflow);
    const waiting = deferred();
    const pending = workflow.enhanceDraft(travel.id, async () => waiting.promise);
    workflow.act('update_consent', { patientId: 'patient_booked', contactConsent: false, caregiverConsent: false });
    waiting.resolve({ text: 'Travel help', source: 'clinic_template' });
    await assert.rejects(pending, error => error.status === 409 && /consent/.test(error.message));
    const state = workflow.getState();
    assert.equal(state.patients.find(patient => patient.id === 'patient_booked').contactConsent, false);
    assert.equal(state.messages.find(message => message.id === travel.id).text, travel.text);
  } finally { workflow.close(); }
});

test('approved drafts and newer enhancements cannot be overwritten by a pending enhancement', async () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const travel = draft(workflow);
    const waiting = deferred();
    const pending = workflow.enhanceDraft(travel.id, async () => waiting.promise);
    workflow.act('approve_message', { messageId: travel.id });
    waiting.resolve({ text: 'Stale reply', source: 'clinic_template' });
    await assert.rejects(pending, error => error.status === 409);
    assert.equal(workflow.getState().messages.find(message => message.id === travel.id).status, 'simulated');

    const cost = draft(workflow, 'cost');
    const first = deferred();
    const older = workflow.enhanceDraft(cost.id, async () => first.promise);
    await workflow.enhanceDraft(cost.id, async () => ({ text: 'Newer reply', source: 'clinic_template' }));
    first.resolve({ text: 'Older reply', source: 'clinic_template' });
    await assert.rejects(older, error => error.status === 409 && /changed/.test(error.message));
    assert.equal(workflow.getState().messages.find(message => message.id === cost.id).text, 'Newer reply');
  } finally { workflow.close(); }
});

test('legacy drafts without a barrier fail safely', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vishwash-draft-'));
  const path = join(directory, 'demo.sqlite');
  try {
    const workflow = createWorkflow(path, { key });
    const travel = draft(workflow);
    workflow.close();
    const db = new DatabaseSync(path);
    try {
      const state = unseal(db.prepare('SELECT json FROM app_state WHERE id = 1').get().json, key, 'app-state:1');
      delete state.messages.find(message => message.id === travel.id).barrier;
      db.prepare('UPDATE app_state SET json = ? WHERE id = 1').run(seal(state, key, 'app-state:1'));
    } finally { db.close(); }
    const restored = createWorkflow(path, { key });
    try {
      await assert.rejects(restored.enhanceDraft(travel.id, async () => ({ text: 'Wrong', source: 'clinic_template' })), error => error.status === 409);
      assert.equal(restored.getState().messages.find(message => message.id === travel.id).text, travel.text);
    } finally { restored.close(); }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
