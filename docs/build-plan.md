# Vishwas — implementation and next steps

**Core idea:** Begin routing before the patient travels to hospital. A request from home is reviewed remotely, and the specialist, slot, location and checklist reach the patient's view before check-in. The same journey then tracks the follow-up until the patient returns.

**Current stage:** Working local prototype for the Diabetes track. All patients, clinicians, slots and messages are fictional. It runs on one computer and saves an encrypted workflow snapshot in SQLite. This is not a deployed hospital system.

## What works

| Step | Implemented behaviour |
| --- | --- |
| Pre-arrival intake | The patient page accepts a fictional request from home with referral department, language and outreach permission. It creates a staff review task and a session bound to the new patient. |
| Route | Staff confirm the department from an existing referral. Without confirmation, booking is blocked. A missing referral requires staff handling. |
| Match and book | Show specialists in the confirmed department with the chosen language and available slots. Reject another department, past slots and over-capacity bookings. |
| Prepare | Show clinic location, appointment details and a document-presence checklist. No document content is uploaded or interpreted. |
| Arrive | Record check-in, then require staff confirmation and attendance evidence to complete the visit. |
| Plan the return | A clinician-set date opens a separate follow-up. Previous attendance never completes the new visit. |
| Remind | Check due dates every minute while the server runs. Add consented reminders to the simulated inbox, with no duplicate for the same episode, recipient and demo day. |
| Handle barriers | A simulated patient selects a logistical barrier. A template becomes a staff draft. Medical questions receive no automatic draft. Approval and barrier resolution are separate actions. |
| Verify return | Rebooking preserves the original due date. The episode stays open until check-in and staff-attested attendance. |
| Persist | SQLite retains an AES-256-GCM encrypted snapshot of patients, bookings, messages, consent and audit events across restarts; the key is separate. |

The seed contains a patient awaiting routing, a patient booked today and an overdue follow-up. The demonstration clock starts at 3 October 2026; seeded slots cover 3–20 October. Advance the demo clock to exercise due dates without waiting real days.

The patient entry is /?view=patient. The patient must retain the session in that browser; the URL alone is not access. In a separate browser profile, enter the staff demo, confirm the route and book; **Refresh journey** shows the plan to the patient before arrival. After staff create a follow-up, refresh selects that new open episode. Unknown patient links show a new-request screen, not another patient's record. The server checks the session and patient ownership; these are still local synthetic journeys without real-world identity verification. Ordinary tabs share a cookie, so use different browser profiles for the two roles.

## AI connection

The optional OpenAI Responses API adapter is implemented. Set OPENAI_API_KEY and OPENAI_MODEL on the server to enable **Improve draft**. It receives only the chosen logistical-barrier category, language and an approved template. Names, records and patient free text are not sent.

Without credentials or during a provider error, clinic templates keep the workflow usable. Messages record the actual source. AI output stays a staff draft; it never sends, routes, books or marks attendance. The adapter is tested with a mocked provider, not a live model call. Speech transcription and voice delivery are not implemented.

This uses [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Staff still review the content; a schema does not establish accuracy.

## External services

| Connection | Current status | Work required for real use |
| --- | --- | --- |
| WhatsApp | In-app simulation; no phone numbers or real sending | Provider setup, approved messaging flows, delivery callbacks and opt-out handling |
| ABHA / ABDM | Optional simulated consent; no ABHA number or record access | Applicable onboarding, identity/linking flows, patient consent, scoped exchange and revocation |
| Hospital system | Staff input and fictional directory/slots | Approved connections to real appointments, roster and attendance |
| OpenAI | Adapter implemented; unconfigured by default | Server credentials and a supported model; evaluate administrative drafts before a pilot |

No clinical triage, specialty inference from records, test suggestions, clinical risk scores or treatment advice are included. Human approval would not bring those functions into this hackathon's permitted scope.

## Technical choices

Node.js 22.13 or newer serves the browser files and JSON endpoints. Built-in HTTP, filesystem, crypto, fetch and SQLite APIs support plain JavaScript and CSS in the browser. No runtime package dependencies or build step are needed. Run npm start and npm test.

For this small demo, one SQLite row holds an encrypted state snapshot. Each save uses a fresh random nonce; wrong keys, modified ciphertext and legacy plaintext state are rejected. Actions validate and save a cloned state before publishing it. AI drafting rechecks the draft and recipient consent after its asynchronous request. Each draft retains its originating barrier; stale enhancements cannot overwrite a newer version.

The server binds to localhost, accepts validated JSON actions, limits request sizes and checks sessions, anti-forgery tokens, roles and patient ownership. Demo mode deliberately permits synthetic role entry. Protected local mode requires a staff password and supplied key and disables demo entry, reset and date controls. It is an evaluation mode, not production readiness: real identity verification, HTTPS, managed keys, retention controls and approved hosting/data arrangements remain necessary. Use only fictional information. See [security design and blockchain decision](security-design.md).

## ABHA context

ABHA means **Ayushman Bharat Health Account**, under ABDM. It is a voluntary 14-digit identifier, not an insurance entitlement. Linked-record access requires consent; an identifier alone must not be shown as retrieving a medical history. See the [Ministry of Health's ABDM update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068) and [ABHA explainer](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2017129&lang=2&reg=48).

The checkbox records a simulated choice. It can be skipped and does not affect booking. A future integration needs the applicable [ABDM sandbox and onboarding process](https://sandbox.abdm.gov.in/sandbox/v3). Caregiver messaging permission is separate from record-sharing consent.

## Evaluation

Dashboard figures come from synthetic records. Completion rate is completed episodes divided by episodes whose original due date is on or before the demo day, including initial and follow-up visits. It is not a clinical outcome or a measured improvement.

For a pilot, define the cohort and completion window with the clinic. Measure referral-to-booking time, document readiness, registration-to-consultation time if both timestamps exist, staff time per task, and verified follow-up completion. Report transfers, withdrawals and unreachable patients separately. Rescheduling must not erase the original due date. No time-saving percentage or reduction in waiting has been measured.

The next step is a care-team walkthrough, followed by a scoped, supervised pilot if the hospital wants to proceed.
