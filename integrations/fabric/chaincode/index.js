'use strict';
const { Contract } = require('fabric-contract-api');
class Commitments extends Contract {
  validate(ctx, commitment) {
    if (ctx.clientIdentity.getMSPID() !== 'Org1MSP') throw new Error('Designated organization required');
    if (!/^[a-f0-9]{64}$/.test(commitment)) throw new Error('Expected 32-byte lowercase hex commitment');
  }
  async Anchor(ctx, commitment) {
    this.validate(ctx, commitment);
    const previous = await ctx.stub.getState(commitment);
    if (previous.length) return previous.toString();
    const record = JSON.stringify({ commitment, transactionId: ctx.stub.getTxID(), status: 'anchored', exists: true });
    await ctx.stub.putState(commitment, Buffer.from(record));
    return record;
  }
  async Read(ctx, commitment) {
    this.validate(ctx, commitment);
    const record = await ctx.stub.getState(commitment);
    return record.length ? record.toString() : JSON.stringify({ exists: false });
  }
}
module.exports.contracts = [Commitments];
