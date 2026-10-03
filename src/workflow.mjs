import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const DAY = '2026-10-03';
const STAMP = `${DAY}T09:00:00.000Z`;
const departments = [
  { id: 'general_medicine', name: 'General Medicine', location: 'Ground floor, Desk A' },
  { id: 'endocrinology', name: 'Endocrinology', location: 'First floor, Desk B' },
  { id: 'neurology', name: 'Neurology', location: 'First floor, Desk C' },
];
const specialists = [
  { id: 'sp_general', name: 'Dr. Mira Shah (Demo)', departmentId: 'general_medicine', languages: ['English', 'Hindi'], room: 'G-01' },
  { id: 'sp_endo', name: 'Dr. Arjun Mehta (Demo)', departmentId: 'endocrinology', languages: ['English', 'Hindi'], room: 'F-02' },
  { id: 'sp_neuro', name: 'Dr. Kavya Rao (Demo)', departmentId: 'neurology', languages: ['English', 'Hindi'], room: 'F-03' },
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
    originalDueDate: dueDate, dueDate, checklist: checklist(), barrier: null, needsHelp: false,
    checkedInAt: null, completedAt: null, attendanceEvidence: null, attendanceConfirmedBy: null, createdAt: STAMP,
  };
}

export function seedState() {
  const bookedSlot = 'sp_general_2026-10-03_morning';
  const booked = episode('episode_booked', 'patient_booked', 'initial', 'general_medicine', 'Front desk (Demo)', 'booked', DAY, bookedSlot);
  booked.checklist[0].ready = true;
  booked.checklist[1].ready = true;
  const followUp = episode('episode_overdue', 'patient_followup', 'follow_up', 'endocrinology', 'Front desk (Demo)', 'ready_to_book', '2026-10-01');
  followUp.checklist[0].ready = true;
  return {
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
function metrics(state) {
  const active = state.episodes.filter(e => e.status !== 'completed');
  const due = state.episodes.filter(e => e.originalDueDate && e.originalDueDate <= state.today);
  return {
    active: active.length,
    needsRouting: active.filter(e => e.status === 'needs_route').length,
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

function apply(state, type, payload) {
  let result = {};
  switch (type) {
    case 'create_patient': {
      fields(payload, ['name', 'language', 'contactConsent', 'caregiverConsent'], ['caregiverName', 'referralNote']);
      const name = nonempty(payload.name, 'name');
      if (!['English', 'Hindi'].includes(payload.language)) invalid('language must be English or Hindi');
      const contactConsent = boolean(payload.contactConsent, 'contactConsent');
      const caregiverConsent = boolean(payload.caregiverConsent, 'caregiverConsent');
      const caregiverName = payload.caregiverName === undefined ? '' : string(payload.caregiverName, 'caregiverName');
      if (caregiverConsent && !caregiverName) invalid('caregiverName is required when caregiverConsent is true');
      const referralNote = payload.referralNote === undefined ? '' : string(payload.referralNote, 'referralNote');
      const patientId = uid('patient'), episodeId = uid('episode');
      state.patients.push({ id: patientId, name, language: payload.language, contactConsent, caregiverConsent, caregiverName, abhaConsent: false, createdAt: now() });
      const newEpisode = episode(episodeId, patientId, 'initial', null, null, 'needs_route', null);
      newEpisode.referralNote = referralNote;
      newEpisode.createdAt = now();
      state.episodes.push(newEpisode);
      log(state, episodeId, type, 'Staff (Demo)', 'Created patient and routing episode');
      result = { patientId, episodeId };
      break;
    }
    case 'confirm_route': {
      fields(payload, ['episodeId', 'departmentId', 'confirmedBy', 'referralNote']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const departmentId = nonempty(payload.departmentId, 'departmentId');
      if (!state.departments.some(d => d.id === departmentId)) invalid('Unknown departmentId');
      const confirmedBy = nonempty(payload.confirmedBy, 'confirmedBy');
      const referralNote = string(payload.referralNote, 'referralNote');
      if (episode.slotId || !['needs_route', 'ready_to_book'].includes(episode.status)) conflict('Route can only be confirmed before first booking');
      episode.departmentId = departmentId;
      episode.routeConfirmedBy = confirmedBy;
      episode.referralNote = referralNote;
      episode.status = 'ready_to_book';
      log(state, episode.id, type, confirmedBy, `Confirmed ${departmentId}`);
      break;
    }
    case 'book': {
      fields(payload, ['episodeId', 'slotId']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const slot = state.slots.find(s => s.id === nonempty(payload.slotId, 'slotId')) ?? missing('Slot not found');
      if (!['ready_to_book', 'booked'].includes(episode.status)) conflict('Episode is not available for booking');
      if (!episode.departmentId || !episode.routeConfirmedBy) conflict('Staff-confirmed route required');
      const specialist = state.specialists.find(s => s.id === slot.specialistId);
      if (specialist?.departmentId !== episode.departmentId) conflict('Slot department does not match confirmed route');
      if (slot.date < state.today) conflict('Cannot book a past slot');
      const occupying = state.episodes.filter(e => e.id !== episode.id && e.slotId === slot.id && ['booked', 'checked_in', 'completed'].includes(e.status)).length;
      if (occupying >= slot.capacity) conflict('Slot is full');
      episode.slotId = slot.id;
      episode.status = 'booked';
      if (episode.kind === 'initial' && !episode.originalDueDate) episode.originalDueDate = episode.dueDate = slot.date;
      log(state, episode.id, type, 'Staff (Demo)', `Booked ${slot.date} ${slot.time} with ${specialist.name}`);
      break;
    }
    case 'checklist': {
      fields(payload, ['episodeId', 'documentId', 'ready']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const item = episode.checklist.find(c => c.id === nonempty(payload.documentId, 'documentId')) ?? missing('Checklist item not found');
      item.ready = boolean(payload.ready, 'ready');
      log(state, episode.id, type, 'Staff (Demo)', `${item.label}: ${item.ready ? 'present' : 'missing'}`);
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
      log(state, episode.id, type, 'Staff (Demo)', 'Patient checked in');
      break;
    }
    case 'complete_visit': {
      fields(payload, ['episodeId', 'confirmedBy', 'evidence'], ['followUpDate']);
      const visit = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const confirmedBy = nonempty(payload.confirmedBy, 'confirmedBy');
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
      log(state, episode.id, type, 'Patient (Demo)', `Barrier: ${payload.barrier}`);
      break;
    }
    case 'approve_message': {
      fields(payload, ['messageId', 'approvedBy']);
      const message = state.messages.find(m => m.id === nonempty(payload.messageId, 'messageId')) ?? missing('Message not found');
      const approvedBy = nonempty(payload.approvedBy, 'approvedBy');
      if (message.direction !== 'outbound' || message.status !== 'draft') conflict('Outbound draft required');
      const patient = getPatient(state, message.patientId);
      if (message.recipient === 'patient' && !patient.contactConsent || message.recipient === 'caregiver' && (!patient.caregiverConsent || !patient.caregiverName)) conflict('Current recipient consent required');
      message.status = 'simulated';
      message.approvedBy = approvedBy;
      log(state, message.episodeId, type, approvedBy, 'Approved simulated administrative reply');
      break;
    }
    case 'resolve_barrier': {
      fields(payload, ['episodeId', 'resolvedBy', 'note']);
      const episode = getEpisode(state, nonempty(payload.episodeId, 'episodeId'));
      const resolvedBy = nonempty(payload.resolvedBy, 'resolvedBy');
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
      log(state, null, type, 'Staff (Demo)', `Consent updated for ${patient.id}`);
      break;
    }
    case 'abha_consent': {
      fields(payload, ['patientId', 'consent']);
      const patient = getPatient(state, nonempty(payload.patientId, 'patientId'));
      patient.abhaConsent = boolean(payload.consent, 'consent');
      log(state, null, type, 'Staff (Demo)', `Simulated ABHA consent ${patient.abhaConsent ? 'enabled' : 'disabled'} for ${patient.id}`);
      break;
    }
    case 'set_date': {
      fields(payload, ['date']);
      state.today = date(payload.date, 'date');
      log(state, null, type, 'Staff (Demo)', `Demo date set to ${state.today}`);
      break;
    }
    case 'reset_demo': {
      fields(payload, []);
      Object.assign(state, seedState());
      break;
    }
    default: invalid(`Unknown action: ${type}`);
  }
  return result;
}

export function createWorkflow(dbPath, { aiMode = 'templates' } = {}) {
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL)');
  const read = db.prepare('SELECT json FROM app_state WHERE id = 1');
  const write = db.prepare('INSERT INTO app_state (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json');
  let state = read.get()?.json;
  state = state ? JSON.parse(state) : seedState();
  if (!read.get()) write.run(JSON.stringify(state));
  function draftFor(current, id) {
    const message = current.messages.find(m => m.id === id) ?? missing('Message not found');
    if (message.direction !== 'outbound' || message.kind !== 'reply' || message.status !== 'draft') conflict('Administrative outbound draft required');
    if (!Object.hasOwn(barrierLabels, message.barrier)) conflict('Draft has no administrative barrier');
    const patient = getPatient(current, message.patientId);
    if (message.recipient === 'patient' && !patient.contactConsent || message.recipient === 'caregiver' && (!patient.caregiverConsent || !patient.caregiverName)) conflict('Current recipient consent required');
    return { message, patient };
  }
  return {
    getState: () => publicState(state, aiMode),
    act(type, payload) {
      if (typeof type !== 'string' || !type) invalid('type must be a nonempty string');
      // ponytail: Whole-state JSON rewrite is fine for this small local demo; normalize tables if record volume grows.
      const next = structuredClone(state);
      const result = apply(next, type, payload);
      write.run(JSON.stringify(next));
      state = next;
      return { ...publicState(state, aiMode), result };
    },
    async enhanceDraft(messageId, generator) {
      const id = nonempty(messageId, 'messageId');
      const { message: original, patient } = draftFor(state, id);
      const revision = original.draftRevision ?? 0;
      const generated = await generator({ barrier: original.barrier, language: patient.language });
      if (!generated || typeof generated.text !== 'string' || !generated.text.trim() || !['openai', 'clinic_template'].includes(generated.source)) throw new Error('Draft generator returned an invalid administrative response');
      const next = structuredClone(state);
      const { message } = draftFor(next, id);
      if ((message.draftRevision ?? 0) !== revision) conflict('Draft changed while enhancement was pending');
      message.text = generated.text.trim();
      message.source = generated.source;
      message.draftRevision = revision + 1;
      log(next, message.episodeId, 'enhance_draft', 'Staff (Demo)', `Administrative draft generated by ${generated.source}`);
      write.run(JSON.stringify(next));
      state = next;
      return { ...publicState(state, aiMode), result: { messageId: id } };
    },
    close: () => db.close(),
  };
}
