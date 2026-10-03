import test from 'node:test';
import assert from 'node:assert/strict';
import chaincode from './chaincode/index.js';
test('commitments validate, authorize and never overwrite',async()=>{
  const contract=new chaincode.contracts[0]();
  const state=new Map();let tx='a'.repeat(64);let msp='Org1MSP';
  const ctx={clientIdentity:{getMSPID:()=>msp},stub:{getTxID:()=>tx,getState:async key=>state.get(key)||Buffer.alloc(0),putState:async(key,value)=>state.set(key,value)}};
  const commitment='b'.repeat(64);
  assert.deepEqual(JSON.parse(await contract.Read(ctx,commitment)),{exists:false});
  const first=await contract.Anchor(ctx,commitment);tx='c'.repeat(64);
  assert.equal(await contract.Anchor(ctx,commitment),first);
  assert.equal(await contract.Read(ctx,commitment),first);
  assert.equal(state.size,1);
  await assert.rejects(contract.Anchor(ctx,'patient-name'),/32-byte/);
  msp='Org2MSP';await assert.rejects(contract.Anchor(ctx,'d'.repeat(64)),/organization/);
  await assert.rejects(contract.Read(ctx,commitment),/organization/);
});
