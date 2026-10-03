# Vishwas — context for the existing pitch deck

**Applicant:** Bhavya Dhoot

**Track:** Diabetes

**Stage:** New solution; concept and existing deck only before this submission.

**Deck requirement:** 6–8 slides, PDF or PowerPoint, maximum 25 MB.

The existing deck was not supplied for inspection. Use these notes to align it with the application; this file is not a designed presentation.

**One-line pitch:** From the right desk to the next visit — Vishwas helps diabetes care teams guide patients through planned appointments and close the loop on follow-up.

**Differentiator:** One visible follow-up episode connects preparation, permission-based outreach, the patient's practical barrier, staff action and verified attendance. The claim is a product design choice, not a claim that no competitor offers similar features.

## Seven-slide narrative

| Slide | Context to communicate | Suggested visual or evidence |
| --- | --- | --- |
| 1. Vishwas and the problem | Diabetes follow-up requires coordination before and between visits. Name Bhavya Dhoot; identify care teams as the primary users. | One patient journey with a gap after the consultation |
| 2. Where coordination breaks | Patients need the already referred OPD, documents and appointment logistics. Travel, cost, language or caregiver availability can interrupt the return. Staff lack a shared status. | A clearly fictional patient vignette; no invented prevalence or hospital figures |
| 3. The combined solution | Before: confirmed department and readiness checklist. Between visits: due-date tracking, two-way outreach, staff support and verified return. Keep continuity as the main story. | A five-step flow from referral to attendance |
| 4. What the demo will show | A synthetic patient already referred to the diabetes OPD later misses a clinician-set follow-up because of travel. Staff receive the reply, arrange a confirmed appointment and verify attendance. | Label planned screens and simulated messages honestly |
| 5. AI and ABHA boundaries | AI assists with logistical transcription, barrier categories and reply drafts. Optional ABHA is simulated; future sharing requires consent. No triage, clinical record interpretation, risk scoring or test suggestions. | Separate administrative fields, human clinical review and simulated ABHA path |
| 6. How we will build and measure | One Next.js/TypeScript app, PostgreSQL, scheduled checks and proposed messaging/AI APIs. Measure completed follow-ups with attendance evidence; secondary operational metrics. | Small architecture and a metric definition, not fabricated result bars |
| 7. Team, next steps and ask | Bhavya Dhoot; add other members only if confirmed. Build the focused demo, then seek a supervised pilot with one diabetes OPD. Request workflow feedback and a potential pilot conversation. | Verified repository link and clearly labelled future milestones |

## 60-second pitch

Diabetes care continues between OPD visits, but patients are often left to coordinate the next step themselves. They need their records, the department already named in their referral, transport and a workable appointment. Vishwas Care Continuity helps care teams follow that journey. Before arrival, it provides a staff-confirmed OPD and a preparation checklist. Afterwards, it tracks the clinician's follow-up date and supports multilingual WhatsApp outreach. When a patient cannot return, AI helps transcribe a logistical reply, identify the practical barrier and draft a response for staff review. Caregivers participate with permission. The follow-up is completed only after attendance is verified. Our proposed demo uses synthetic data and simulated ABHA consent screens, with no clinical interpretation or treatment advice. We aim to make every planned follow-up visible, actionable and verifiable.

## Demo script for later implementation

1. Show “Demo patient A” with an existing referral confirmed by staff and an English/Hindi preference. Use only synthetic information.
2. Show the OPD location and staff-created checklist. “No confirmed department” leads to staff assistance.
3. Record the clinician-set next-visit date and advance the demonstration clock past that date.
4. Show a simulated reminder and a synthetic logistical reply: “I could not arrange transport.”
5. Show the barrier category, draft administrative reply and staff approval. The reply can offer a verified scheduling contact; it cannot promise transport or funding.
6. Confirm a new slot. The status changes to rescheduled, not completed.
7. Record synthetic attendance evidence. Only then mark the episode completed.
8. Briefly show optional simulated ABHA consent and the option to continue without ABHA.

## Claims to remove from the old deck if present

“AI triage”, “best specialist based on symptoms”, “recommended tests”, “clinical risk prediction”, “medical-record interpretation”, “guaranteed return”, “ABHA automatically retrieves all records”, and any unsupported percentage improvement.

Replace these with referral-based navigation, staff-confirmed dates, logistical assistance, proposed evaluation and clearly labelled mock integrations. Do not claim the deck itself has been reviewed against this checklist.
