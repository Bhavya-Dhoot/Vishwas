import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { createApp } from '../server.mjs';

// Public, synthetic demo only. Memory is intentionally disposable on Vercel.
const visitors = new Map();
const ttl = 30 * 60_000;
const emptyConnector = { configured: false, async health() { return { configured: false, mode: 'demo' }; } };
const privateSettings = ['OPENAI_API_KEY', 'FABRIC_GATEWAY_URL', 'FABRIC_GATEWAY_TOKEN', 'HOSPITAL_API_URL', 'HOSPITAL_API_TOKEN', 'STAFF_ACCOUNTS_FILE', 'STAFF_PASSWORD', 'STATE_KEY', 'DB_PATH'];
if (privateSettings.some(name => process.env[name])) throw new Error('The public demo must not have private deployment settings or connector credentials.');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const fail = (status, error) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error })); };
  const route = String(req.query?.route ?? new URL(req.url, 'https://localhost').pathname.replace(/^\/api\//, ''));
  if (!/^[a-zA-Z0-9_/-]+$/.test(route)) return fail(400, 'Invalid route');
  if (!['GET', 'POST'].includes(req.method)) return fail(405, 'Method unavailable');
  if (req.method === 'POST' && req.headers.origin !== `https://${req.headers.host}`) return fail(403, 'Same-origin request required');
  if (route.startsWith('documents')) return fail(403, 'Uploads are disabled in the public demo. Use fictional records already provided.');
  if (Number(req.headers['content-length'] || 0) > 65536) return fail(413, 'Request too large');
  const now = Date.now();
  for (const [id, entry] of visitors) {
    if (entry.until < now && !entry.active) { visitors.delete(id); await entry.app.close(); }
  }
  let id = /(?:^|;\s*)vishwas_demo=([a-f0-9]{48})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
  let entry = visitors.get(id);
  if (!entry) {
    if (visitors.size >= 32) return fail(503, 'Demo is busy. Please try again later.');
    id = randomBytes(24).toString('hex');
    const app = createApp({ dbPath: ':memory:', mode: 'demo', publicDemo: true, enableScheduler: false, hospitalConnector: emptyConnector, key: randomBytes(32).toString('hex'), staffPassword: null, staffAccountsFile: null });
    entry = { app, until: now + ttl, active: 0, writes: 0 };
    visitors.set(id, entry);
    try { await app.ready; } catch { visitors.delete(id); return fail(503, 'Demo unavailable'); }
  }
  if (req.method === 'POST' && ++entry.writes > 500) return fail(429, 'Demo action limit reached. Start a new demo after this workspace expires.');
  entry.until = now + ttl;
  entry.active++;
  const setHeader = res.setHeader.bind(res);
  const visitorCookie = `vishwas_demo=${id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`;
  res.setHeader = (name, value) => setHeader(name, name.toLowerCase() === 'set-cookie' ? [visitorCookie, ...[value].flat().map(cookie => cookie.includes('; Secure') ? cookie : `${cookie}; Secure`)] : value);
  setHeader('Set-Cookie', visitorCookie);
  const body = req.body === undefined ? null : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  if (body && body.length > 65536) { entry.active--; return fail(413, 'Request too large'); }
  const local = body ? Readable.from([body]) : req;
  local.headers = { ...req.headers, host: 'localhost', ...(req.headers.origin ? { origin: 'http://localhost' } : {}) };
  local.url = `/api/${route}`;
  local.method = req.method;
  if (local !== req) local.socket = req.socket;
  try {
    await new Promise((resolve, reject) => {
      res.once('finish', resolve);
      res.once('close', resolve);
      res.once('error', reject);
      entry.app.server.emit('request', local, res);
    });
  } finally { entry.active--; }
}
