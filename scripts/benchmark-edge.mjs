import { performance } from 'node:perf_hooks';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWorkflow, seedState } from '../src/workflow.mjs';
import { seal } from '../src/security.mjs';

// Synthetic single-process preview benchmark, including decrypt, clone, rules and matching.
// This is not a concurrency, hospital throughput or patient-outcome measurement.
const folder = mkdtempSync(join(tmpdir(), 'vishwas-edge-bench-'));
const path = join(folder, 'bench.sqlite');
const key = randomBytes(32);
let workflow;
try {
  const state = seedState();
  state.specialists = Array.from({ length: 100 }, (_, i) => ({ id: `doctor_${i}`, name: `Synthetic doctor ${i}`, departmentId: 'general_medicine', languages: ['English', 'Hindi'], room: 'Demo' }));
  state.slots = state.specialists.flatMap(s => Array.from({ length: 100 }, (_, i) => ({ id: `${s.id}_${i}`, specialistId: s.id, date: `2026-10-${String(3 + Math.floor(i / 20)).padStart(2, '0')}`, time: `${String(8 + Math.floor((i % 20) / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`, capacity: 2 })));
  const template = state.episodes.find(e => e.id === 'episode_booked');
  state.episodes = Array.from({ length: 1000 }, (_, i) => ({ ...structuredClone(template), id: `synthetic_${i}`, slotId: state.slots[i].id, assignedSpecialistId: state.slots[i].specialistId }));
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)');
  db.prepare('INSERT INTO app_state VALUES (1, ?)').run(seal(state, key, 'app-state:1'));
  db.close();
  workflow = createWorkflow(path, { key });
  const intake = workflow.act('create_patient', { name: 'Synthetic benchmark enquiry', language: 'English', contactConsent: false, caregiverConsent: false, departmentId: 'general_medicine', scheduleConsent: true }).result;
  const samples = [];
  let selectedSlot;
  for (let i = 0; i < 11; i++) {
    const start = performance.now();
    const proposal = workflow.previewAcceptance({ episodeId: intake.episodeId }, 'Benchmark');
    const elapsed = performance.now() - start;
    if (!proposal.requiresReservation || proposal.result.status !== 'booked') throw new Error('Benchmark did not find a slot');
    selectedSlot ??= proposal.result.slotId;
    if (selectedSlot !== proposal.result.slotId) throw new Error('Matching was not deterministic');
    if (i) samples.push(elapsed);
  }
  samples.sort((a, b) => a - b);
  console.log(JSON.stringify({ scenario: 'synthetic-local-preview', slots: 10000, existingEpisodes: 1000, measuredRuns: samples.length, medianMs: +((samples[4] + samples[5]) / 2).toFixed(2), maxMs: +samples.at(-1).toFixed(2), externalCalls: 0, note: 'One host, sequential previews; not a production capacity claim.' }, null, 2));
} finally {
  workflow?.close();
  rmSync(folder, { recursive: true, force: true });
}
