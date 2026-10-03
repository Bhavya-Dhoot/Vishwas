# Prototype API contract

Internal implementation contract. Local synthetic-data demonstration only. The browser and external sample hospital service use separate APIs.

Runtime: Node.js 22.13+; built-in HTTP and SQLite. No frontend build step. Server serves public/. `npm start` launches localhost:3000. PORT and DB_PATH are configurable; default bind is 127.0.0.1. Server validation is authoritative. The demo uses fictional data.

GET `/api/state` requires a session. Staff receive the full state below; patients receive only their own records, episodes, documents and non-draft messages, plus the fictional directory and slots. Staff audit and aggregate metrics are omitted from patient responses. POST `/api/actions` accepts `{type,payload}` with the session cookie and `x-csrf-token` from the session response. Successful actions return scoped state plus an optional result. Errors include HTTP 400/401/403/404/409/429/503/504 with `{error:string}`. All IDs are strings. No real messages or clinical inference.

## Sessions

- GET /api/session: public session description {mode,authenticated,role,csrfToken,actor,patientId}. Unauthenticated values are null except mode/authenticated.
- POST /api/session/demo {role:'staff'}: explicit staff demo entry. Demo mode only.
- POST /api/session/demo {role:'patient',patientId}: entry to one of the three seeded fictional patient identities. Demo mode only; not identity verification.
- POST /api/session/login {password}: password-checked staff session in protected local mode; login attempts are limited.
- POST /api/session/patient: accepts the create_patient intake fields below, creates a new patient and returns {session,result}. The resulting cookie is bound to that new patient.
- POST /api/session/logout {}: requires the session and anti-forgery token; invalidates the session.

Cookies are HttpOnly and SameSite=Strict with an eight-hour lifetime. They are local HTTP cookies; HTTPS and Secure cookies are deployment work. The patient ID in a URL is not an authentication credential. Use separate browser profiles for a simultaneous patient/staff demo.

State fields:
- today: YYYY-MM-DD simulated day, seeded 2026-10-03.
- departments: [{id,name,location}]. Seed general_medicine, endocrinology, neurology; no symptom-based selection.
- specialists: [{id,name,departmentId,languages:[English,Hindi],room}]. Fictional roster.
- slots: [{id,specialistId,date,time,capacity}]. Capacity considers active episode bookings; completed visits still occupy the historical slot. Seed slots across 2026-10-03 through 2026-10-20.
- patients: [{id,name,language,contactConsent,caregiverConsent,caregiverName,abhaConsent,createdAt}]. No real phone number or ABHA number collection. name is fictional demo name. Language English/Hindi.
- episodes: [{id,patientId,kind:initial|follow_up,departmentId:null|string,routeConfirmedBy:null|string,referralNote:string,status:needs_route|department_inquiry|coordination_inquiry|awaiting_staff_scheduling|waitlisted|ready_to_book|booked|checked_in|completed,slotId:null|string,routingBasis,routingReason,routingPolicyVersion,scheduleConsent:boolean,preferredDate:null|string,preferredTime:null|string,preferredSpecialistId:null|string,assignedSpecialistId:null|string,schedulingReason,waitlistReason:null|string,inquiryAcceptedAt:null|string,originalDueDate:null|string,dueDate:null|string,checklist:[{id,label,ready}],barrier:null|string,needsHelp:boolean,checkedInAt:null|string,completedAt:null|string,attendanceEvidence:null|string,attendanceConfirmedBy:null|string,createdAt}]. Policy is currently `administrative-v1`. Follow-up dueDate preserves the clinician-set date; display a rescheduled slot date separately.
- messages: [{id,episodeId,patientId,direction:inbound|outbound,recipient:patient|caregiver,kind:reminder|reply|patient_reply,language,text,status:received|draft|simulated,source:clinic_template|patient|staff|openai,approvedBy:null|string,createdAt,reminderKey:null|string}]. Reply drafts additionally retain barrier and draftRevision to prevent stale enhancements. Channel is always a simulated WhatsApp inbox. Clinical questions never receive an automatic advice draft.
- audit: [{id,episodeId:null|string,action,actor,detail,createdAt}]. Newest records first or client sorts.
- metrics: {active,needsRouting,overdue,completed,checkedIn,readyDocuments,completionRate}. completionRate is due cohort completed / due cohort, percentage, null if denominator zero; due cohort excludes future originalDueDate.
- integrations: {whatsapp:simulated,abha:simulated,ai:templates|configured,storage:'Encrypted SQLite'}. Document metadata is returned separately as `documents` in scoped state; content and salt are never included there.

Actions and payloads:
- create_patient: {name,language,contactConsent:boolean,caregiverConsent:boolean,caregiverName?:string,referralNote?:string,departmentId?:string,referralDepartmentLabel?:string,preferredDate?:YYYY-MM-DD,preferredTime?:HH:MM,preferredSpecialistId?:string,scheduleConsent?:boolean}. Valid directory ID or exact normalized department label creates a `department_inquiry`; unknown or missing department creates a `coordination_inquiry`. It returns patient/episode IDs, status, department, routing basis, reason and policy version. No symptoms, lab values or document contents influence the route. Checklist is presence only.
- accept_inquiry: {episodeId,departmentId?:string,preferredSpecialistId?:string}. Staff-only. A coordination inquiry needs a valid department; an inquiry already in a department cannot be moved through acceptance. The first acceptance records staff ownership. With `scheduleConsent:true`, deterministic matching chooses an available same-department clinician who speaks the patient's selected language, honors the preferred clinician/date/time, checks capacity, then orders by earliest date/time, clinician load and stable ID. It books or returns `waitlisted` with a reason. Without consent it returns `awaiting_staff_scheduling`. Exact retries are safe; a waitlisted retry can book if matching capacity appears. The result includes status, slot/clinician IDs, scheduling/waitlist reasons, routing basis and policy version.
- confirm_route: {episodeId,departmentId,referralNote}. Legacy/manual staff route before acceptance and first booking; rejected after an inquiry is accepted. Sets `ready_to_book`.
- book: {episodeId,slotId}. Manual staff booking when no hospital connector is configured. Requires confirmed department, matching specialist, non-past slot and capacity. Initial first booking sets original due date; rescheduling preserves it. When the connector is configured, manual booking/rescheduling is blocked until remote reconciliation is implemented.
- checklist: {episodeId,documentId,ready:boolean}. Known checklist item only; no clinical interpretation.
- check_in: {episodeId}. Require booked and slot date <= today. Set checked_in and timestamp.
- complete_visit: {episodeId,evidence,followUpDate?:YYYY-MM-DD}. Require checked_in, nonempty evidence and a staff session; confirmer comes from that session. Optional followUpDate must be later than today. Mark completed; create a separate follow_up episode when date given, retaining confirmed department and reviewer and new checklist, originalDueDate=dueDate=followUpDate, status ready_to_book, slotId=null. Return result.episodeId for new follow-up if created.
- run_reminders: {}. For open episodes due on/before tomorrow and with confirmed department, consented recipients only. Dedupe by episode+today+recipient; actual delivery stays simulated. Include booked slot or due date; English/Hindi clinic templates. Scheduler invokes same logic every 60sec; tests can disable.
- patient_reply: {episodeId,barrier:travel|cost|work|caregiver|language|booking|medical|other,text?:string}. Stores inbound message, flags needsHelp. Text is logistics-only synthetic demo; no automatic free-text classification. For nonmedical categories draft a category-based administrative response, status draft. For medical, no outbound draft; staff inbox only. No claim that keyword filtering detects all clinical content.
- approve_message: {messageId}. Require staff session, outbound draft and current recipient consent. Approver comes from the session. Set status simulated; never mark visit completed or barrier resolved by sending.
- resolve_barrier: {episodeId,note}. Staff session logs resolution; requires nonempty note. Actor comes from the session; clears needsHelp.
- update_consent: {patientId,contactConsent:boolean,caregiverConsent:boolean,caregiverName?:string}. Caregiver enabled only with name. Approval and reminder generation recheck current flags. Existing history kept.
- abha_consent: {patientId,consent:boolean}. Clearly simulated checkbox, does not retrieve records; optional.
- set_date: {date:YYYY-MM-DD}. Demo staff only. Valid date required; demonstration clock can advance. Do not complete visits or send messages automatically due to date selection.
- reset_demo: {}. Demo staff only. Restores original synthetic seed. UI confirms before resetting user-created demo rows.

Seed: three fictional patients—one legacy route task, one booked today, one overdue follow-up—with usable future slots. Patient names are labelled demo. Newly created requests use the inquiry statuses above. No real healthcare provider or government branding.

Server module exports createApp({dbPath,enableScheduler=false,mode,key,staffPassword}={}) => {server,ready,close}. Await ready before listening; it rejects configuration or encrypted-state failures. server is a Node http.Server; tests listen on port 0. close is async and closes the HTTP server/timer/database. Importing server.mjs does not launch a listener. Running node server.mjs launches it with the scheduler enabled. Protected local mode creates fictional slots over 21 days from first database creation; demo mode retains the fixed October clock.

Patient sessions may perform only checklist, update_consent, abha_consent and patient_reply actions on their own records. All other actions require staff. The public intake endpoint grants access only to the newly created patient. Staff identity fields supplied by a client are rejected rather than trusted.

Security: loopback binding, validated JSON with a size limit, cross-origin write rejection, anti-forgery token, safe static paths, session/ownership checks and AES-256-GCM encrypted snapshots. Default demo storage and protected storage use separate filenames. Keys stay outside the database; plaintext saved state is rejected. Protected mode requires APP_MODE=protected, STAFF_PASSWORD and STATE_KEY; it disables demo entry and controls and seeds no patient data. Both modes are local synthetic-data evaluations, not production hosting or verified patient identity.

## Documents

- POST `/api/documents`: `{patientId,name,mimeType,contentBase64,ledgerConsent?:boolean}`. Session and anti-forgery token required. The server accepts PDF, UTF-8 plain text or valid JSON, 1 byte–2 MiB decoded, at most five files per patient; JSON request limit is 3 MiB. Patient upload is restricted to the current patient; staff may upload for any known patient. Returns 201 `{document}` with metadata, commitment and `anchorStatus`, never bytes or salt.
- GET `/api/documents/:id/download`: authorized staff or owning patient only. Returns an attachment; inaccessible IDs return 404.
- POST `/api/documents/:id/anchor`: retry Fabric anchoring for an explicitly consented upload; returns `{document}`. The saved file remains available if the bridge fails, with `anchor_failed` status.
- POST `/api/documents/:id/verify`: returns `{verified,status,message}`. `verified:true` requires a matching recomputed commitment and a successful Fabric lookup. It does not certify clinical authenticity.
- POST `/api/documents/:id/delete`: removes the encrypted off-chain file and returns `{deleted,ledgerCommitmentRetained,message}`. A commitment already written to Fabric remains.

The documents table stores one AES-256-GCM encrypted envelope per file containing all metadata, raw bytes encoded as base64 and the random salt. The key is outside SQLite. Only the salted commitment reaches Fabric when consented. See [security design](security-design.md).

## Sample hospital connector

Set `HOSPITAL_API_URL` and `HOSPITAL_API_TOKEN` on the server. GET `/api/connector/status` requires staff; POST `/api/connector/sync` requires staff and anti-forgery token, imports departments, clinicians and slots from the sample API. Connected `accept_inquiry` previews a booking, reserves the exact slot remotely with an opaque idempotency key, then commits locally after acknowledgement. Local failure triggers cancellation; failed cancellation is a staff reconciliation error. Reset and manual book/reschedule are blocked while connected. Existing locally booked slots must be reconciled before sync. This is a local sample integration, not a deployed vendor connection. The [sample service contract](../integrations/sample-hospital/README.md) defines its endpoints and token handling. Process crashes between remote acknowledgement and local commit still need a durable recovery process.

Optional AI action: enhance_draft {messageId}. Rewrites a pending administrative draft via the server-side OpenAI adapter if configured; otherwise uses a clinic template. Validate draft and consent again after awaiting the provider; no stale state overwrite. Model receives only a selected administrative barrier and language, never records, names or patient free text. Source identifies the actual generator. No automatic sending.
