import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const parameters = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,63}$/;

export async function makeStaffAccount(username, displayName, password) {
  if (!usernamePattern.test(username) || typeof displayName !== 'string' || !displayName.trim() || displayName.length > 100) throw new Error('Use a 3–64 character lowercase username and a display name');
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024) throw new Error('Staff password must have 12–1024 characters');
  const salt = randomBytes(16).toString('hex');
  const verifier = (await derive(password, Buffer.from(salt, 'hex'), 32, parameters)).toString('hex');
  return { username, displayName: displayName.trim(), salt, verifier, disabled: false };
}

export function staffDirectory(accounts) {
  if (!Array.isArray(accounts) || !accounts.length || accounts.length > 100) throw new Error('Staff accounts must contain 1–100 entries');
  const byName = new Map();
  for (const account of accounts) {
    if (!account || Object.keys(account).some(k => !['username', 'displayName', 'salt', 'verifier', 'disabled'].includes(k)) || !usernamePattern.test(account.username) || typeof account.displayName !== 'string' || !account.displayName.trim() || account.displayName.length > 100 || !/^[a-f0-9]{32}$/.test(account.salt) || !/^[a-f0-9]{64}$/.test(account.verifier) || typeof account.disabled !== 'boolean' || byName.has(account.username)) throw new Error('Invalid staff account configuration');
    byName.set(account.username, { ...account });
  }
  const dummy = { salt: randomBytes(16).toString('hex'), verifier: randomBytes(32).toString('hex') };
  return {
    async authenticate(username, password) {
      if (typeof username !== 'string' || typeof password !== 'string' || !password || password.length > 1024) return null;
      const account = byName.get(username);
      const check = account ?? dummy;
      const actual = await derive(password, Buffer.from(check.salt, 'hex'), 32, parameters);
      const matches = timingSafeEqual(actual, Buffer.from(check.verifier, 'hex'));
      return matches && account && !account.disabled ? { actor: `${account.displayName} (${account.username})`, username: account.username } : null;
    }
  };
}
