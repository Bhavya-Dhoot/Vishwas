import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAdministrativeDraft } from '../src/ai.mjs';

test('administrative AI uses a working template without credentials and rejects clinical categories', async () => {
  const reply = await generateAdministrativeDraft({ barrier: 'travel', language: 'Hindi' }, { apiKey: '', model: '' });
  assert.equal(reply.source, 'clinic_template');
  assert.match(reply.text, /यात्रा/);
  await assert.rejects(generateAdministrativeDraft({ barrier: 'medical', language: 'English' }), /require staff/);
  await assert.rejects(generateAdministrativeDraft({ barrier: '__proto__', language: 'English' }));
});

test('provider receives only the selected logistics category and approved template; result remains a draft', async () => {
  const reply = await generateAdministrativeDraft({ barrier: 'booking', language: 'English', medicalRecord: 'PRIVATE SHOULD NEVER LEAVE' }, {
    apiKey: 'test-only', model: 'test-model', fetcher: async (url, request) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const body = JSON.parse(request.body);
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      assert.deepEqual(Object.keys(JSON.parse(body.input)).sort(), ['approvedReply', 'barrier', 'language']);
      assert.ok(!request.body.includes('PRIVATE SHOULD NEVER LEAVE'));
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ text: 'The team can help check available appointment times.' }) }] }] });
    }
  });
  assert.equal(reply.source, 'openai');
  assert.equal(reply.text, 'The team can help check available appointment times.');
  assert.ok(!Object.hasOwn(reply, 'approvedBy'));
});

test('provider failures and malformed replies leave a usable clinic template', async () => {
  for (const fetcher of [async () => { throw new Error('offline'); }, async () => new Response('', { status: 429 }), async () => Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'not JSON' }] }] })]) {
    const reply = await generateAdministrativeDraft({ barrier: 'cost', language: 'English' }, { apiKey: 'test-only', model: 'test-model', fetcher });
    assert.equal(reply.source, 'clinic_template');
    assert.match(reply.text, /help desk/);
  }
});
