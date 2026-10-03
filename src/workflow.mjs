import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { seal, unseal } from './security.mjs';

const DAY = '2026-10-03';
const STAMP = `${DAY}T09:00:00.000Z`;
const ROUTING_POLICY = 'administrative-v1';
const departments = [
  { id: 'general_medicine', name: 'General Medicine', location: 'Ground floor, Desk A' },
  { id: 'endocrinology', name: 'Endocrinology', location: 'First floor, Desk B' },
  { id: 'neurology', name: 'Neurology', location: 'First floor, Desk C' },
];
const specialists = [
  { id: 'sp_general', name: 'Dr. Mira Shah (Demo)', departmentId: 'general_medicine', languages: ['English', 'Hindi'], room: 'G-01' },
  { id: 'sp_general_2', name: 'Dr. Samir Gupta (Demo)', departmentId: 'general_medicine', languages: ['English'], room: 'G-02' },
  { id: 'sp_endo', name: 'Dr. Arjun Mehta (Demo)', departmentId: 'endocrinology', languages: ['English', 'Hindi'], room: 'F-02' },
  { id: 'sp_endo_2', name: 'Dr. Nisha Kapoor (Demo)', departmentId: 'endocrinology', languages: ['English'], room: 'F-04' },
  { id: 'sp_neuro', name: 'Dr. Kavya Rao (Demo)', departmentId: 'neurology', languages: ['English', 'Hindi'], room: 'F-03' },
  { id: 'sp_neuro_2', name: 'Dr. Dev Sen (Demo)', departmentId: 'neurology', languages: ['English'], room: 'F-05' },
];
const slots = [];
for (let day = 3; day <= 20; day++) {
  const date = `2026-10-${String(day).padStart(2, '0')}`;
  for (const specialist of specialists) {
    slots.push({ id: `${specialist.id}_${date}_morning`, specialistId: specialist.id, date, time: '10:00', capacity: 2 });
    slots.push({ id: `${specialist.id}_${date}_afternoon`, specialistId: specialist.id, date, time: '14:00', capacity: 2 });
  }
}

function checklist() {
  return [
    { id: 'referral', label: 'Referral document', ready: false },
    { id: 'reports', label: 'Previous reports', ready: false },
    { id: 'appointment', label: 'Appointment details', ready: false },
  ];
}

function episode(id, patientId, kind, departmentId, routeConfirmedBy, status, dueDate, slotId = null) {
  return {
    id, patientId, kind, departmentId, routeConfirmedBy, referralNote: '', status, slotId,
    routingBasis: departmentId ? 'staff_confirmed' : 'unresolved', routingReason: '', routingPolicyVersion: ROUTING_POLICY,
    scheduleConsent: false, preferredDate: null, preferredTime: null, preferredSpecialistId: null,
    assignedSpecialistId: null, schedulingReason: '', waitlistReason: null, inquiryAcceptedAt: null,
    originalDueDate: dueDate, dueDate, checklist: checklist(), barrier: null, needsHelp: false,
    checkedInAt: null, completedAt: null, attendanceEvidence: null, attendanceConfirmedBy: null, createdAt: STAMP,
  };
}

function routeDepartment(state, departmentId, referralDepartmentLabel) {
  if (departmentId !== undefined) {
    const id = string(departmentId, 'departmentId');
    const department = state.departments.find(d => d.id === id);
    return department ? { departmentId: id, basis: 'structured_department_id', reason: `Explicit referral department ID: ${department.name}` }
      : { departmentId: null, basis: 'unresolved', reason: 'Unrecognized referral department ID; general coordination review required' };
  }
  if (referralDepartmentLabel !== undefined) {
    const label = string(referralDepartmentLabel, 'referralDepartmentLabel').replace(/\s+/g, ' ').toLowerCase();
    const department = state.departments.find(d => d.name.toLowerCase() === label);
    return department ? { departmentId: department.id, basis: 'exact_department_label', reason: `Exact referral department label: ${department.name}` }
      : { departmentId: null, basis: 'unresolved', reason: 'Unrecognized referral department label; general coordination review required' };
  }
  return { departmentId: null, basis: 'unresolved', reason: 'No structured referral department; general coordination review required' };
}

function normalizeState(state) {
  if (state.schemaVersion === 2) return state;
  for (const specialist of specialists) {
    if (!state.specialists.some(s => s.id === specialist.id)) state.specialists.push(structuredClone(specialist));
    const dates = [...new Set(state.slots.map(s => s.date))];
    for (const date of dates) for (const [period, time] of [['morning', '10:00'], ['afternoon', '14:00']]) {
      const id = `${specialist.id}_${date}_${period}`;
      if (!state.slots.some(s => s.id === id)) state.slots.push({ id, specialistId: specialist.id, date, time, capacity: 2 });
    }
  }
  for (const episode of state.episodes) {
    episode.routingBasis ??= episode.departmentId ? 'staff_confirmed' : 'unresolved';
    episode.routingReason ??= episode.departmentId ? 'Department confirmed by staff' : 'General coordination review required';
    episode.routingPolicyVersion ??= ROUTING_POLICY;
    episode.scheduleConsent ??= false;
    episode.preferredDate ??= null;
    episode.preferredTime ??= null;
    episode.preferredSpecialistId ??= null;
    episode.assignedSpecialistId ??= state.slots.find(s => s.id === episode.slotId)?.specialistId ?? null;
    episode.schedulingReason ??= '';
    episode.waitlistReason ??= null;
    episode.inquiryAcceptedAt ??= null;
  }
  state.schemaVersion = 2;
  return state;
}

export function seedState() {
  const bookedSlot = 'sp_general_2026-10-03_morning';
  const booked = episode('episode_booked', 'patient_booked', 'initial', 'general_medicine', 'Front desk (Demo)', 'booked', DAY, bookedSlot);
  booked.assignedSpecialistId = 'sp_general';
  booked.checklist[0].ready = true;
  booked.checklist[1].ready = true;
  const followUp = episode('episode_overdue', 'patient_followup', 'follow_up', 'endocrinology', 'Front desk (Demo)', 'ready_to_book', '2026-10-01');
  followUp.checklist[0].ready = true;
  return {
    schemaVersion: 2,
    today: DAY,
    departments: structuredClone(departments), specialists: structuredClone(specialists), slots: structuredClone(slots),
    patients: [
      { id: 'patient_routing', name: 'Asha Demo', language: 'Hindi', contactConsent: true, caregiverConsent: false, caregiverName: '', abhaConsent: false, createdAt: STAMP },
      { id: 'patient_booked', name: 'Ravi Demo', language: 'English', contactConsent: true, caregiverConsent: true, caregiverName: 'Neha Demo', abhaConsent: false, createdAt: STAMP },
      { id: 'patient_followup', name: 'Meera Demo', language: 'Hindi', contactConsent: true, caregiverConsent: false, caregiverName: '', abhaConsent: false, createdAt: STAMP },
    ],
    episodes: [episode('episode_routing', 'patient_routing', 'initial', null, null, 'needs_route', null), booked, followUp],
    messages: [], audit: [],
    integrations: { whatsapp: 'simulated', abha: 'simulated', ai: 'templates', storage: 'SQLite' },
  };
}

function emptyState() {
  const state = seedState();
  state.today = new Date().toISOString().slice(0, 10);
  state.slots = [];
  for (let offset = 0; offset < 21; offset++) {
    const day = new Date(`${state.today}T00:00:00.000Z`);
    day.setUTCDate(day.getUTCDate() + offset);
    const date = day.toISOString().slice(0, 10);
    for (const specialist of specialists) for (const [period, time] of [['morning', '10:00'], ['afternoon', '14:00']]) {
      state.slots.push({ id: `${specialist.id}_${date}_${period}`, specialistId: specialist.id, date, time, capacity: 2 });
    }
  }
  state.patients = [];
  state.episodes = [];
  return state;
}

export class WorkflowError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const invalid = message => { throw new WorkflowError(400, message); };
const missing = message => { throw new WorkflowError(404, message); };
const conflict = message => { throw new WorkflowError(409, message); };
const uid = prefix => `${prefix}_${randomUUID()}`;
const now = () => new Date().toISOString();
const nonempty = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) invalid(`${field} must be a nonempty string`);
  return value.trim();
};
const string = (value, field) => {
  if (typeof value !== 'string') invalid(`${field} must be a string`);
  return value.trim();
};
const boolean = (value, field) => {
  if (typeof value !== 'boolean') invalid(`${field} must be a boolean`);
  return value;
};
function date(value, field) {
  const parsed = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid(`${field} must be a valid YYYY-MM-DD date`);
  return value;
}
function fields(payload, required, optional = []) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) invalid('payload must be an object');
  for (const field of required) if (!Object.hasOwn(payload, field)) invalid(`${field} is required`);
  for (const field of Object.keys(payload)) if (![...required, ...optional].includes(field)) invalid(`Unknown field: ${field}`);
}
function uniqueIds(items, name) {
  if (!Array.isArray(items)) invalid(`${name} must be an array`);
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) invalid(`${name} entries must be objects`);
    const id = nonempty(item.id, `${name}.id`);
    if (ids.has(id)) invalid(`Duplicate ${name} ID: ${id}`);
    ids.add(id);
  }
  return ids;
}
const getEpisode = (state, id) => state.episodes.find(e => e.id === id) ?? missing('Episode not found');
const getPatient = (state, id) => state.patients.find(p => p.id === id) ?? missing('Patient not found');
function log(state, episodeId, action, actor, detail) {
  state.audit.unshift({ id: uid('audit'), episodeId, action, actor, detail, createdAt: now() });
}
function nextDay(day) {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function chooseSlot(state, inquiry, patient, preferredSpecialistId) {
  const candidates = state.slots.filter(slot => {
    const specialist = state.specialists.find(s => s.id === slot.specialistId);
    if (!specialist || specialist.departmentId !== inquiry.departmentId || !specialist.languages.includes(patient.language)) return false;
    if (preferredSpecialistId && specialist.id !== preferredSpecialistId) return false;
    if (slot.date < state.today || inquiry.preferredDate && slot.date < inquiry.preferredDate) return false;
    if (inquiry.preferredTime && slot.time !== inquiry.preferredTime) return false;
    const occupied = state.episodes.filter(e => e.slotId === slot.id && ['booked', 'checked_in', 'completed'].includes(e.status)).length;
    return occupied < slot.capacity;
  });
  const load = specialistId => state.episodes.filter(e => (e.assignedSpecialistId ?? state.slots.find(s => s.id === e.slotId)?.specialistId) === specialistId && ['booked', 'checked_in'].includes(e.status)).length;
  candidates.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    || load(a.specialistId) - load(b.specialistId) || a.specialistId.localeCompare(b.specialistId) || a.id.localeCompare(b.id));
  return candidates[0] ?? null;
}
function metrics(state) {
  const active = state.episodes.filter(e => e.status !== 'completed');
  const due = state.episodes.filter(e => e.originalDueDate && e.originalDueDate <= state.today);
  return {
    active: active.length,
    needsRouting: active.filter(e => ['needs_route', 'coordination_inquiry', 'department_inquiry'].includes(e.status)).length,
    overdue: active.filter(e => e.dueDate && e.dueDate < state.today).length,
    completed: state.episodes.length - active.length,
    checkedIn: active.filter(e => e.status === 'checked_in').length,
    readyDocuments: state.episodes.reduce((n, e) => n + e.checklist.filter(c => c.ready).length, 0),
    completionRate: due.length ? Math.round(100 * due.filter(e => e.status === 'completed').length / due.length) : null,
  };
}
function publicState(state, aiMode) {
  const view = structuredClone(state);
  view.integrations.ai = aiMode;
  view.integrations.storage = 'Encrypted SQLite';
  return { ...view, metrics: metrics(state) };
}

const barrierLabels = {
  travel: ['travel arrangements', 'यात्रा व्यवस्था'], cost: ['cost or payment questions', 'खर्च या भुगतान संबंधी प्रश्न'],
  work: ['work scheduling', 'काम के समय'], caregiver: ['caregiver coordination', 'देखभाल करने वाले के समन्वय'],
  language: ['language support', 'भाषा सहायता'], booking: ['booking help', 'बुकिंग सहायता'],
  other: ['your administrative concern', 'आपकी प्रशासनिक समस्या'],
};
function reminderText(episode, patient, state) {
  const slot = state.slots.find(s => s.id === episode.slotId);
  const when = slot ? `${slot.date} at ${slot.time}` : episode.dueDate;
  return patient.language === 'Hindi'
    ? `विश्‍वास डेमो: ${when} के लिए आपकी क्लिनिक फॉलो-अप याद दिलाई जा रही है। बुकिंग या यात्रा में सहायता चाहिए तो उत्तर दें। यह केवल एक सिम्युलेटेड संदेश है।`
    : `Vishwas demo: Your clinic follow-up is due ${when}. Reply if you need booking or travel help. This is a simulated message.`;
}
function runReminders(state) {
  let count = 0;
  for (const episode of state.episodes) {
    if (episode.status === 'completed' || !episode.departmentId || !episode.routeConfirmedBy || !episode.dueDate || episode.dueDate > nextDay(state.today)) continue;
    const patient = getPatient(state, episode.patientId);
    for (const recipient of ['patient', 'caregiver']) {
      if (recipient === 'patient' && !patient.contactConsent || recipient === 'caregiver' && (!patient.caregiverConsent || !patient.caregiverName)) continue;
      const key = `${episode.id}:${state.today}:${recipient}`;
      if (state.messages.some(m => m.reminderKey === key)) continue;
      state.messages.unshift({ id: uid('message'), episodeId: episode.id, patientId: patient.id, direction: 'outbound', recipient, kind: 'reminder', language: patient.language, text: reminderText(episode, patient, state), status: 'simulated', source: 'clinic_template', approvedBy: null, createdAt: now(), reminderKey: key });
      count++;
    }
  }
  if (count) log(state, null, 'run_reminders', 'Scheduler/Staff', `${count} simulated reminder(s)`);
  return { count };
}

function apply(state, type, payload, actor, demoMode) {
  let result = {};
  switch (type) {
    case 'import_directory': {
      fields(payload, ['departments', 'specialists', 'slots']);
      const departmentIds = uniqueIds(payload.departments, 'departments');
      const specialistIds = uniqueIds(payload.specialists, 'specialists');
      const slotIds = uniqueIds(payload.slots, 'slots');
      for (const department of payload.departments) {
        fields(department, ['id', 'name', 'location']);
        nonempty(department.name, 'departments.name');
        string(department.location, 'departments.location');
      }
      for (const specialist of payload.specialists) {
        fields(specialist, ['id', 'name', 'departmentId', 'languages', 'room']);
        nonempty(specialist.name, 'specialists.name');
        if (!departmentIds.has(specialist.departmentId)) invalid('Specialist references an unknown department');
        if (!Array.isArray(specialist.languages) || !specialist.languages.length || specialist.languages.some(language => !['English', 'Hindi'].includes(language))) invalid('Specialist languages must contain English or Hindi');
        string(specialist.room, 'specialists.room');
      }
      for (const slot of payload.slots) {
        fields(slot, ['id', 'specialistId', 'date', 'time', 'capacity']);
        if (!specialistIds.has(slot.specialistId)) invalid('Slot references an unknown specialist');
        date(slot.date, 'slots.date');
        if (typeof slot.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time)) invalid('slots.time must be HH:MM');
        if (!Number.isSafeInteger(slot.capacity) || slot.capacity < 1) invalid('slots.capacity must be a positive integer');
      }
      for (const inquiry of state.episodes) {
        if (inquiry.departmentId && !departmentIds.has(inquiry.departmentId)) conflict(`Department ${inquiry.departmentId} is referenced by an episode`);
        if (!inquiry.slotId) continue;
        if (!slotIds.has(inquiry.slotId)) conflict(`Booked slot ${inquiry.slotId} cannot be removed`);
        const oldSlot = state.slots.find(slot => slot.id === inquiry.slotId);
        const newSlot = payload.slots.find(slot => slot.id === inquiry.slotId);
        if (oldSlot.specialistId !== newSlot.specialistId || oldSlot.date !== newSlot.date || oldSlot.time !== newSlot.time) conflict(`Booked slot ${inquiry.slotId} cannot be changed`);
        if (payload.specialists.find(s => s.id === newSlot.specialistId)?.departmentId !== inquiry.departmentId) conflict(`Booked slot ${inquiry.slotId} must remain in its department`);
      }
      for (const slot of payload.slots) {
        const booked = state.episodes.filter(e => e.slotId === slot.id && ['booked', 'checked_in', 'completed'].includes(e.status)).length;
        if (booked > slot.capacity) conflict(`Slot ${slot.id} capacity is below existing bookings`);
      }
      state.departments = structuredClone(payload.departments);
      state.specialists = structuredClone(payload.specialists);
      state.slots = structuredClone(payload.slots);
      log(state, null, type, actor, `Imported ${state.departments.length} departments, ${state.specialists.length} specialists, ${state.slots.length} slots`);
      result = { departments: state.departments.length, specialists: state.specialists.length, slots: state.slots.length };
      break;
    }
    case 'create_patient': {
      fields(payload, ['name', 'language', 'contactConsent', 'caregiverConsent'], ['caregiverName', 'referralNote', 'departmentId', 'referralDepartmentLabel', 'preferredDate', 'preferredTime', 'preferredSpecialistId', 'scheduleConsent']);
      const name = nonempty(payload.name, 'name');
      if (!['English', 'Hindi'].includes(payload.language)) invalid('language must be English or Hindi');
      const contactConsent = boolean(payload.contactConsent, 'contactConsent');
      const caregiverConsent = boolean(payload.caregiverConsent, 'caregiverConsent');
      const caregiverName = payload.caregiverName === undefined ? '' : string(payload.caregiverName, 'caregiverName');
      if (caregiverConsent && !caregiverName) invalid('caregiverName is required when caregiverConsent is true');
      const referralNote = payload.referralNote === undefined ? '' : string(payload.referralNote, 'referralNote');
      const route = routeDepartment(state, payload.departmentId, payload.referralDepartmentLabel);
      const scheduleConsent = payload.scheduleConsent === undefined ? false : boolean(payload.scheduleConsent, 'scheduleConsent');
      const preferredDate = payload.preferredDate === undefined || payload.preferredDate === '' ? null : date(payload.preferredDate, 'preferredDate');
      const preferredTime = payload.preferredTime === undefined || payload.preferredTime === '' ? null : nonempty(payload.preferredTime, 'preferredTime');
      if (preferredTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) invalid('preferredTime must be HH:MM');
      const preferredSpecialistId = payload.preferredSpecialistId === undefined || payload.preferredSpecialistId === '' ? null : nonempty(payload.preferredSpecialistId, 'preferredSpecialistId');
      if (preferredSpecialistId && !state.specialists.some(s => s.id === preferredSpecialistId)) invalid('Unknown preferredSpecialistId');
      const patientId = uid('patient'), episodeId = uid('episode');
      state.patients.push({ id: patientId, name, language: payload.language, contactConsent, caregiverConsent, caregiverName, abhaConsent: false, createdAt: now() });
      const newEpisode = episode(episodeId, patientId, 'initial', route.departmentId, null, route.departmentId ? 'department_inquiry' : 'coordination_inquiry', null);
      newEpisode.referralNote = referralNote;
      Object.assign(newEpisode, { routingBasis: route.basis, routingReason: route.reason, scheduleConsent, preferredDate, preferredTime, preferredSpecialistId });
      newEpisode.createdAt = now();
      state.episodes.push(newEpisode);
      log(state, episodeId, type, actor, `Created ${newEpisode.status}: ${route.reason}`);
      result = { patientId, episodeId, status: newEpisode.status, departmentId: route.departmentId, routingBasis: route.basis, routingReason: route.reason, routingPolicyVersion: ROUTING_POLICY };
      break;
    }
    case 'accept_inquiry': {
      fields(payload, ['episodeId'], ['departmentId', 'preferredSpecialistId']);
      const inquiry = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      if (inquiry.inquiryAcceptedAt) {
        if (payload.departmentId !== undefined && payload.departmentId !== inquiry.departmentId || payload.preferredSpecialistId !== undefined && payload.preferredSpecialistId !== inquiry.preferredSpecialistId) conflict('Accepted inquiry preferences cannot be changed by retry');
        if (inquiry.status === 'waitlisted' && inquiry.scheduleConsent) {
          const slot = chooseSlot(state, inquiry, getPatient(state, inquiry.patientId), inquiry.preferredSpecialistId);
          if (slot) {
            inquiry.status = 'booked';
            inquiry.slotId = slot.id;
            inquiry.assignedSpecialistId = slot.specialistId;
            inquiry.schedulingReason = `Matching slot became available: ${slot.date} ${slot.time}`;
            inquiry.waitlistReason = null;
            if (inquiry.kind === 'initial' && !inquiry.originalDueDate) inquiry.originalDueDate = inquiry.dueDate = slot.date;
            log(state, inquiry.id, 'book_waitlisted', actor, inquiry.schedulingReason);
          }
        }
        result = { episodeId: inquiry.id, status: inquiry.status, slotId: inquiry.slotId, specialistId: inquiry.assignedSpecialistId, schedulingReason: inquiry.schedulingReason, waitlistReason: inquiry.waitlistReason, routingBasis: inquiry.routingBasis, routingPolicyVersion: ROUTING_POLICY };
        break;
      }
      if (!['department_inquiry', 'coordination_inquiry', 'ready_to_book', 'needs_route'].includes(inquiry.status)) conflict('Episode is not awaiting department acceptance');
      const proposedDepartmentId = payload.departmentId === undefined ? inquiry.departmentId : nonempty(payload.departmentId, 'departmentId');
      if (!proposedDepartmentId || !state.departments.some(d => d.id === proposedDepartmentId)) invalid('Valid departmentId required for general coordination inquiry');
      if (inquiry.departmentId && proposedDepartmentId !== inquiry.departmentId) conflict('Inquiry belongs to another department');
      const requestedSpecialistId = payload.preferredSpecialistId === undefined ? inquiry.preferredSpecialistId : nonempty(payload.preferredSpecialistId, 'preferredSpecialistId');
      if (inquiry.preferredSpecialistId && requestedSpecialistId !== inquiry.preferredSpecialistId) conflict('Patient clinician preference cannot be changed during acceptance');
      if (requestedSpecialistId && !state.specialists.some(s => s.id === requestedSpecialistId && s.departmentId === proposedDepartmentId)) invalid('Preferred specialist does not belong to accepted department');
      inquiry.departmentId = proposedDepartmentId;
      inquiry.routeConfirmedBy = actor;
      inquiry.inquiryAcceptedAt = now();
      if (inquiry.routingBasis === 'unresolved') {
        inquiry.routingBasis = 'staff_coordination';
        inquiry.routingReason = `Department selected by coordination staff: ${proposedDepartmentId}`;
      }
      if (payload.preferredSpecialistId !== undefined) inquiry.preferredSpecialistId = requestedSpecialistId;
      const patient = getPatient(state, inquiry.patientId);
      if (!inquiry.scheduleConsent) {
        inquiry.status = 'awaiting_staff_scheduling';
        inquiry.schedulingReason = 'Patient did not consent to earliest matching automatic assignment; staff scheduling required';
      } else {
        const slot = chooseSlot(state, inquiry, patient, requestedSpecialistId);
        if (!slot) {
          inquiry.status = 'waitlisted';
          inquiry.waitlistReason = chooseSlot(state, { ...inquiry, preferredDate: null, preferredTime: null }, patient, null) ? 'patient_preferences' : 'no_matching_capacity';
          inquiry.schedulingReason = inquiry.waitlistReason === 'patient_preferences'
            ? 'Available slots do not match patient date, time or clinician preferences'
            : 'No available slot matches department and patient language';
        } else {
          inquiry.status = 'booked';
          inquiry.slotId = slot.id;
          inquiry.assignedSpecialistId = slot.specialistId;
          inquiry.schedulingReason = `Earliest matching available slot; tie-break by clinician load then stable ID: ${slot.date} ${slot.time}`;
          if (inquiry.kind === 'initial' && !inquiry.originalDueDate) inquiry.originalDueDate = inquiry.dueDate = slot.date;
        }
      }
      log(state, inquiry.id, type, actor, `${proposedDepartmentId}: ${inquiry.schedulingReason}`);
      result = { episodeId: inquiry.id, status: inquiry.status, slotId: inquiry.slotId, specialistId: inquiry.assignedSpecialistId, schedulingReason: inquiry.schedulingReason, waitlistReason: inquiry.waitlistReason, routingBasis: inquiry.routingBasis, routingPolicyVersion: ROUTING_POLICY };
      break;
    }
    case 'confirm_route': {
      fields(payload, ['episodeId', 'departmentId', 'referralNote']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const departmentId = nonempty(payload.departmentId, 'departmentId');
      if (!state.departments.some(d => d.id === departmentId)) invalid('Unknown departmentId');
      const confirmedBy = actor;
      const referralNote = string(payload.referralNote, 'referralNote');
      if (episode.inquiryAcceptedAt) conflict('Accepted inquiry route requires coordination; it cannot be changed by confirm_route');
      if (episode.slotId || !['needs_route', 'ready_to_book', 'coordination_inquiry', 'department_inquiry'].includes(episode.status)) conflict('Route can only be confirmed before first booking');
      episode.departmentId = departmentId;
      episode.routeConfirmedBy = confirmedBy;
      episode.referralNote = referralNote;
      episode.status = 'ready_to_book';
      episode.routingBasis = 'staff_confirmed';
      episode.routingReason = `Staff confirmed department: ${departmentId}`;
      log(state, episode.id, type, confirmedBy, `Confirmed ${departmentId}`);
      break;
    }
    case 'book': {
      fields(payload, ['episodeId', 'slotId']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const slot = state.slots.find(s => s.id === nonempty(payload.slotId, 'slotId')) ?? missing('Slot not found');
      if (!['ready_to_book', 'booked', 'waitlisted', 'awaiting_staff_scheduling'].includes(episode.status)) conflict('Episode is not available for booking');
      if (!episode.departmentId || !episode.routeConfirmedBy) conflict('Staff-confirmed route required');
      const specialist = state.specialists.find(s => s.id === slot.specialistId);
      if (specialist?.departmentId !== episode.departmentId) conflict('Slot department does not match confirmed route');
      if (slot.date < state.today) conflict('Cannot book a past slot');
      const occupying = state.episodes.filter(e => e.id !== episode.id && e.slotId === slot.id && ['booked', 'checked_in', 'completed'].includes(e.status)).length;
      if (occupying >= slot.capacity) conflict('Slot is full');
      episode.slotId = slot.id;
      episode.assignedSpecialistId = specialist.id;
      episode.schedulingReason = `Staff selected ${slot.date} ${slot.time} with ${specialist.name}`;
      episode.status = 'booked';
      if (episode.kind === 'initial' && !episode.originalDueDate) episode.originalDueDate = episode.dueDate = slot.date;
      log(state, episode.id, type, actor, `Booked ${slot.date} ${slot.time} with ${specialist.name}`);
      break;
    }
    case 'checklist': {
      fields(payload, ['episodeId', 'documentId', 'ready']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const item = episode.checklist.find(c => c.id === nonempty(payload.documentId, 'documentId')) ?? missing('Checklist item not found');
      item.ready = boolean(payload.ready, 'ready');
      log(state, episode.id, type, actor, `${item.label}: ${item.ready ? 'present' : 'missing'}`);
      break;
    }
    case 'check_in': {
      fields(payload, ['episodeId']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      if (episode.status !== 'booked') conflict('Booked episode required for check-in');
      const slot = state.slots.find(s => s.id === episode.slotId);
      if (!slot || slot.date > state.today) conflict('Check-in is only available on or after the slot date');
      episode.status = 'checked_in';
      episode.checkedInAt = now();
      log(state, episode.id, type, actor, 'Patient checked in');
      break;
    }
    case 'complete_visit': {
      fields(payload, ['episodeId', 'evidence'], ['followUpDate']);
      const visit = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const confirmedBy = actor;
      const evidence = nonempty(payload.evidence, 'evidence');
      const followUpDate = payload.followUpDate === undefined ? null : date(payload.followUpDate, 'followUpDate');
      if (visit.status !== 'checked_in') conflict('Checked-in episode required to complete visit');
      if (followUpDate && followUpDate <= state.today) invalid('followUpDate must be later than today');
      visit.status = 'completed';
      visit.completedAt = now();
      visit.attendanceEvidence = evidence;
      visit.attendanceConfirmedBy = confirmedBy;
      log(state, visit.id, type, confirmedBy, `Attendance verified: ${evidence}`);
      if (followUpDate) {
        const followUp = episode(uid('episode'), visit.patientId, 'follow_up', visit.departmentId, visit.routeConfirmedBy, 'ready_to_book', followUpDate);
        followUp.scheduleConsent = visit.scheduleConsent;
        followUp.preferredTime = visit.preferredTime;
        followUp.preferredSpecialistId = visit.preferredSpecialistId;
        followUp.routingBasis = 'clinician_follow_up';
        followUp.routingReason = `Clinician-set follow-up department: ${visit.departmentId}`;
        followUp.preferredDate = followUpDate;
        followUp.createdAt = now();
        state.episodes.push(followUp);
        log(state, followUp.id, 'create_follow_up', confirmedBy, `Clinician-set due date ${followUpDate}`);
        result = { episodeId: followUp.id };
      }
      break;
    }
    case 'run_reminders':
      fields(payload, []);
      result = runReminders(state);
      break;
    case 'patient_reply': {
      fields(payload, ['episodeId', 'barrier'], ['text']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      if (episode.status === 'completed') conflict('Completed episodes do not accept replies');
      if (!['travel', 'cost', 'work', 'caregiver', 'language', 'booking', 'medical', 'other'].includes(payload.barrier)) invalid('Unknown barrier');
      const replyText = payload.text === undefined ? '' : string(payload.text, 'text');
      const patient = getPatient(state, episode.patientId);
      state.messages.unshift({ id: uid('message'), episodeId: episode.id, patientId: patient.id, direction: 'inbound', recipient: 'patient', kind: 'patient_reply', language: patient.language, text: replyText || `Barrier selected: ${payload.barrier}`, status: 'received', source: 'patient', approvedBy: null, createdAt: now(), reminderKey: null });
      episode.barrier = payload.barrier;
      episode.needsHelp = true;
      if (payload.barrier !== 'medical') {
        const label = barrierLabels[payload.barrier][patient.language === 'Hindi' ? 1 : 0];
        const text = patient.language === 'Hindi'
          ? `विश्‍वास डेमो: ${label} में सहायता के लिए हमारी टीम आपकी जानकारी देखेगी। यह सिम्युलेटेड प्रशासनिक मसौदा है।`
          : `Vishwas demo: Our team will review your request about ${label}. This is a simulated administrative draft.`;
        state.messages.unshift({ id: uid('message'), episodeId: episode.id, patientId: patient.id, direction: 'outbound', recipient: 'patient', kind: 'reply', barrier: payload.barrier, draftRevision: 0, language: patient.language, text, status: 'draft', source: 'clinic_template', approvedBy: null, createdAt: now(), reminderKey: null });
      }
      log(state, episode.id, type, actor, `Barrier: ${payload.barrier}`);
      break;
    }
    case 'approve_message': {
      fields(payload, ['messageId']);
      const message = state.messages.find(m => m.id === nonempty(payload.messageId, 'messageId')) ?? missing('Message not found');
      const approvedBy = actor;
      if (message.direction !== 'outbound' || message.status !== 'draft') conflict('Outbound draft required');
      const patient = getPatient(state, message.patientId);
      if (message.recipient === 'patient' && !patient.contactConsent || message.recipient === 'caregiver' && (!patient.caregiverConsent || !patient.caregiverName)) conflict('Current recipient consent required');
      message.status = 'simulated';
      message.approvedBy = approvedBy;
      log(state, message.episodeId, type, approvedBy, 'Approved simulated administrative reply');
      break;
    }
    case 'resolve_barrier': {
      fields(payload, ['episodeId', 'note']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const resolvedBy = actor;
      const note = nonempty(payload.note, 'note');
      if (!episode.needsHelp) conflict('No active barrier to resolve');
      episode.needsHelp = false;
      episode.barrier = null;
      log(state, episode.id, type, resolvedBy, note);
      break;
    }
    case 'update_consent': {
      fields(payload, ['patientId', 'contactConsent', 'caregiverConsent'], ['caregiverName']);
      const patient = getPatient(state, nonempty(payload.patientId, 'patientId'));
      const contactConsent = boolean(payload.contactConsent, 'contactConsent');
      const caregiverConsent = boolean(payload.caregiverConsent, 'caregiverConsent');
      const caregiverName = payload.caregiverName === undefined ? patient.caregiverName : string(payload.caregiverName, 'caregiverName');
      if (caregiverConsent && !caregiverName) invalid('caregiverName is required when caregiverConsent is true');
      patient.contactConsent = contactConsent;
      patient.caregiverConsent = caregiverConsent;
      patient.caregiverName = caregiverName;
      log(state, null, type, actor, `Consent updated for ${patient.id}`);
      break;
    }
    case 'abha_consent': {
      fields(payload, ['patientId', 'consent']);
      const patient = getPatient(state, nonempty(payload.patientId, 'patientId'));
      patient.abhaConsent = boolean(payload.consent, 'consent');
      log(state, null, type, actor, `Simulated ABHA consent ${patient.abhaConsent ? 'enabled' : 'disabled'} for ${patient.id}`);
      break;
    }
    case 'set_date': {
      if (!demoMode) invalid('Demo date is unavailable');
      fields(payload, ['date']);
      state.today = date(payload.date, 'date');
      log(state, null, type, actor, `Demo date set to ${state.today}`);
      break;
    }
    case 'reset_demo': {
      if (!demoMode) invalid('Demo reset is unavailable');
      fields(payload, []);
      Object.assign(state, seedState());
      break;
    }
    default: invalid(`Unknown action: ${type}`);
  }
  return result;
}

export function createWorkflow(dbPath, { aiMode = 'templates', key, demoMode = true } = {}) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('A 32-byte state key is required');
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL)');
  const read = db.prepare('SELECT json FROM app_state WHERE id = 1');
  const write = db.prepare('INSERT INTO app_state (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json');
  const proposals = new WeakSet();
  const revision = stored => createHash('sha256').update(stored).digest('hex');
  let state;
  try {
    const stored = read.get()?.json;
    state = stored ? normalizeState(unseal(stored, key)) : (demoMode ? seedState() : emptyState());
    if (!stored) write.run(seal(state, key));
  } catch (error) { db.close(); throw error; }
  function draftFor(current, id) {
    const message = current.messages.find(m => m.id === id) ?? missing('Message not found');
    if (message.direction !== 'outbound' || message.kind !== 'reply' || message.status !== 'draft') conflict('Administrative outbound draft required');
    if (!Object.hasOwn(barrierLabels, message.barrier)) conflict('Draft has no administrative barrier');
    const patient = getPatient(current, message.patientId);
    if (message.recipient === 'patient' && !patient.contactConsent || message.recipient === 'caregiver' && (!patient.caregiverConsent || !patient.caregiverName)) conflict('Current recipient consent required');
    return { message, patient };
  }
  return {
    getState: () => {
      state = normalizeState(unseal(read.get().json, key));
      return publicState(state, aiMode);
    },
    previewAcceptance(payload, actor = 'System') {
      const stored = read.get().json;
      const next = normalizeState(unseal(stored, key));
      const priorStatus = next.episodes.find(e => e.id === payload?.episodeId)?.status;
      const result = apply(next, 'accept_inquiry', payload, actor, demoMode);
      const proposal = { revision: revision(stored), next, result, requiresReservation: result.status === 'booked' && priorStatus !== 'booked' };
      proposals.add(proposal);
      return proposal;
    },
    commitAcceptance(proposal) {
      if (!proposals.has(proposal)) invalid('Unknown acceptance proposal');
      proposals.delete(proposal);
      db.exec('BEGIN IMMEDIATE');
      try {
        if (revision(read.get().json) !== proposal.revision) conflict('Workflow changed after acceptance preview');
        write.run(seal(proposal.next, key));
        db.exec('COMMIT');
        state = proposal.next;
        return { ...publicState(state, aiMode), result: proposal.result };
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    act(type, payload, actor = 'System') {
      if (typeof type !== 'string' || !type) invalid('type must be a nonempty string');
      // ponytail: Whole-state JSON rewrite is fine for this small local demo; normalize tables if record volume grows.
      db.exec('BEGIN IMMEDIATE');
      try {
        const next = normalizeState(unseal(read.get().json, key));
        const result = apply(next, type, payload, actor, demoMode);
        write.run(seal(next, key));
        db.exec('COMMIT');
        state = next;
        return { ...publicState(state, aiMode), result };
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    async enhanceDraft(messageId, generator, actor = 'System') {
      const id = nonempty(messageId, 'messageId');
      const { message: original, patient } = draftFor(normalizeState(unseal(read.get().json, key)), id);
      const revision = original.draftRevision ?? 0;
      const generated = await generator({ barrier: original.barrier, language: patient.language });
      if (!generated || typeof generated.text !== 'string' || !generated.text.trim() || !['openai', 'clinic_template'].includes(generated.source)) throw new Error('Draft generator returned an invalid administrative response');
      db.exec('BEGIN IMMEDIATE');
      try {
        const next = normalizeState(unseal(read.get().json, key));
        const { message } = draftFor(next, id);
        if ((message.draftRevision ?? 0) !== revision) conflict('Draft changed while enhancement was pending');
        message.text = generated.text.trim();
        message.source = generated.source;
        message.draftRevision = revision + 1;
        log(next, message.episodeId, 'enhance_draft', actor, `Administrative draft generated by ${generated.source}`);
        write.run(seal(next, key));
        db.exec('COMMIT');
        state = next;
        return { ...publicState(state, aiMode), result: { messageId: id } };
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close: () => db.close(),
  };
}
