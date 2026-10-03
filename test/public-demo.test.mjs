import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import handler from '../scripts/vercel-demo-handler.mjs';

test('public adapter isolates visitors, accepts platform-parsed bodies and rejects unsafe writes', async () => {
  const unsafe = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL('../scripts/vercel-demo-handler.mjs', import.meta.url).href)})`], { encoding: 'utf8', env: { ...process.env, OPENAI_API_KEY: 'synthetic-provider-setting' } });
  assert.notEqual(unsafe.status, 0);
  assert.match(unsafe.stderr, /public demo must not have private deployment settings/);
  const server = createServer(async (req, res) => {
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      req.body = JSON.parse(Buffer.concat(chunks).toString());
    }
    req.query = { route: req.url.replace('/api/', '') };
    await handler(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const host = `127.0.0.1:${server.address().port}`;
  const client = () => {
    const cookies = new Map();
    let csrf;
    return async (route, body, origin = `https://${host}`) => {
      const response = await fetch(`http://${host}/api/${route}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(body === undefined ? {} : { Origin: origin, 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      for (const cookie of response.headers.getSetCookie()) {
        assert.match(cookie, /; Secure/);
        assert.match(cookie, /; HttpOnly/);
        const [name, value] = cookie.split(';')[0].split('=');
        cookies.set(name, value);
      }
      const value = await response.json();
      csrf = value.session?.csrfToken || value.csrfToken || csrf;
      return { status: response.status, value };
    };
  };
  try {
    const a = client(), b = client();
    assert.equal((await a('session')).value.publicDemo, true);
    assert.equal((await a('session/demo', { role: 'staff' }, 'https://example.org')).status, 403);
    assert.equal((await a('session/demo', { role: 'staff' })).status, 200);
    assert.equal((await b('state')).status, 401);
    const created = await a('session/patient', { name: 'Fictional hosted patient', language: 'English', contactConsent: false, caregiverConsent: false, departmentId: 'endocrinology', scheduleConsent: true });
    assert.equal(created.status, 200);
    assert.equal(created.value.result.status, 'department_inquiry');
    assert.equal((await a('documents', {})).status, 403);
    await b('session/demo', { role: 'staff' });
    assert.ok(!(await b('state')).value.patients.some(p => p.id === created.value.result.patientId));
    await a('session/demo', { role: 'staff' });
    const accepted = await a('actions', { type: 'accept_inquiry', payload: { episodeId: created.value.result.episodeId } });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.value.episodes.find(e => e.id === created.value.result.episodeId).status, 'booked');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
