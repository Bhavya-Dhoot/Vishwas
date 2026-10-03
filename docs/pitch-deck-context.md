# Vishwas — context for the existing pitch deck

**Applicant:** Bhavya Dhoot

**Track:** Diabetes

**Primary user:** Doctor / Care Team

**Closest heading:** Clinic Operations & Patient Flow
**Stage:** New solution with a small local prototype prepared for this submission; fictional patients and simulated integrations.

**Deck requirement:** 6–8 slides, PDF or PowerPoint, maximum 25 MB.

The existing deck was not supplied for inspection. These notes align its story with the application; this file is not a designed presentation.

**One-line pitch:** Vishwas helps patients request a referral appointment from home and gives the care team one view through arrival and follow-up.

**What connects the workflow:** The patient starts a request before travel. Staff review the referral department remotely, book an available specialist and share the slot, location and document checklist with the patient before arrival. Check-in and a clinician-set return date lead to a separate follow-up for consent-based reminders and staff handling of practical barriers. This is a product design, not a measured outcome or a claim of uniqueness.

## Seven-slide narrative

| Slide | Point to make | Suggested visual or evidence |
| --- | --- | --- |
| 1. Vishwas | Bhavya Dhoot; Diabetes track; care teams as the primary user. A patient starts a referral request from home. | One fictional journey from home to clinic |
| 2. Before travelling | A referral can name a department while specialist availability, directions and document preparation remain scattered. Settling these details after arrival can mean a wrong queue or another trip. | Fictional patient at home with a referral; no invented hospital figures |
| 3. Preparing the first visit | Staff review the referral department remotely. The team compares specialists in that department by language and slots, books one, and the patient sees the time, location and document-presence checklist before travelling. | Patient request, staff review, booking and patient plan while check-in is still pending |
| 4. The return visit | After verified check-in and attendance, a clinician-set return date creates a separate follow-up. Consent-based reminders appear in a simulated WhatsApp inbox. | Timeline with initial and follow-up episodes |
| 5. When a patient cannot return | The patient reports a practical barrier; staff review an administrative reply, help with booking and confirm attendance later. A message or reschedule is not completion. | Fictional travel barrier and staff action |
| 6. Prototype and limits | Local Node.js, SQLite and browser prototype; synthetic records; simulated WhatsApp and ABHA consent. Optional OpenAI drafting adapter is unconfigured and uses clinic templates without it. No clinical inference or advice. | Small architecture and clear simulated labels |
| 7. Next steps | Use the verified pre-arrival demo for care-team feedback and consider a supervised pilot. Do not show fabricated patient outcomes. | Repository link and proposed evaluation measures |

## 60-second pitch

Before travelling to the hospital, a patient with diabetes submits a visit request with their referral department and language in Vishwas. Clinic staff review the referral department remotely. They compare available specialists in that department by language and slot, then book one. The patient can see the appointment time, clinic location and a short checklist before leaving home. No medical record is uploaded or interpreted; the checklist only marks whether papers are present. Staff verify check-in and attendance at the clinic. If the clinician sets a return date, Vishwas opens a separate follow-up and creates consent-based reminders in a simulated WhatsApp inbox. When travel, work or another practical barrier gets in the way, staff can review an administrative reply and help rebook. The local prototype uses fictional data. It does not choose a specialty from symptoms or give clinical advice.

## Demo script for the local prototype

1. In the patient view, create a fictional request from home with a referral note. Do not upload medical records or infer a specialty from symptoms.
2. In the staff view, review and confirm the referral department remotely. Compare specialists in that department by English or Hindi preference and slot availability, then book an available slot.
3. Return to the patient's journey to show the booked time, clinic location and checklist before arrival, while check-in is still pending. Mark only whether referral papers, previous reports and appointment details are present.
4. At the clinic, record check-in and staff-confirmed attendance for the initial visit. Enter a clinician-set follow-up date.
5. Advance the demonstration date. Show a consent-based reminder in the simulated WhatsApp inbox.
6. Record a fictional logistical reply, such as “I could not arrange transport.” Show the administrative draft for staff approval. A medical question goes to staff without an automatic advice draft.
7. Reschedule if needed. Show that the episode stays open until check-in and attendance are verified.
8. Show optional simulated ABHA consent. Do not imply that it retrieves records.

## Claims to remove from the old deck if present

Remove “AI triage”, “best specialist based on symptoms”, “recommended tests”, “clinical risk prediction”, “medical-record interpretation”, “guaranteed return”, “ABHA automatically retrieves all records” and unsupported percentage improvements. Avoid claims of live WhatsApp, ABDM, OpenAI or hospital integrations, a deployed app, or measured outcomes.

Use the actual local stack and label all synthetic data and simulated steps. The existing deck has not been checked against this list.
