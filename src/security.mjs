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

export function seal(value, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ v: 1, kid: createHash('sha256').update(key).digest('hex').slice(0, 16), nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') });
}

export function unseal(value, key) {
  let envelope;
  try { envelope = JSON.parse(value); } catch { throw new Error('Encrypted state is invalid'); }
  if (!envelope || envelope.v !== 1 || typeof envelope.kid !== 'string' || typeof envelope.nonce !== 'string' || typeof envelope.tag !== 'string' || typeof envelope.data !== 'string') throw new Error('Plaintext or unsupported state refused; explicit migration required');
  const nonce = Buffer.from(envelope.nonce, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  if (nonce.length !== 12 || tag.length !== 16) throw new Error('Encrypted state envelope is invalid');
  if (envelope.kid !== createHash('sha256').update(key).digest('hex').slice(0, 16)) throw new Error('Encrypted state key does not match');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
  } catch { throw new Error('Encrypted state could not be authenticated (wrong key or tampered data)'); }
}

export function passwordMatches(password, stored) {
  if (typeof password !== 'string' || !password || password.length > 1024) return false;
  const [salt, expected] = stored;
  const actual = scryptSync(password, salt, 32, { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return timingSafeEqual(actual, expected);
}
