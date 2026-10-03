const identifier = /^[A-Za-z0-9_.:-]{1,200}$/;

export class HospitalConnectorError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const bad = message => { throw new HospitalConnectorError(502, message); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 200) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const id = value => typeof value === 'string' && identifier.test(value);
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function validateDirectory(value) {
  if (!object(value) || Object.keys(value).some(key => !['departments', 'specialists', 'slots'].includes(key))) bad('Hospital directory has an invalid shape');
  const sets = {};
  for (const [key, limit] of [['departments', 100], ['specialists', 1000], ['slots', 10000]]) {
    if (!Array.isArray(value[key]) || value[key].length > limit || (key !== 'slots' && !value[key].length)) bad(`Hospital ${key} list is invalid`);
    sets[key] = new Set();
    for (const item of value[key]) {
      if (!object(item) || !id(item.id) || sets[key].has(item.id)) bad(`Hospital ${key} IDs must be unique`);
      sets[key].add(item.id);
    }
  }
  for (const item of value.departments) {
    if (Object.keys(item).some(key => !['id', 'name', 'location'].includes(key)) || !text(item.name) || typeof item.location !== 'string' || item.location.length > 300) bad('Hospital department is invalid');
  }
  for (const item of value.specialists) {
    if (Object.keys(item).some(key => !['id', 'name', 'departmentId', 'languages', 'room'].includes(key)) || !text(item.name) || !sets.departments.has(item.departmentId) || !Array.isArray(item.languages) || !item.languages.length || item.languages.some(language => !['English', 'Hindi'].includes(language)) || typeof item.room !== 'string' || item.room.length > 100) bad('Hospital specialist is invalid');
  }
  for (const item of value.slots) {
    if (Object.keys(item).some(key => !['id', 'specialistId', 'date', 'time', 'capacity'].includes(key)) || !sets.specialists.has(item.specialistId) || !day(item.date) || typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) || !Number.isSafeInteger(item.capacity) || item.capacity < 1 || item.capacity > 1000) bad('Hospital appointment slot is invalid');
  }
  return structuredClone(value);
}

export function createHospitalConnector({ baseUrl = process.env.HOSPITAL_API_URL, token = process.env.HOSPITAL_API_TOKEN, timeoutMs = 5000 } = {}) {
  const configured = Boolean(baseUrl);
  let base;
  if (configured) {
    try { base = new URL(baseUrl); } catch { throw new Error('HOSPITAL_API_URL must be an absolute URL'); }
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname);
    if (!(base.protocol === 'https:' || base.protocol === 'http:' && loopback) || base.username || base.password || base.search || base.hash) throw new Error('Hospital API must use HTTPS, or HTTP on loopback, without embedded credentials');
    if (typeof token !== 'string' || !/^[A-Za-z0-9._~-]{24,512}$/.test(token)) throw new Error('HOSPITAL_API_TOKEN must be a 24–512 character secret');
    base.pathname = `${base.pathname.replace(/\/+$/, '')}/`;
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 30000) throw new Error('Hospital timeout must be between 50 and 30000 ms');

  async function request(path, method = 'GET', body) {
    if (!configured) throw new HospitalConnectorError(503, 'Hospital connector is not configured');
    try {
      const response = await fetch(new URL(path.replace(/^\//, ''), base), {
        method, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: `Bearer ${token}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 409) throw new HospitalConnectorError(409, 'Hospital slot is unavailable or the reservation conflicts; no appointment was confirmed');
        throw new HospitalConnectorError(502, 'Hospital API rejected the request; no appointment was confirmed');
      }
      if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) { await response.body?.cancel(); bad('Hospital API did not return JSON'); }
      const reader = response.body.getReader();
      const chunks = [];
      let length = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 2 * 1024 * 1024) { await reader.cancel(); bad('Hospital API response exceeded the size limit'); }
        chunks.push(Buffer.from(value));
      }
      try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { bad('Hospital API returned invalid JSON'); }
    } catch (error) {
      if (error instanceof HospitalConnectorError) throw error;
      if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new HospitalConnectorError(504, 'Hospital API timed out; retry to reconcile the reservation');
      throw new HospitalConnectorError(503, 'Hospital API is unavailable; no appointment was confirmed locally');
    }
  }

  return {
    configured,
    status: () => ({ configured, kind: 'sample-contract' }),
    async health() {
      if (!configured) return { configured: false, reachable: false, kind: 'sample-contract' };
      try {
        const result = await request('/health');
        return { configured: true, reachable: result?.status === 'ok', kind: 'sample-contract' };
      } catch { return { configured: true, reachable: false, kind: 'sample-contract' }; }
    },
    async directory() { return validateDirectory(await request('/directory')); },
    async reserve({ idempotencyKey, slotId }) {
      if (!id(idempotencyKey) || !id(slotId)) throw new HospitalConnectorError(400, 'An opaque booking key and valid slot ID are required');
      const result = await request('/bookings', 'POST', { idempotencyKey, slotId });
      if (!object(result) || !id(result.id) || result.slotId !== slotId || result.idempotencyKey !== idempotencyKey || result.status !== 'confirmed') bad('Hospital did not acknowledge the requested reservation');
      return { id: result.id, slotId: result.slotId, idempotencyKey: result.idempotencyKey, status: result.status };
    },
    async cancel(reservationId) {
      if (!id(reservationId)) throw new HospitalConnectorError(400, 'A valid reservation ID is required');
      const result = await request(`/bookings/${encodeURIComponent(reservationId)}`, 'DELETE');
      if (!object(result) || result.id !== reservationId || result.status !== 'cancelled') bad('Hospital did not acknowledge reservation cancellation');
      return { id: result.id, status: result.status };
    },
  };
}
