import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { createWorkflow } from '../src/workflow.mjs';
import { createDocuments } from '../src/documents.mjs';
import { rekeyCopy } from '../scripts/rekey-database.mjs';

test('copy-only key rotation preserves original, document commitments and recoverable pending bookings', () => {
  const folder = mkdtempSync(join(tmpdir(), 'vishwas-rekey-'));
  const sourcePath = join(folder, 'original.sqlite'), targetPath = join(folder, 'rotated.sqlite');
  const oldKey = randomBytes(32), newKey = randomBytes(32);
  let workflow, documents;
  try {
    workflow = createWorkflow(sourcePath, { key: oldKey, connected: true });
    const pending = workflow.act('create_patient', { name: 'Synthetic rekey', language: 'English', contactConsent: false, caregiverConsent: false, departmentId: 'general_medicine', scheduleConsent: true }).result;
    const proposal = workflow.previewAcceptance({ episodeId: pending.episodeId }, 'Named synthetic staff');
    const idempotencyKey = randomBytes(32).toString('hex');
    workflow.beginBookingIntent({ episodeId: pending.episodeId, slotId: proposal.result.slotId, idempotencyKey, payload: { episodeId: pending.episodeId }, actor: 'Named synthetic staff' });
    documents = createDocuments(sourcePath, { key: oldKey });
    const document = documents.upload({ patientId: pending.patientId, name: 'synthetic.txt', mimeType: 'text/plain', contentBase64: Buffer.from('Synthetic rotation fixture').toString('base64') }, { role: 'staff' });
    documents.close(); documents = null; workflow.close(); workflow = null;
    const before = readFileSync(sourcePath);
    assert.deepEqual(rekeyCopy({ sourcePath, targetPath, oldKey, newKey }), { state: 1, documents: 1, pendingBookings: 1 });
    assert.deepEqual(readFileSync(sourcePath), before);
    assert.throws(() => createWorkflow(targetPath, { key: oldKey }), /key does not match/);
    workflow = createWorkflow(targetPath, { key: newKey, connected: true });
    assert.equal(workflow.bookingIntent(pending.episodeId).idempotencyKey, idempotencyKey);
    documents = createDocuments(targetPath, { key: newKey });
    assert.equal(documents.get(document.id, { role: 'staff' }).commitment, document.commitment);
    documents.close(); documents = null; workflow.close(); workflow = null;
    assert.throws(() => rekeyCopy({ sourcePath, targetPath, oldKey, newKey }), /EEXIST/);
    const broken = join(folder, 'broken.sqlite');
    assert.throws(() => rekeyCopy({ sourcePath, targetPath: broken, oldKey: randomBytes(32), newKey }), /key does not match/);
    assert.equal(existsSync(broken), false);
    workflow = createWorkflow(sourcePath, { key: oldKey, connected: true });
    assert.equal(workflow.pendingBookingCount(), 1);
    workflow.close(); workflow = null;
    const db = new DatabaseSync(targetPath);
    try { assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); } finally { db.close(); }
  } finally { documents?.close(); workflow?.close(); rmSync(folder, { recursive: true, force: true }); }
});
