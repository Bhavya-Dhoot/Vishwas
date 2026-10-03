import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { seal, unseal } from './security.mjs';
import { WorkflowError } from './workflow.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest();
const commitmentOf = doc => hash(Buffer.concat([Buffer.from(doc.salt, 'base64'), hash(Buffer.from(doc.contentBase64, 'base64'))])).toString('hex');
const publicDocument = ({ contentBase64, salt, ...metadata }) => metadata;

export function createDocuments(dbPath, { key, gatewayUrl = process.env.FABRIC_GATEWAY_URL, gatewayToken = process.env.FABRIC_GATEWAY_TOKEN, fetchImpl = fetch } = {}) {
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, encrypted TEXT NOT NULL)');
  const all = () => db.prepare('SELECT encrypted FROM documents').all().map(row => unseal(row.encrypted, key));
  const save = doc => db.prepare('INSERT OR REPLACE INTO documents (id, encrypted) VALUES (?, ?)').run(doc.id, seal(doc, key));
  function owned(id, session) {
    const row = db.prepare('SELECT encrypted FROM documents WHERE id = ?').get(id);
    const doc = row && unseal(row.encrypted, key);
    if (!doc || (session.role !== 'staff' && doc.patientId !== session.patientId)) throw new WorkflowError(404, 'Document not found');
    return doc;
  }
  async function ledger(commitment, write) {
    if (!gatewayUrl || !gatewayToken) throw new Error('Fabric gateway is not configured');
    const url = new URL(`${gatewayUrl.replace(/\/$/, '')}/commitments${write ? '' : '/' + commitment}`);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Fabric gateway requires HTTPS or loopback');
    const response = await fetchImpl(url, { method: write ? 'POST' : 'GET', headers: { Authorization: `Bearer ${gatewayToken}`, ...(write ? { 'Content-Type': 'application/json' } : {}) }, ...(write ? { body: JSON.stringify({ commitment }) } : {}), signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!write && response.status === 404) return false;
    if (!response.ok) throw new Error('Fabric gateway unavailable');
    const result = await response.json();
    if (result.commitment !== commitment || result.exists !== true) throw new Error('Invalid Fabric receipt');
    return true;
  }
  return {
    list(session) { return all().filter(doc => session.role === 'staff' || doc.patientId === session.patientId).map(publicDocument); },
    get: owned,
    upload(body, session) {
      const { patientId, name, mimeType, contentBase64, ledgerConsent = false } = body;
      if (session.role !== 'staff' && patientId !== session.patientId) throw new WorkflowError(404, 'Patient not found');
      if (typeof ledgerConsent !== 'boolean') throw new WorkflowError(400, 'ledgerConsent must be boolean');
      if (typeof name !== 'string' || !name.trim() || name.length > 150 || /[\x00-\x1f\x7f]/.test(name)) throw new WorkflowError(400, 'Invalid document name');
      if (!['application/pdf', 'text/plain', 'application/json'].includes(mimeType)) throw new WorkflowError(400, 'Only PDF, UTF-8 text and JSON documents are supported');
      if (typeof contentBase64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) throw new WorkflowError(400, 'Invalid base64 document');
      const bytes = Buffer.from(contentBase64, 'base64');
      if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new WorkflowError(400, 'Document must be between 1 byte and 2 MB');
      if (mimeType === 'application/pdf') {
        if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-' || !bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) throw new WorkflowError(400, 'Invalid PDF signature');
      } else {
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) throw new Error();
          if (mimeType === 'application/json') JSON.parse(text);
        } catch { throw new WorkflowError(400, 'Document must contain valid UTF-8 text or JSON'); }
      }
      if (all().filter(doc => doc.patientId === patientId).length >= 5) throw new WorkflowError(400, 'Maximum five documents per patient');
      const suffix = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'application/json' ? '.json' : '.txt';
      const safeName = name.replace(/[\\/"<>:|?*]/g, '_').trim().replace(/\.[^.]+$/, '') + suffix;
      const doc = { id: randomUUID(), patientId, name: safeName, mimeType, size: bytes.length, contentBase64, salt: randomBytes(32).toString('base64'), createdAt: new Date().toISOString(), ledgerConsent, anchorStatus: ledgerConsent ? 'anchor_pending' : 'offchain_saved' };
      doc.commitment = commitmentOf(doc);
      save(doc);
      return publicDocument(doc);
    },
    async anchor(id, session) {
      const doc = owned(id, session);
      if (!doc.ledgerConsent) throw new WorkflowError(403, 'Explicit upload consent is required before ledger anchoring');
      try { await ledger(doc.commitment, true); doc.anchorStatus = 'anchored'; }
      catch { doc.anchorStatus = 'anchor_failed'; }
      // A concurrent deletion must not resurrect the file when a network request finishes.
      if (db.prepare('SELECT id FROM documents WHERE id = ?').get(id)) save(doc);
      return publicDocument(doc);
    },
    async verify(id, session) {
      const doc = owned(id, session);
      if (!doc.ledgerConsent) return { verified: false, status: 'offchain_saved', message: 'Ledger verification requires explicit upload consent.' };
      if (commitmentOf(doc) !== doc.commitment) return { verified: false, status: 'mismatch', message: 'Stored document commitment does not match.' };
      try {
        const exists = await ledger(doc.commitment, false);
        return { verified: exists, status: exists ? 'verified' : 'not_found', message: exists ? 'File integrity matches its ledger commitment. This does not establish clinical authenticity.' : 'Commitment is not present on the ledger.' };
      } catch { return { verified: false, status: 'unavailable', message: 'Fabric verification is unavailable; the encrypted file remains saved.' }; }
    },
    delete(id, session) {
      const doc = owned(id, session);
      db.prepare('DELETE FROM documents WHERE id = ?').run(id);
      return { deleted: true, ledgerCommitmentRetained: doc.ledgerConsent, message: 'Any previously submitted opaque ledger commitment remains on the ledger.' };
    },
    clear() { db.exec('DELETE FROM documents'); },
    close() { db.close(); },
  };
}
