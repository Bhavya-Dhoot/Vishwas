import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createWorkflow, seedState, WorkflowError } from '../src/workflow.mjs';
import { seal } from '../src/security.mjs';

const key = Buffer.alloc(32, 7);
const intake = (workflow, extra = {}) => workflow.act('create_patient', {
  name: 'Synthetic Patient', language: 'Hindi', contactConsent: true, caregiverConsent: false,
  referralNote: 'Neurology and diabetes mentioned in free text; do not infer', scheduleConsent: true, ...extra,
}).result;
const item = (workflow, id) => workflow.getState().episodes.find(e => e.id === id);

test('scheduling consent can be withdrawn and regranted without cancelling a confirmed appointment', () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const created = intake(workflow, { departmentId: 'general_medicine', scheduleConsent: false });
    assert.equal(workflow.act('accept_inquiry', { episodeId: created.episodeId }).result.status, 'awaiting_staff_scheduling');
    workflow.act('set_scheduling_consent', { episodeId: created.episodeId, scheduleConsent: true }, 'Patient');
    const booked = workflow.act('accept_inquiry', { episodeId: created.episodeId }).result;
    assert.equal(booked.status, 'booked');
    workflow.act('set_scheduling_consent', { episodeId: created.episodeId, scheduleConsent: false }, 'Patient');
    assert.equal(item(workflow, created.episodeId).slotId, booked.slotId);
    assert.equal(item(workflow, created.episodeId).scheduleConsent, false);
    const waiting = intake(workflow, { departmentId: 'general_medicine', preferredTime: '23:00' });
    workflow.act('accept_inquiry', { episodeId: waiting.episodeId });
    workflow.act('set_scheduling_consent', { episodeId: waiting.episodeId, scheduleConsent: false }, 'Patient');
    assert.equal(workflow.act('accept_inquiry', { episodeId: waiting.episodeId }).result.status, 'awaiting_staff_scheduling');
  } finally { workflow.close(); }
});

test('only an explicit department ID or exact department label routes an inquiry', () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const unknown = intake(workflow);
    assert.equal(unknown.status, 'coordination_inquiry');
    assert.equal(unknown.departmentId, null);
    assert.equal(unknown.routingBasis, 'unresolved');
    assert.equal(intake(workflow, { referralDepartmentLabel: 'Neuro' }).status, 'coordination_inquiry');
    assert.equal(intake(workflow, { departmentId: 'neurology' }).departmentId, 'neurology');
    const exact = intake(workflow, { referralDepartmentLabel: '  GENERAL   MEDICINE ' });
    assert.equal(exact.departmentId, 'general_medicine');
    assert.equal(exact.routingBasis, 'exact_department_label');
    assert.equal(intake(workflow, { departmentId: 'unknown', referralDepartmentLabel: 'Neurology' }).status, 'coordination_inquiry');
  } finally { workflow.close(); }
});

test('one acceptance chooses a language-compatible earliest slot and is idempotent', () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const created = intake(workflow, { departmentId: 'general_medicine', preferredDate: '2026-10-04', preferredTime: '10:00' });
    const accepted = workflow.act('accept_inquiry', { episodeId: created.episodeId }, 'General Medicine').result;
    assert.equal(accepted.status, 'booked');
    assert.equal(accepted.specialistId, 'sp_general');
    assert.match(accepted.slotId, /2026-10-04_morning$/);
    assert.equal(accepted.routingPolicyVersion, 'administrative-v1');
    const repeated = workflow.act('accept_inquiry', { episodeId: created.episodeId }, 'General Medicine').result;
    assert.deepEqual(repeated, accepted);
    assert.equal(workflow.getState().audit.filter(a => a.episodeId === created.episodeId && a.action === 'accept_inquiry').length, 1);
    const second = intake(workflow, { departmentId: 'general_medicine', preferredDate: '2026-10-04', preferredTime: '10:00', language: 'English' });
    const secondAccepted = workflow.act('accept_inquiry', { episodeId: second.episodeId }).result;
    assert.equal(secondAccepted.specialistId, 'sp_general_2');
  } finally { workflow.close(); }
});

test('consent, unsupported time, and no matching capacity keep an inquiry visible', () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const declined = intake(workflow, { departmentId: 'endocrinology', scheduleConsent: false });
    assert.equal(workflow.act('accept_inquiry', { episodeId: declined.episodeId }).result.status, 'awaiting_staff_scheduling');
    assert.equal(item(workflow, declined.episodeId).slotId, null);
    const noMatch = intake(workflow, { departmentId: 'endocrinology', preferredTime: '23:00' });
    assert.equal(workflow.act('accept_inquiry', { episodeId: noMatch.episodeId }).result.status, 'waitlisted');
    assert.equal(item(workflow, noMatch.episodeId).slotId, null);
    const unresolved = intake(workflow);
    assert.throws(() => workflow.act('accept_inquiry', { episodeId: unresolved.episodeId }), WorkflowError);
    assert.equal(item(workflow, unresolved.episodeId).status, 'coordination_inquiry');
    assert.equal(workflow.act('accept_inquiry', { episodeId: unresolved.episodeId, departmentId: 'neurology' }).result.status, 'booked');
  } finally { workflow.close(); }
});

test('directory import is atomic and two workflow instances cannot overbook one slot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vishwas-routing-'));
  const path = join(dir, 'state.sqlite');
  const first = createWorkflow(path, { key, demoMode: false });
  const second = createWorkflow(path, { key, demoMode: false });
  try {
    const directory = {
      departments: [{ id: 'general_medicine', name: 'General Medicine', location: 'A' }],
      specialists: [{ id: 'doctor_1', name: 'Dr Demo', departmentId: 'general_medicine', languages: ['Hindi'], room: 'A1' }],
      slots: [{ id: 'slot_1', specialistId: 'doctor_1', date: first.getState().today, time: '10:00', capacity: 1 }],
    };
    first.act('import_directory', directory);
    const a = intake(first, { departmentId: 'general_medicine' });
    const b = intake(second, { departmentId: 'general_medicine' });
    assert.equal(first.act('accept_inquiry', { episodeId: a.episodeId }).result.status, 'booked');
    assert.equal(second.act('accept_inquiry', { episodeId: b.episodeId }).result.waitlistReason, 'no_matching_capacity');
    assert.throws(() => first.act('import_directory', { ...directory, slots: [] }), WorkflowError);
    assert.equal(first.getState().slots.length, 1);
    assert.throws(() => first.act('import_directory', { ...directory, specialists: [{ ...directory.specialists[0], languages: ['French'] }] }), WorkflowError);
    first.act('import_directory', { ...directory, slots: [...directory.slots, { ...directory.slots[0], id: 'slot_2', time: '14:00' }] });
    assert.equal(second.act('accept_inquiry', { episodeId: b.episodeId }).result.slotId, 'slot_2');
    assert.equal(second.act('accept_inquiry', { episodeId: b.episodeId }).result.slotId, 'slot_2');
  } finally {
    first.close(); second.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('older encrypted state gains routing fields without losing its booked episode', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vishwas-legacy-'));
  const path = join(dir, 'state.sqlite');
  const legacy = seedState();
  delete legacy.schemaVersion;
  legacy.specialists = legacy.specialists.filter(s => !s.id.endsWith('_2'));
  legacy.slots = legacy.slots.filter(s => !s.specialistId.endsWith('_2'));
  for (const episode of legacy.episodes) for (const field of ['routingBasis', 'routingReason', 'routingPolicyVersion', 'scheduleConsent', 'preferredDate', 'preferredTime', 'preferredSpecialistId', 'assignedSpecialistId', 'schedulingReason', 'waitlistReason', 'inquiryAcceptedAt']) delete episode[field];
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL)');
  db.prepare('INSERT INTO app_state (id, json) VALUES (1, ?)').run(seal(legacy, key));
  db.close();
  const workflow = createWorkflow(path, { key });
  try {
    const state = workflow.getState();
    assert.equal(state.episodes.find(e => e.id === 'episode_booked').status, 'booked');
    assert.equal(state.episodes.find(e => e.id === 'episode_booked').assignedSpecialistId, 'sp_general');
    assert.ok(state.specialists.some(s => s.id === 'sp_general_2'));
    workflow.act('run_reminders', {});
  } finally { workflow.close(); }
  const reopened = createWorkflow(path, { key });
  try { assert.equal(reopened.getState().schemaVersion, 2); }
  finally { reopened.close(); await rm(dir, { recursive: true, force: true }); }
});

test('booking preview leaves state untouched and commit rejects stale proposals', () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const created = intake(workflow, { departmentId: 'neurology' });
    const preview = workflow.previewAcceptance({ episodeId: created.episodeId }, 'Neurology desk');
    assert.equal(preview.result.status, 'booked');
    assert.equal(preview.requiresReservation, true);
    assert.equal(item(workflow, created.episodeId).status, 'department_inquiry');
    assert.equal(item(workflow, created.episodeId).slotId, null);
    const committed = workflow.commitAcceptance(preview);
    assert.equal(committed.result.slotId, preview.result.slotId);
    assert.equal(item(workflow, created.episodeId).slotId, preview.result.slotId);
    assert.throws(() => workflow.commitAcceptance(preview), WorkflowError);
    const retry = workflow.previewAcceptance({ episodeId: created.episodeId });
    assert.equal(retry.requiresReservation, false);
    workflow.commitAcceptance(retry);
    const second = intake(workflow, { departmentId: 'neurology' });
    const stale = workflow.previewAcceptance({ episodeId: second.episodeId });
    workflow.act('checklist', { episodeId: second.episodeId, documentId: 'referral', ready: true });
    assert.throws(() => workflow.commitAcceptance(stale), /Workflow changed/);
    assert.equal(item(workflow, second.episodeId).status, 'department_inquiry');
  } finally { workflow.close(); }
});

test('acceptance preserves patient doctor preference and follow-ups retain scheduling constraints', () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const created = intake(workflow, { departmentId: 'endocrinology', preferredSpecialistId: 'sp_endo', preferredTime: '14:00' });
    assert.throws(() => workflow.act('accept_inquiry', { episodeId: created.episodeId, preferredSpecialistId: 'sp_endo_2' }), /Patient clinician preference/);
    workflow.act('accept_inquiry', { episodeId: created.episodeId });
    workflow.act('check_in', { episodeId: created.episodeId });
    const next = workflow.act('complete_visit', { episodeId: created.episodeId, evidence: 'Fictional attendance', followUpDate: '2026-10-06' }).result.episodeId;
    assert.equal(item(workflow, next).preferredSpecialistId, 'sp_endo');
    assert.equal(item(workflow, next).preferredTime, '14:00');
    workflow.act('accept_inquiry', { episodeId: next });
    const booked = item(workflow, next);
    const slot = workflow.getState().slots.find(slot => slot.id === booked.slotId);
    assert.equal(slot.specialistId, 'sp_endo');
    assert.equal(slot.time, '14:00');
  } finally { workflow.close(); }
});

test('legacy route confirmation cannot strand an accepted waitlisted inquiry', () => {
  const workflow = createWorkflow(':memory:', { key });
  try {
    const created = intake(workflow, { departmentId: 'endocrinology', preferredTime: '23:00' });
    workflow.act('accept_inquiry', { episodeId: created.episodeId });
    assert.equal(item(workflow, created.episodeId).status, 'waitlisted');
    assert.throws(() => workflow.act('confirm_route', { episodeId: created.episodeId, departmentId: 'endocrinology', referralNote: 'Same explicit department' }), /Accepted inquiry route/);
    const directory = workflow.getState();
    directory.slots.push({ id: 'late_slot', specialistId: 'sp_endo', date: '2026-10-04', time: '23:00', capacity: 1 });
    workflow.act('import_directory', { departments: directory.departments, specialists: directory.specialists, slots: directory.slots });
    workflow.act('accept_inquiry', { episodeId: created.episodeId });
    assert.equal(item(workflow, created.episodeId).slotId, 'late_slot');
  } finally { workflow.close(); }
});
