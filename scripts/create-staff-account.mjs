import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeStaffAccount, staffDirectory } from '../src/staff-auth.mjs';

// Run while the application is stopped. Password comes from the environment, never argv or output.
const [output, username, displayName] = process.argv.slice(2);
if (!output || !username || !displayName) throw new Error('Usage: node scripts/create-staff-account.mjs <outside-repo accounts.json> <username> <display-name>; set STAFF_INITIAL_PASSWORD privately');
const target = resolve(output);
const root = fileURLToPath(new URL('../', import.meta.url));
const rel = relative(root, target);
if (!rel || !rel.startsWith('..') && !isAbsolute(rel)) throw new Error('Account credentials must be stored outside the repository');
const account = await makeStaffAccount(username, displayName, process.env.STAFF_INITIAL_PASSWORD);
delete process.env.STAFF_INITIAL_PASSWORD;
let accounts = [];
try { accounts = JSON.parse(await readFile(target, 'utf8')); staffDirectory(accounts); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (accounts.some(a => a.username === username)) throw new Error('Username already exists; no account was changed');
accounts.push(account);
staffDirectory(accounts);
await mkdir(dirname(target), { recursive: true });
const temp = `${target}.tmp`;
await writeFile(temp, JSON.stringify(accounts, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
await rename(temp, target);
console.log('Named staff account saved outside the repository. Restart the application to load the directory.');
