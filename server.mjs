import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkflow, WorkflowError } from './src/workflow.mjs';
import { generateAdministrativeDraft, getAiMode } from './src/ai.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8' };
const MAX_BODY = 64 * 1024;

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '')) throw new WorkflowError(400, 'Content-Type must be application/json');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new WorkflowError(400, 'Request body is too large');
    chunks.push(chunk);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new WorkflowError(400, 'Invalid JSON body'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new WorkflowError(400, 'Body must be an object');
  if (Object.keys(body).some(key => !['type', 'payload'].includes(key)) || !Object.hasOwn(body, 'type') || !Object.hasOwn(body, 'payload')) throw new WorkflowError(400, 'Body must contain only type and payload');
  return body;
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

export function createApp({ dbPath = process.env.DB_PATH || join(root, 'data', 'vishwas.sqlite'), enableScheduler = false } = {}) {
  // The demo creates its own local data directory; no patient data belongs in Git.
  const dbFile = dbPath === ':memory:' ? dbPath : resolve(dbPath);
  let workflow;
  let timer;
  const ready = (async () => {
    if (dbFile !== ':memory:') await mkdir(dirname(dbFile), { recursive: true });
    workflow = createWorkflow(dbFile, { aiMode: getAiMode() });
    if (enableScheduler) {
      timer = setInterval(() => {
        try { workflow.act('run_reminders', {}); }
        catch (error) { console.error('Reminder scheduler failed:', error); }
      }, 60_000);
      timer.unref();
    }
  })();

  const server = createServer(async (req, res) => {
    try {
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
        if (url.pathname !== '/api/actions') throw new WorkflowError(404, 'Not found');
        const { type, payload } = await readJson(req);
        if (type === 'enhance_draft') {
          if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length !== 1 || !Object.hasOwn(payload, 'messageId')) throw new WorkflowError(400, 'enhance_draft requires only messageId');
          send(res, 200, await workflow.enhanceDraft(payload.messageId, generateAdministrativeDraft));
        } else {
          send(res, 200, workflow.act(type, payload));
        }
      } else if (req.method === 'GET' && url.pathname === '/api/state') {
        send(res, 200, workflow.getState());
      } else if (req.method === 'GET' || req.method === 'HEAD') {
        if (url.pathname.startsWith('/api/')) throw new WorkflowError(404, 'Not found');
        await serveFile(url.pathname, res, req.method);
      } else {
        throw new WorkflowError(400, 'Unsupported method');
      }
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      send(res, error instanceof WorkflowError ? error.status : 500, { error: error instanceof WorkflowError ? error.message : 'Internal server error' });
      if (!(error instanceof WorkflowError)) console.error(error);
    }
  });
  return {
    server,
    async close() {
      await ready;
      if (timer) clearInterval(timer);
      if (server.listening) await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
      workflow.close();
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server } = createApp({ enableScheduler: true });
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '127.0.0.1', () => console.log(`Vishwas demo: http://127.0.0.1:${port}`));
}
