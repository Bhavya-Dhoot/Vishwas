# Vishwas — focused build plan

**Status:** Proposed work. No feature below is implemented by this submission pack.

**Pilot focus:** One diabetes OPD, an existing referral or booking, English and Hindi communication, and a single follow-up episode. The care team is the primary user. Expand to other conditions only after the workflow is demonstrated.

## Product boundary

| Initial ambition | Submission-safe implementation |
| --- | --- |
| Choose the best specialist from medical history | Navigate from the referral or booking department confirmed by staff |
| Route someone with no referral | Offer a staff assistance request and the hospital directory; no inferred specialty |
| Rank doctors | Filter within the confirmed department by availability, location, language and patient preference; no claim of clinical superiority |
| Suggest tests before arrival | Display a staff-provided document checklist; no generated investigations |
| Prioritise high-risk patients | Sort follow-up tasks by due date, overdue days and unresolved administrative status; no clinical score |
| Interpret the patient record | Store/display documents for authorised human review; no AI clinical extraction or summary |
| Ensure every patient returns | Track barriers and verify attendance; completion is a measured outcome, never a guarantee |

A nurse reviewing an AI test recommendation would still leave a test recommendation in the product. Keep excluded clinical functions out of this build.

## Implement first

1. **Staff entry and confirmation.** Create a synthetic patient, language preference, outreach permission, optional caregiver permission, department, appointment and clinician-set follow-up date. Staff enter or confirm the administrative fields; a model does not infer them from records.
2. **Before-visit checklist.** Show the confirmed OPD location, appointment details and staff-provided document list. Patients can mark documents available. Missing records do not trigger new tests or clinical conclusions.
3. **Follow-up queue.** Compare the current date with the recorded due date and attendance status. Show due, overdue, waiting for reply, needs staff action, rescheduled and completed. Keep the original due date when rescheduling.
4. **Two-way logistical support.** Use English/Hindi administrative templates and a simulated WhatsApp conversation. Let patients indicate travel, cost, work/scheduling, language or caregiver support needs. Staff resolve a task, offer confirmed slots or provide a verified help-desk contact.
5. **Small, useful AI step.** Transcribe a synthetic logistical voice reply, categorise its practical barrier and draft an administrative response using approved clinic information. Staff review before sending. Make the AI call live only when credentials are available; label canned output as simulated.
6. **Verified return.** Staff record attendance evidence and time. Message delivery, a reply, a rescheduling request and a booked slot must never mark the follow-up completed.
7. **Audit and consent.** Record who confirmed routing, edited a due date, approved a message or verified attendance. Honour outreach opt-out and separate caregiver permission.

Free-text and voice can contain health information even when the prompt asks about logistics. In the first demo, use synthetic logistical messages only. For a real pilot, staff screen such messages and approve only administrative excerpts/audio segments for AI processing; clinical or mixed-content questions go directly to the care team without an AI answer. Records, lab values, diagnoses and clinical notes are not model inputs. This is a design requirement, not a claim that a filter can reliably remove every clinical detail.

## Simulate in the hackathon

| Dependency | Honest demo treatment |
| --- | --- |
| ABHA identity and consent | Screens labelled “Simulated ABHA flow — synthetic data”; no real number, OTP or record access |
| Hospital attendance/EMR | Staff attendance confirmation with synthetic evidence; no claim of a live hospital connection |
| WhatsApp delivery | In-app conversation or authorised test setup if available; show simulated/live status |
| Appointment inventory | Small staff-maintained slot list; only confirmed staff actions update a booking |
| Transport/financial support | Care-team task or verified contact; no promise that a ride, funding or eligibility has been secured |

A declined visit, withdrawal or confirmed transfer can have its own outcome; none counts as completed attendance. New follow-ups receive separate episode identifiers so a previous visit cannot complete a later task.

## Minimal architecture

Use one Next.js application for both patient and staff views, with TypeScript and [Node.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers). PostgreSQL stores consent flags, confirmed department, scheduled dates, tasks, message state and audit events. A scheduled database query is sufficient to detect overdue dates; no predictive model is needed.

Use the WhatsApp Cloud API only after account access and applicable messaging permissions are established. Initially, use the simulated inbox and clinic-recorded English/Hindi audio templates.

Use the [OpenAI file-transcription API](https://developers.openai.com/api/docs/guides/speech-to-text) for approved logistical audio and the Responses API with [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) for a small barrier category plus a reply draft. Validate the allowed category and require staff approval; schema compliance does not prove a reply is correct. No fine-tuning, vector database, clinical model or autonomous agent is needed for this demonstration. Keep service keys on the server.

Vercel is the proposed web deployment target with a managed PostgreSQL instance. Real patient use requires an appropriate hosting/data arrangement, access controls, retention settings and consent handling to be implemented and reviewed first. Do not claim certification or legal compliance from this plan.

## ABHA: what it contributes

ABHA stands for **Ayushman Bharat Health Account**, part of ABDM. Its number is a 14-digit health identifier. Sharing linked records is consent-based; the identifier alone is not a password or blanket access to records. ABHA does not establish PM-JAY eligibility. These distinctions are explained by the [NHA overview](https://abdm.gov.in/strapicms/uploads/ABDM_STANDEE_24aabea939.pdf) and [Ministry of Health explainer](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2017129&lang=2&reg=48).

The planned demo offers “Continue without ABHA” and a separate simulated consent flow. It uses no actual health-account number or identity verification. Medical-record sharing permission and permission to message a caregiver are separate.

Future work would use the applicable [ABDM sandbox and onboarding process](https://sandbox.abdm.gov.in/sandbox/v3). The [Government of India explanation hosted by ABDM](https://abdm.gov.in/strapicms/uploads/AU_5642_Z2b_V_Ga_f9035b689e.pdf) describes consent-based exchange, sandbox validation and security audits. Verification of identity, record linking, patient consent, permitted data scope, expiry and revocation would need to be implemented before any real record exchange. This is not a live integration or an assertion of approval.

## Proposed evaluation

**Primary MVP measure:** Follow-up completion rate = tracked follow-up episodes due in the reporting cohort with verified attendance within a care-team-defined window / all tracked follow-up episodes due in that cohort.

Fix the cohort and reporting window before measurement. Keep the original due date visible; rescheduling must not silently remove an overdue episode. Report pending, declined, transferred, unreachable and withdrawn cases separately. Define exclusions in advance and show their counts. Never use reminders sent or replies received as the completion numerator.

**Secondary measures:** Time from patient reply to staff resolution; overdue episodes with an identified logistical barrier; staff minutes per follow-up task; document-checklist completion at check-in. Measure registration-to-consultation waiting time only if both timestamps are captured.

A longer-term measure can track completion of an entire clinician-defined care pathway. One verified return demonstrates a single follow-up episode, not completion of all diabetes care. All metrics are proposals; there are no baseline values, trial results or proven reductions yet.

## Demonstration checks

- No referral or department: show staff assistance, with no inferred specialty.
- New booking or message delivery: keep the episode incomplete.
- Verified attendance: complete only the matching follow-up episode.
- Patient opt-out or missing caregiver permission: prevent that outreach.
- ABHA skipped or external services unavailable: finish the synthetic workflow.
- Clinical question or record upload: keep content out of administrative AI; show staff handling.
- Duplicate overdue check: do not create duplicate outreach tasks.
