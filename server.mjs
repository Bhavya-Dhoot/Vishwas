import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkflow, WorkflowError } from './src/workflow.mjs';
import { generateAdministrativeDraft, getAiMode } from './src/ai.mjs';
import { stateKey, passwordMatches } from './src/security.mjs';
import { createDocuments } from './src/documents.mjs';
import { createHospitalConnector, HospitalConnectorError } from './src/hospital-connector.mjs';
import { staffDirectory } from './src/staff-auth.mjs';
import { edgeOnly } from './src/edge-policy.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8' };
const MAX_BODY = 64 * 1024;

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}

async function readJson(req, limit = MAX_BODY) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '')) throw new WorkflowError(400, 'Content-Type must be application/json');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new WorkflowError(400, 'Request body is too large');
    chunks.push(chunk);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new WorkflowError(400, 'Invalid JSON body'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new WorkflowError(400, 'Body must be an object');
  return body;
}

function exact(body, required, optional = []) {
  for (const field of required) if (!Object.hasOwn(body, field)) throw new WorkflowError(400, `${field} is required`);
  for (const field of Object.keys(body)) if (![...required, ...optional].includes(field)) throw new WorkflowError(400, `Unknown field: ${field}`);
}

async function serveFile(pathname, res, method) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { throw new WorkflowError(400, 'Invalid path encoding'); }
  if (decoded.includes('\\') || decoded.includes('\0')) throw new WorkflowError(400, 'Invalid path');
  const target = resolve(publicDir, `.${decoded === '/' ? '/index.html' : decoded}`);
  const rel = relative(publicDir, target);
  if (rel.startsWith('..' + sep) || rel === '..' || rel.startsWith(sep)) throw new WorkflowError(404, 'Not found');
  let data;
  try { data = await readFile(target); }
  catch { throw new WorkflowError(404, 'Not found'); }
  res.writeHead(200, { 'content-type': types[extname(target).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(method === 'HEAD' ? undefined : data);
}

export function createApp({ dbPath, enableScheduler = false, mode = process.env.APP_MODE || 'demo', key: suppliedKey = process.env.STATE_KEY, staffPassword = process.env.STAFF_PASSWORD, staffAccounts, staffAccountsFile = process.env.STAFF_ACCOUNTS_FILE, hospitalConnector = createHospitalConnector(), publicDemo = false } = {}) {
  if (!['demo', 'protected'].includes(mode)) throw new Error('APP_MODE must be demo or protected');
  if (mode === 'protected' && !staffAccounts && !staffAccountsFile && (!staffPassword || staffPassword.length < 12)) throw new Error('Protected mode requires named staff accounts or STAFF_PASSWORD of at least 12 characters');
  const localOnly = edgeOnly();
  let namedStaff = staffAccounts ? staffDirectory(staffAccounts) : null;
  const demoMode = mode === 'demo';
  // The demo creates its own local data directory; no patient data belongs in Git.
  const selectedDb = dbPath || process.env.DB_PATH || join(root, 'data', demoMode ? 'vishwas-demo-encrypted.sqlite' : 'vishwas-protected-encrypted.sqlite');
  const dbFile = selectedDb === ':memory:' ? selectedDb : resolve(selectedDb);
  const keyDir = join(process.env.LOCALAPPDATA || join(homedir(), '.local', 'share'), 'Vishwas');
  const keyFile = dbFile === ':memory:' ? null : join(keyDir, `${createHash('sha256').update(dbFile).digest('hex')}.key`);
  const sessions = new Map();
  const attempts = new Map();
  const verifier = staffPassword && !staffAccounts && !staffAccountsFile ? [randomBytes(16), null] : null;
  if (verifier) verifier[1] = scryptSync(staffPassword, verifier[0], 32, { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  let workflow;
  let documents;
  let timer;
  let initialRecovery;
  let recovering = false;
  let lastReconciliation = null;
  // ponytail: one process-wide write queue; use a durable outbox before a multi-instance pilot.
  let writes = Promise.resolve();
  async function acquireWrite() {
    const previous = writes;
    let release;
    writes = new Promise(resolve => { release = resolve; });
    await previous;
    return release;
  }
  const ready = (async () => {
    if (staffAccountsFile && !staffAccounts) namedStaff = staffDirectory(JSON.parse(await readFile(staffAccountsFile, 'utf8')));
    if (dbFile !== ':memory:') await mkdir(dirname(dbFile), { recursive: true });
    if (keyFile) mkdirSync(keyDir, { recursive: true });
    const key = suppliedKey ? stateKey(suppliedKey, keyFile, !demoMode) : dbFile === ':memory:' && demoMode ? randomBytes(32) : stateKey(null, keyFile, !demoMode, !existsSync(dbFile));
    workflow = createWorkflow(dbFile, { aiMode: getAiMode(), key, demoMode, connected: hospitalConnector.configured });
    documents = createDocuments(dbFile, { key });
    if (hospitalConnector.configured) initialRecovery = Promise.resolve().then(() => recoverPendingBookings()).catch(() => {
      lastReconciliation = { attempted: 0, recovered: 0, failed: 1, pending: workflow.pendingBookingCount(), at: new Date().toISOString() };
    });
    if (enableScheduler) {
      timer = setInterval(async () => {
        const release = await acquireWrite();
        try { workflow.act('run_reminders', {}); }
        catch (error) { console.error('Reminder scheduler failed:', error); }
        finally { release(); }
        if (hospitalConnector.configured) await recoverPendingBookings().catch(() => {
          lastReconciliation = { attempted: 0, recovered: 0, failed: 1, pending: workflow.pendingBookingCount(), at: new Date().toISOString() };
        });
      }, 60_000);
      timer.unref();
    }
  })();

  const sessionView = session => ({ mode, publicDemo, staffLogin: namedStaff ? 'named' : 'shared', edgeOnly: localOnly, authenticated: !!session, role: session?.role ?? null, csrfToken: session?.csrf ?? null, actor: session?.actor ?? null, patientId: session?.patientId ?? null });
  const tokenHash = token => createHash('sha256').update(token).digest('hex');
  function current(req) {
    const token = /(?:^|;\s*)vishwas_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
    if (!token) return null;
    const id = tokenHash(token);
    const session = sessions.get(id);
    if (!session) return null;
    if (session.expires < Date.now()) { sessions.delete(id); return null; }
    return session;
  }
  function issue(req, res, role, patientId = null, staffActor = null) {
    const oldToken = /(?:^|;\s*)vishwas_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
    if (oldToken) sessions.delete(tokenHash(oldToken));
    const token = randomBytes(32).toString('base64url');
    const session = { role, patientId, actor: role === 'staff' ? (staffActor ?? (demoMode ? 'Demo staff' : 'Clinic staff')) : 'Patient', csrf: randomBytes(32).toString('base64url'), expires: Date.now() + 8 * 60 * 60 * 1000 };
    sessions.set(tokenHash(token), session);
    res.setHeader('Set-Cookie', `vishwas_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
    return session;
  }
  function requireSession(req, csrf = false) {
    const session = current(req);
    if (!session) throw new WorkflowError(401, 'Sign in required');
    if (csrf && (typeof req.headers['x-csrf-token'] !== 'string' || req.headers['x-csrf-token'] !== session.csrf)) throw new WorkflowError(403, 'Invalid CSRF token');
    return session;
  }
  function scoped(session) {
    const state = workflow.getState();
    state.documents = documents.list(session);
    if (session.role === 'staff') return state;
    const id = session.patientId;
    const episodes = state.episodes.filter(e => e.patientId === id);
    return { today: state.today, departments: state.departments, specialists: state.specialists, slots: state.slots,
      patients: state.patients.filter(p => p.id === id), episodes,
      messages: state.messages.filter(m => m.patientId === id && m.status !== 'draft'),
      documents: state.documents, integrations: state.integrations };
  }
  function authorize(session, type, payload) {
    if (session.role === 'staff') {
      if (!demoMode && ['set_date', 'reset_demo'].includes(type)) throw new WorkflowError(403, 'Demo action unavailable');
      return;
    }
    if (!['checklist', 'update_consent', 'set_scheduling_consent', 'abha_consent', 'patient_reply'].includes(type)) throw new WorkflowError(403, 'Staff role required');
    const state = workflow.getState();
    const patientId = type === 'update_consent' || type === 'abha_consent' ? payload?.patientId : state.episodes.find(e => e.id === payload?.episodeId)?.patientId;
    if (patientId !== session.patientId) throw new WorkflowError(404, 'Record not found');
  }
  async function retireBookingIntent(intent) {
    try {
      await hospitalConnector.cancelByKey(intent.idempotencyKey);
      const remote = await hospitalConnector.lookup(intent.idempotencyKey);
      if (remote?.status !== 'cancelled') throw new Error('Hospital cancellation was not verified');
      workflow.clearBookingIntent(intent.episodeId);
    } catch {
      throw new WorkflowError(503, 'A hospital booking may still exist; staff reconciliation is required before another slot can be reserved');
    }
  }
  async function acceptConnected(payload, actor, recoveredBy = actor) {
    const pending = typeof payload?.episodeId === 'string' ? workflow.bookingIntent(payload.episodeId) : null;
    let proposal;
    try { proposal = workflow.previewAcceptance(pending?.payload ?? payload, pending?.actor ?? actor); }
    catch (error) {
      if (pending) await retireBookingIntent(pending);
      throw error;
    }
    if (pending && (!proposal.requiresReservation || proposal.result.slotId !== pending.slotId)) {
      await retireBookingIntent(pending);
      if (proposal.requiresReservation) throw new WorkflowError(409, 'The earlier hospital booking attempt was cancelled because the selected slot changed. Review and retry acceptance.');
      workflow.markBookingRecovery(proposal, recoveredBy, 'Pending hospital booking cancelled after the inquiry no longer required that reservation');
    }
    let reservation;
    if (proposal.requiresReservation) {
      const intent = pending ?? workflow.beginBookingIntent({
        episodeId: proposal.result.episodeId, slotId: proposal.result.slotId,
        idempotencyKey: randomBytes(32).toString('hex'), payload, actor,
      });
      try { reservation = await hospitalConnector.reserve({ idempotencyKey: intent.idempotencyKey, slotId: intent.slotId }); }
      catch (error) {
        if (error instanceof HospitalConnectorError && error.status === 409) await retireBookingIntent(intent);
        throw error;
      }
      const booked = proposal.next.episodes.find(episode => episode.id === proposal.result.episodeId);
      booked.hospitalReservation = { ...reservation, confirmedAt: new Date().toISOString(), source: 'sample-contract' };
      if (pending) workflow.markBookingRecovery(proposal, recoveredBy);
    }
    try { return workflow.commitAcceptance(proposal, reservation); }
    catch (error) {
      if (!reservation) throw error;
      throw new WorkflowError(503, 'Hospital reservation may be confirmed but local booking is pending; retry acceptance to reconcile it');
    }
  }
  async function recoverPendingBookings() {
    if (recovering) return lastReconciliation;
    recovering = true;
    const release = await acquireWrite();
    try {
      const intents = workflow.pendingBookingIntents(3);
      let recovered = 0;
      let failed = 0;
      for (const intent of intents) {
        try { await acceptConnected(intent.payload, intent.actor, 'System reconciliation'); recovered++; }
        catch { failed++; /* Keep unresolved intent for the next bounded retry or staff review. */ }
      }
      lastReconciliation = { attempted: intents.length, recovered, failed, pending: workflow.pendingBookingCount(), at: new Date().toISOString() };
      return lastReconciliation;
    } finally { release(); recovering = false; }
  }

  const server = createServer(async (req, res) => {
    let releaseWrite;
    try {
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      await ready;
      if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/.test(req.headers.host ?? '')) throw new WorkflowError(400, 'Local host required');
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (req.method === 'POST') {
        if (req.headers.origin) {
          let origin;
          try { origin = new URL(req.headers.origin); }
          catch { throw new WorkflowError(400, 'Invalid Origin'); }
          if (origin.protocol !== 'http:' || origin.host !== req.headers.host) throw new WorkflowError(400, 'Cross-origin writes are not allowed');
        }
        const body = await readJson(req, url.pathname === '/api/documents' ? 3 * 1024 * 1024 : MAX_BODY);
        releaseWrite = await acquireWrite();
        if (url.pathname === '/api/session/demo') {
          if (!demoMode) throw new WorkflowError(404, 'Not found');
          exact(body, ['role'], ['patientId']);
          if (body.role === 'staff' && !Object.hasOwn(body, 'patientId')) send(res, 200, sessionView(issue(req, res, 'staff')));
          else if (body.role === 'patient' && ['patient_routing', 'patient_booked', 'patient_followup'].includes(body.patientId) && workflow.getState().patients.some(p => p.id === body.patientId)) send(res, 200, sessionView(issue(req, res, 'patient', body.patientId)));
          else throw new WorkflowError(400, 'Invalid demo role or patient');
        } else if (url.pathname === '/api/session/login') {
          if (demoMode) throw new WorkflowError(404, 'Not found');
          exact(body, namedStaff ? ['username', 'password'] : ['password']);
          const ip = req.socket.remoteAddress;
          const record = attempts.get(ip) ?? { count: 0, until: Date.now() + 15 * 60_000 };
          if (record.until < Date.now()) { record.count = 0; record.until = Date.now() + 15 * 60_000; }
          if (record.count >= 5) throw new WorkflowError(429, 'Too many login attempts');
          const identity = namedStaff ? await namedStaff.authenticate(body.username, body.password) : passwordMatches(body.password, verifier) ? { actor: 'Clinic staff' } : null;
          if (!identity) { record.count++; attempts.set(ip, record); throw new WorkflowError(401, 'Invalid credentials'); }
          attempts.delete(ip);
          send(res, 200, sessionView(issue(req, res, 'staff', null, identity.actor)));
        } else if (url.pathname === '/api/session/patient') {
          exact(body, ['name', 'language', 'contactConsent', 'caregiverConsent'], ['caregiverName', 'referralNote', 'departmentId', 'referralDepartmentLabel', 'preferredDate', 'preferredTime', 'scheduleConsent', 'preferredSpecialistId']);
          const result = workflow.act('create_patient', body, 'Patient').result;
          send(res, 200, { session: sessionView(issue(req, res, 'patient', result.patientId)), result });
        } else if (url.pathname === '/api/session/logout') {
          exact(body, []);
          const session = requireSession(req, true);
          const token = /(?:^|;\s*)vishwas_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
          if (token) sessions.delete(tokenHash(token));
          res.setHeader('Set-Cookie', 'vishwas_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
          send(res, 200, sessionView(null));
        } else if (url.pathname === '/api/connector/sync') {
          const session = requireSession(req, true);
          if (session.role !== 'staff') throw new WorkflowError(403, 'Staff role required');
          exact(body, []);
          const response = workflow.act('import_directory', await hospitalConnector.directory(), session.actor);
          send(res, 200, { ...scoped(session), result: response.result });
        } else if (url.pathname === '/api/documents') {
          const session = requireSession(req, true);
          exact(body, ['patientId', 'name', 'mimeType', 'contentBase64'], ['ledgerConsent']);
          if (!workflow.getState().patients.some(p => p.id === body.patientId)) throw new WorkflowError(404, 'Patient not found');
          let document = documents.upload(body, session);
          if (document.ledgerConsent) document = await documents.anchor(document.id, session);
          send(res, 201, { document });
        } else if (/^\/api\/documents\/[^/]+\/(delete|anchor|verify)$/.test(url.pathname)) {
          const session = requireSession(req, true);
          exact(body, []);
          const [, , , id, action] = url.pathname.split('/');
          const result = await documents[action](id, session);
          send(res, 200, action === 'anchor' ? { document: result } : result);
        } else if (url.pathname === '/api/actions') {
        exact(body, ['type', 'payload']);
        const { type, payload } = body;
        const session = requireSession(req, true);
        authorize(session, type, payload);
        let response;
        if (type === 'enhance_draft') {
          if (session.role !== 'staff') throw new WorkflowError(403, 'Staff role required');
          if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length !== 1 || !Object.hasOwn(payload, 'messageId')) throw new WorkflowError(400, 'enhance_draft requires only messageId');
          response = await workflow.enhanceDraft(payload.messageId, generateAdministrativeDraft, session.actor);
        } else if (type === 'accept_inquiry' && hospitalConnector.configured) {
          response = await acceptConnected(payload, session.actor);
        } else {
          const hospitalHistory = workflow.pendingBookingCount() || workflow.hasHospitalReservations();
          if (type === 'accept_inquiry' && hospitalHistory) throw new WorkflowError(503, 'Hospital booking history requires a connected hospital API before accepting another inquiry');
          if ((hospitalConnector.configured || hospitalHistory) && type === 'reset_demo') throw new WorkflowError(409, 'Disconnect and reconcile the sample hospital reservations before resetting local demo data.');
          if ((hospitalConnector.configured || hospitalHistory) && ['book', 'reschedule'].includes(type)) throw new WorkflowError(409, 'Connected scheduling requires department acceptance; manual booking and rescheduling need hospital reconciliation.');
          response = workflow.act(type, payload, session.actor);
          if (type === 'reset_demo') {
            documents.clear();
            for (const [id, active] of sessions) if (active.role === 'patient') sessions.delete(id);
          }
        }
        send(res, 200, { ...scoped(session), result: response.result });
        } else throw new WorkflowError(404, 'Not found');
      } else if (req.method === 'GET' && url.pathname === '/api/directory') {
        const { departments, specialists, slots } = workflow.getState();
        send(res, 200, { departments, specialists, slots });
      } else if (req.method === 'GET' && url.pathname === '/api/connector/status') {
        if (requireSession(req).role !== 'staff') throw new WorkflowError(403, 'Staff role required');
        send(res, 200, { ...await hospitalConnector.health(), pendingBookings: workflow.pendingBookingCount(), lastReconciliation });
      } else if (req.method === 'GET' && /^\/api\/documents\/[^/]+\/download$/.test(url.pathname)) {
        const doc = documents.get(url.pathname.split('/')[3], requireSession(req));
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="document${doc.mimeType === 'application/pdf' ? '.pdf' : doc.mimeType === 'application/json' ? '.json' : '.txt'}"; filename*=UTF-8''${encodeURIComponent(doc.name).replace(/'/g, '%27')}`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(Buffer.from(doc.contentBase64, 'base64'));
      } else if (req.method === 'GET' && url.pathname === '/api/session') {
        send(res, 200, sessionView(current(req)));
      } else if (req.method === 'GET' && url.pathname === '/api/state') {
        send(res, 200, scoped(requireSession(req)));
      } else if (req.method === 'GET' || req.method === 'HEAD') {
        if (url.pathname.startsWith('/api/')) throw new WorkflowError(404, 'Not found');
        await serveFile(url.pathname, res, req.method);
      } else {
        throw new WorkflowError(400, 'Unsupported method');
      }
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      const expected = error instanceof WorkflowError || error instanceof HospitalConnectorError;
      send(res, expected ? error.status : 500, { error: expected ? error.message : 'Internal server error' });
      if (!expected) console.error(error);
    } finally { releaseWrite?.(); }
  });
  return {
    server,
    ready,
    async recoverBookings() { await ready; await initialRecovery; return recoverPendingBookings(); },
    async close() {
      await ready;
      if (timer) clearInterval(timer);
      if (server.listening) await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
      await initialRecovery;
      await writes;
      workflow.close();
      documents.close();
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, ready } = createApp({ enableScheduler: true });
  const port = Number(process.env.PORT || 3000);
  ready.then(() => server.listen(port, '127.0.0.1', () => console.log(`Vishwas ${process.env.APP_MODE || 'demo'}: http://127.0.0.1:${port}`)), error => { console.error('Startup failed:', error.message); process.exitCode = 1; });
}
