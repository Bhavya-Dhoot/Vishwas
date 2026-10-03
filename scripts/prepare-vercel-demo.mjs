import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const target = resolve('tmp/vercel-demo');
await mkdir(`${target}/api`, { recursive: true });
await cp('public', `${target}/public`, { recursive: true });
await cp('src', `${target}/src`, { recursive: true });
await cp('server.mjs', `${target}/server.mjs`);
await cp('scripts/vercel-demo-handler.mjs', `${target}/api/index.mjs`);
await cp('output/pdf/Vishwas-Supporting-Document.pdf', `${target}/public/Vishwas-Supporting-Document.pdf`);
await cp('docs/research-references.md', `${target}/public/research-references.md`);
const html = await readFile(`${target}/public/index.html`, 'utf8');
await writeFile(`${target}/public/index.html`, html.replace('<body>', '<body><div style="background:#103d42;color:white;padding:12px 20px;text-align:center;font:14px/1.5 system-ui">Temporary demo · Use fictional information only · Uploads disabled · Sessions may reset · WhatsApp, ABHA and blockchain connections are not live here.</div>'));
await writeFile(`${target}/package.json`, JSON.stringify({ name: 'vishwas-public-demo', private: true, type: 'module', engines: { node: '22.x' } }, null, 2));
const headers = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag', value: 'noindex' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" },
];
await writeFile(`${target}/vercel.json`, JSON.stringify({ version: 2, framework: null, buildCommand: '', outputDirectory: 'public', functions: { 'api/index.mjs': { maxDuration: 30 } }, rewrites: [{ source: '/api/:path*', destination: '/api/index?route=:path*' }], headers: [{ source: '/(.*)', headers }] }, null, 2));
console.log(target);
