# Prototype API contract

Internal implementation contract. Local synthetic-data demonstration only.

Runtime: Node.js 22.13+; built-in HTTP and SQLite. No frontend build step. Server serves public/. npm start launches localhost:3000. PORT and DB_PATH configurable. Default bind 127.0.0.1. package type module. Authoritative server validation, persisted state, no patient data in Git.

GET /api/state returns the full state below. POST /api/actions accepts {type, payload}. Successful actions return full state plus optional result object, e.g. {patientId, episodeId}. Errors use HTTP 400/404/409 and {error:string}. All IDs strings. Never send real messages. No clinical inference.

State fields:
- today: YYYY-MM-DD simulated day, seeded 2026-10-03.
- departments: [{id,name,location}]. Seed general_medicine, endocrinology, neurology; no symptom-based selection.
- specialists: [{id,name,departmentId,languages:[English,Hindi],room}]. Fictional roster.
- slots: [{id,specialistId,date,time,capacity}]. Capacity considers active episode bookings; completed visits still occupy the historical slot. Seed slots across 2026-10-03 through 2026-10-20.
- patients: [{id,name,language,contactConsent,caregiverConsent,caregiverName,abhaConsent,createdAt}]. No real phone number or ABHA number collection. name is fictional demo name. Language English/Hindi.
- episodes: [{id,patientId,kind:initial|follow_up,departmentId:null|string,routeConfirmedBy:null|string,referralNote:string,status:needs_route|ready_to_book|booked|checked_in|completed,slotId:null|string,originalDueDate:null|string,dueDate:null|string,checklist:[{id,label,ready}],barrier:null|string,needsHelp:boolean,checkedInAt:null|string,completedAt:null|string,attendanceEvidence:null|string,attendanceConfirmedBy:null|string,createdAt}]. Follow-up dueDate preserved as clinician-set date; display rescheduled slot.date separately. Original due date never moves.
- messages: [{id,episodeId,patientId,direction:inbound|outbound,recipient:patient|caregiver,kind:reminder|reply|patient_reply,language,text,status:received|draft|simulated,source:clinic_template|patient|staff|openai,approvedBy:null|string,createdAt,reminderKey:null|string}]. Channel is always a simulated WhatsApp inbox. Clinical questions never receive an automatic advice draft.
- audit: [{id,episodeId:null|string,action,actor,detail,createdAt}]. Newest records first or client sorts.
- metrics: {active,needsRouting,overdue,completed,checkedIn,readyDocuments,completionRate}. completionRate is due cohort completed / due cohort, percentage, null if denominator zero; due cohort excludes future originalDueDate.
- integrations: {whatsapp:simulated,abha:simulated,ai:templates|configured,storage:SQLite}.

Actions and payloads:
- create_patient: {name,language,contactConsent:boolean,caregiverConsent:boolean,caregiverName?:string,referralNote?:string}. Creates patient and initial needs_route episode, returns result.patientId and result.episodeId. Checklist is Referral document, Previous reports, Appointment details (presence only). No freeform medical record upload.
- confirm_route: {episodeId,departmentId,confirmedBy,referralNote}. Staff-reviewed department required; confirmedBy nonempty. Do not accept completed or already booked episodes for rerouting; before first booking only. Set ready_to_book.
- book: {episodeId,slotId}. Route must be confirmed, selected specialist department must match, slot not in past, capacity enforced. Can reschedule booked episode, never completed/checked_in. Set booked. For initial episode, first booking sets originalDueDate and dueDate; preserve both on reschedule. Follow-ups retain clinician-set originalDueDate.
- checklist: {episodeId,documentId,ready:boolean}. Known checklist item only; no clinical interpretation.
- check_in: {episodeId}. Require booked and slot date <= today. Set checked_in and timestamp.
- complete_visit: {episodeId,confirmedBy,evidence,followUpDate?:YYYY-MM-DD}. Require checked_in and nonempty evidence/confirmedBy. Optional followUpDate must be later than today. Mark completed; create a separate follow_up episode when date given, retaining confirmed department and reviewer and new checklist, originalDueDate=dueDate=followUpDate, status ready_to_book, slotId=null. Return result.episodeId for new follow-up if created.
- run_reminders: {}. For open episodes due on/before tomorrow and with confirmed department, consented recipients only. Dedupe by episode+today+recipient; actual delivery stays simulated. Include booked slot or due date; English/Hindi clinic templates. Scheduler invokes same logic every 60sec; tests can disable.
- patient_reply: {episodeId,barrier:travel|cost|work|caregiver|language|booking|medical|other,text?:string}. Stores inbound message, flags needsHelp. Text is logistics-only synthetic demo; no automatic free-text classification. For nonmedical categories draft a category-based administrative response, status draft. For medical, no outbound draft; staff inbox only. No claim that keyword filtering detects all clinical content.
- approve_message: {messageId,approvedBy}. Require outbound draft, nonempty reviewer and current recipient consent. Set status simulated; never mark visit completed or barrier resolved by sending.
- resolve_barrier: {episodeId,resolvedBy,note}. Staff log resolution; requires nonempty fields. clears needsHelp.
- update_consent: {patientId,contactConsent:boolean,caregiverConsent:boolean,caregiverName?:string}. Caregiver enabled only with name. Approval and reminder generation recheck current flags. Existing history kept.
- abha_consent: {patientId,consent:boolean}. Clearly simulated checkbox, does not retrieve records; optional.
- set_date: {date:YYYY-MM-DD}. Valid date required; demonstration clock can advance. Do not complete visits or send messages automatically due to date selection.
- reset_demo: {}. Restores original synthetic seed only. UI confirms before resetting user-created demo rows.

Seed 3 fictional patients: one needing route, one booked today, one overdue follow-up with confirmed route; usable future slots. Patient names labelled demo. No real healthcare provider or government branding.

Server module must export createApp({dbPath,enableScheduler=false}={}) => {server,close}, where server is a Node http.Server; tests listen on port 0; close is async and closes HTTP server/timer/database. Importing server.mjs must not launch a listener. Running node server.mjs launches the listener with scheduler enabled.

Staff role switch is a demo view, not authentication. Visible synthetic-data notice. Security: local binding, reject non-JSON bodies, size limit, no CORS wildcard, reject cross-origin writes, safe static-file paths, strict action field validation. Persistence is not production readiness.

Optional AI action: enhance_draft {messageId}. Rewrites a pending administrative draft via the server-side OpenAI adapter if configured; otherwise uses a clinic template. Validate draft and consent again after awaiting the provider; no stale state overwrite. Model receives only a selected administrative barrier and language, never records, names or patient free text. Source identifies the actual generator. No automatic sending.
