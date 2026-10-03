import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

export function stateKey(value, keyFile, protectedMode, allowCreate = true) {
  if (value) {
    if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error('STATE_KEY must be 64 hexadecimal characters');
    return Buffer.from(value, 'hex');
  }
  if (protectedMode) throw new Error('Protected mode requires STATE_KEY');
  try {
    const key = readFileSync(keyFile);
    if (key.length !== 32) throw new Error('Invalid local state key');
    return key;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (!allowCreate) throw new Error('Encrypted database key is missing; refusing to create a replacement');
    const key = randomBytes(32);
    writeFileSync(keyFile, key, { flag: 'wx', mode: 0o600 });
    return key;
  }
}

function assertKey(key) {
  if (!(Buffer.isBuffer(key) || key instanceof Uint8Array) || key.byteLength !== 32) throw new Error('Encryption key must be 32 bytes');
}

function contextBytes(context) {
  if (typeof context !== 'string' || !context || context.length > 1024) throw new Error('Encrypted state context is required');
  return Buffer.from(`vishwas:envelope:v2:${context}`, 'utf8');
}

function decodeBase64(value, field) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Encrypted state envelope is invalid');
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value) throw new Error(`Encrypted state ${field} is invalid`);
  return decoded;
}

export function seal(value, key, context) {
  assertKey(key);
  const plaintext = JSON.stringify(value);
  if (typeof plaintext !== 'string') throw new Error('Encrypted state must be JSON serializable');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const version = context === undefined ? 1 : 2;
  if (version === 2) cipher.setAAD(contextBytes(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return JSON.stringify({ v: version, kid: createHash('sha256').update(key).digest('hex').slice(0, 16), nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') });
}

export function unseal(value, key, context) {
  assertKey(key);
  let envelope;
  try { envelope = JSON.parse(value); } catch { throw new Error('Encrypted state is invalid'); }
  if (!envelope || ![1, 2].includes(envelope.v) || typeof envelope.kid !== 'string' || !/^[a-f0-9]{16}$/.test(envelope.kid) || typeof envelope.nonce !== 'string' || typeof envelope.tag !== 'string' || typeof envelope.data !== 'string' || Object.keys(envelope).length !== 5) throw new Error('Plaintext or unsupported state refused; explicit migration required');
  if (envelope.v === 1 && context !== undefined) throw new Error('Legacy encrypted state requires explicit migration');
  const aad = envelope.v === 2 ? contextBytes(context) : undefined;
  const nonce = decodeBase64(envelope.nonce, 'nonce');
  const tag = decodeBase64(envelope.tag, 'tag');
  const data = decodeBase64(envelope.data, 'data');
  if (nonce.length !== 12 || tag.length !== 16) throw new Error('Encrypted state envelope is invalid');
  if (envelope.kid !== createHash('sha256').update(key).digest('hex').slice(0, 16)) throw new Error('Encrypted state key does not match');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    if (aad) decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'));
  } catch { throw new Error('Encrypted state could not be authenticated (wrong key or tampered data)'); }
}

export function passwordMatches(password, stored) {
  if (typeof password !== 'string' || !password || password.length > 1024) return false;
  if (!Array.isArray(stored) || stored.length !== 2 || stored[0]?.length !== 16 || stored[1]?.length !== 32) return false;
  const [salt, expected] = stored;
  const actual = scryptSync(password, salt, 32, { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return timingSafeEqual(actual, expected);
}
