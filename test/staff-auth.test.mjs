import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { makeStaffAccount, staffDirectory } from '../src/staff-auth.mjs';
import { createApp } from '../server.mjs';

test('named staff identities use salted verifiers, reject invalid credentials and disabled accounts', async () => {
  const password = randomBytes(24).toString('base64url');
  const first = await makeStaffAccount('coordinator.one', 'Care Desk One', password);
  const second = await makeStaffAccount('coordinator.two', 'Care Desk Two', password);
  assert.notEqual(first.verifier, second.verifier);
  assert.ok(!JSON.stringify(first).includes(password));
  const directory = staffDirectory([first, { ...second, disabled: true }]);
  assert.deepEqual(await directory.authenticate(first.username, password), { actor: 'Care Desk One (coordinator.one)', username: first.username });
  assert.equal(await directory.authenticate(first.username, 'incorrect'), null);
  assert.equal(await directory.authenticate('unknown', password), null);
  assert.equal(await directory.authenticate(second.username, password), null);
  assert.throws(() => staffDirectory([first, first]), /Invalid/);
  assert.throws(() => staffDirectory([{ ...first, salt: '' }]), /Invalid/);
  await assert.rejects(makeStaffAccount('staff', 'Staff', 'short'), /12/);
});

test('protected HTTP login records the named staff identity and keeps patient sessions separate', async () => {
  const password = randomBytes(24).toString('base64url');
  const account = await makeStaffAccount('care.desk', 'Care Desk', password);
  const app = createApp({ dbPath: ':memory:', mode: 'protected', key: randomBytes(32).toString('hex'), staffAccounts: [account] });
  await app.ready;
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    const metadata = await (await fetch(base + '/api/session')).json();
    assert.equal(metadata.staffLogin, 'named');
    const login = await fetch(base + '/api/session/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'care.desk', password }) });
    assert.equal(login.status, 200);
    const session = await login.json();
    assert.equal(session.actor, 'Care Desk (care.desk)');
    const headers = { 'content-type': 'application/json', cookie: login.headers.get('set-cookie').split(';')[0], 'x-csrf-token': session.csrfToken };
    const response = await fetch(base + '/api/actions', { method: 'POST', headers, body: JSON.stringify({ type: 'create_patient', payload: { name: 'Synthetic named-account check', language: 'English', contactConsent: false, caregiverConsent: false } }) });
    assert.equal(response.status, 200);
    const state = await response.json();
    assert.equal(state.audit[0].actor, 'Care Desk (care.desk)');
    assert.equal((await fetch(base + '/api/state')).status, 401);
    assert.equal((await fetch(base + '/api/session/logout', { method: 'POST', headers, body: '{}' })).status, 200);
    assert.equal((await fetch(base + '/api/state', { headers })).status, 401);
  } finally { await app.close(); }
});
