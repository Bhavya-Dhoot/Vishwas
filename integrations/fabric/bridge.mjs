import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { createPrivateKey, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import { connect, signers, hash } from '@hyperledger/fabric-gateway';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.vishwas.example.com');
const user = path.join(base, 'users/User1@org1.vishwas.example.com/msp');
const token = process.env.FABRIC_GATEWAY_TOKEN;
if (!token || token.length < 32) throw new Error('FABRIC_GATEWAY_TOKEN must contain at least 32 characters');
const keys = await readdir(path.join(user, 'keystore'));
const client = new grpc.Client('127.0.0.1:7051', grpc.credentials.createSsl(await readFile(path.join(base, 'peers/peer0.org1.vishwas.example.com/tls/ca.crt'))), {
  'grpc.ssl_target_name_override': 'peer0.org1.vishwas.example.com',
});
const gateway = connect({ client, identity: {mspId: 'Org1MSP', credentials: await readFile(path.join(user, 'signcerts/User1@org1.vishwas.example.com-cert.pem'))},
  signer: signers.newPrivateKeySigner(createPrivateKey(await readFile(path.join(user, 'keystore', keys[0])))), hash: hash.sha256,
  evaluateOptions: () => ({deadline: Date.now()+10000}), endorseOptions: () => ({deadline: Date.now()+15000}),
  submitOptions: () => ({deadline: Date.now()+15000}), commitStatusOptions: () => ({deadline: Date.now()+30000}) });
const contract = gateway.getNetwork('vishwas').getContract('commitments');
const decode = bytes => JSON.parse(Buffer.from(bytes).toString());
function authorized(req) {
  const actual = Buffer.from(req.headers.authorization || '');
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const server = http.createServer(async (req,res) => {
  const reply = (status, body) => {res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  if (!authorized(req)) return reply(401,{error:'Unauthorized'});
  try {
    if (req.method === 'GET' && req.url === '/health') {
      await contract.evaluateTransaction('Read','0'.repeat(64));
      return reply(200,{status:'ready',network:'hyperledger-fabric'});
    }
    if (req.method === 'GET' && /^\/commitments\/[a-f0-9]{64}$/.test(req.url)) {
      const record = decode(await contract.evaluateTransaction('Read',req.url.split('/')[2]));
      return reply(record.exists ? 200 : 404,record);
    }
    if (req.method !== 'POST' || req.url !== '/commitments') return reply(404,{error:'Not found'});
    let body = '';
    for await (const chunk of req) {body += chunk; if (Buffer.byteLength(body)>256) return reply(413,{error:'Request too large'});}
    let parsed; try {parsed=JSON.parse(body);} catch {return reply(400,{error:'Invalid JSON'});}
    if (!parsed || Object.keys(parsed).length !== 1 || !/^[a-f0-9]{64}$/.test(parsed.commitment)) return reply(400,{error:'Only a 32-byte lowercase hex commitment is accepted'});
    const record = decode(await contract.submitTransaction('Anchor',parsed.commitment));
    const confirmed = decode(await contract.evaluateTransaction('Read',parsed.commitment));
    if (!confirmed.exists || confirmed.transactionId !== record.transactionId) throw new Error('Unconfirmed state');
    reply(200,confirmed);
  } catch { reply(503,{error:'Fabric unavailable; commitment not confirmed'}); }
});
server.requestTimeout = 45000;
server.listen(Number(process.env.FABRIC_BRIDGE_PORT || 3101),'127.0.0.1',()=>console.log('Fabric bridge listening on loopback port '+(process.env.FABRIC_BRIDGE_PORT || 3101)));
function shutdown(){server.close();gateway.close();client.close();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
