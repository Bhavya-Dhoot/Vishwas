# Vishwas Care Continuity

**From the right desk to the next visit — helping patients complete their planned follow-up.**

Vishwas is a proposed assistive care-coordination platform for diabetes clinics. Before a visit, patients gather records and navigate to the OPD already named in their referral or booking. Between visits, the care team tracks clinician-set follow-up dates, understands practical barriers, helps arrange the next appointment and verifies attendance.

**Applicant:** Bhavya Dhoot

**Track:** Diabetes

**Primary user:** Doctor / Care Team

**Use case:** Patient Follow-up & Continuity of Care

**Current status:** New solution at the concept and submission stage. This repository contains application copy and planning documents. No application, deployment, live WhatsApp integration, ABDM integration, hospital partnership or measured outcome is claimed. The applicant reports an existing pitch deck; it was not provided for review.

## Submission pack

- [Copy-ready application answers](docs/submission.md)
- [Form values and verified length counts](docs/submission.json)
- [Focused build plan, routing boundaries and ABHA approach](docs/build-plan.md)
- [Context for the existing deck and 60-second pitch](docs/pitch-deck-context.md)

## Proposed journey

Staff-confirmed referral or booking → visit preparation → recorded follow-up date → overdue follow-up queue → multilingual logistical support → staff-confirmed return.

A message delivered, patient reply or new booking is progress. A verified visit completes that follow-up.

## Scope

Routing means navigating a hospital directory from an existing referral, booking or staff-confirmed department. It does not mean inferring a specialist from symptoms, lab results or medical history. Missing or unclear routing information goes to staff.

AI is proposed only for administrative voice transcription, logistical-barrier categories and staff-reviewed reply drafts. Medical records are kept outside these AI calls. There are no diagnoses, clinical summaries, risk scores, test suggestions, treatment recommendations or autonomous clinical advice.

ABHA is an optional future integration. The planned demo uses synthetic records and simulated ABHA screens; it does not fetch real records.

## Planned implementation

One Next.js/React application with TypeScript, Node.js route handlers, PostgreSQL and scheduled overdue-date queries. WhatsApp Cloud API and OpenAI speech-to-text/Responses APIs are proposed, with simulated service responses where access is unavailable. See the build plan for what to implement first and what to simulate.

**Primary proposed measure:** The proportion of tracked follow-ups completed within a care-team-defined reporting window, supported by verified attendance. Results remain unmeasured.
