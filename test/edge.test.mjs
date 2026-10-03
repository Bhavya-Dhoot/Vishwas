import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeOnly, enforceEdgeUrl } from '../src/edge-policy.mjs';
import { getAiMode, generateAdministrativeDraft } from '../src/ai.mjs';
import { createHospitalConnector } from '../src/hospital-connector.mjs';

test('edge-only policy rejects remote services and never calls cloud AI even with configured credentials', async () => {
  const old = process.env.EDGE_ONLY;
  process.env.EDGE_ONLY = 'true';
  try {
    assert.equal(edgeOnly(), true);
    enforceEdgeUrl('http://127.0.0.1:4100');
    enforceEdgeUrl('http://[::1]:4100');
    assert.throws(() => enforceEdgeUrl('https://example.com'), /loopback/);
    assert.throws(() => createHospitalConnector({ baseUrl: 'https://example.com', token: 'x'.repeat(32) }), /loopback/);
    assert.equal(getAiMode(), 'templates');
    let calls = 0;
    const reply = await generateAdministrativeDraft({ barrier: 'travel', language: 'English' }, { apiKey: 'configured-for-test', model: 'test', fetcher: () => { calls++; throw new Error('must never be called'); } });
    assert.equal(reply.source, 'clinic_template');
    assert.equal(calls, 0);
    process.env.EDGE_ONLY = 'yes';
    assert.throws(edgeOnly, /true or false/);
  } finally { if (old === undefined) delete process.env.EDGE_ONLY; else process.env.EDGE_ONLY = old; }
});
