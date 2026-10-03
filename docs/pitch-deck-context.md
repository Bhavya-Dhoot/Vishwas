# Vishwas — content for the existing pitch deck

**Bhavya Dhoot · Diabetes · Doctor / Care Team · Clinic Operations & Patient Flow**

The form requires 6–8 slides, PDF or PowerPoint, maximum 25 MB. The existing deck was not supplied. These are content notes, not a designed or reviewed presentation.

**Core idea:** The hospital visit starts at home. A patient provides their existing referral department, supporting files and appointment preferences. Rules send the enquiry to the department's inbox. One acceptance triggers doctor assignment and scheduling. After attendance, the same journey tracks the clinician's return date, reminders, practical barriers and confirmed return attendance.

**One-line pitch:** From a referral at home to an arranged hospital visit—and a follow-up that stays visible.

## Eight-slide narrative

| Slide | Main content | Suggested visual |
| --- | --- | --- |
| 1. Vishwas | The hospital visit starts at home. Bhavya Dhoot; Diabetes track. | Home → department → appointment → return visit |
| 2. The coordination gap | A referral does not always come with a confirmed doctor, slot or clear arrival instructions. Staff repeat sorting, booking and follow-up calls. | A fictional patient's referral, schedule and reminders |
| 3. From home to the department | A short enquiry captures the existing referral department, language, preferences and documents. Rules route known departments; unclear requests go to coordination. | Actual enquiry and department inbox |
| 4. Accept once, arrange the visit | One department acceptance triggers doctor and slot matching with patient consent. A booking acknowledgement produces the arrival plan; unavailable slots remain exceptions. | Accept → doctor/time → patient plan |
| 5. Keep the next visit visible | Clinician-set dates trigger consented reminders. Patients report practical barriers. Attendance, rather than a message or reschedule, closes the visit. | Initial and follow-up episodes; simulated message labelled |
| 6. Integration and patient data | The full local prototype has encrypted uploads, a sample hospital API, named staff access, booking recovery and optional local Fabric integrity receipts. The hosted public preview uses disposable in-memory state with uploads and connectors disabled. Real vendors need validation. | Two labeled boundaries: public preview and local connected prototype |
| 7. How hospitals buy Vishwas | Hospital administrator pays; patients use it free. Proposed ₹40,000 pilot, ₹20,000/site/month subscription and separately scoped ₹60,000 integration. Credit the pilot against the first annual term, including the pilot period. Usage is separate. | Revenue model with subscription, integration and optional shared-ledger operation; label prices unvalidated |
| 8. Pilot and evidence | Show the [public preview](https://vishwas-care-demo.vercel.app), [supporting PDF](https://vishwas-care-demo.vercel.app/Vishwas-Supporting-Document.pdf) and [research references](https://github.com/Bhavya-Dhoot/Vishwas/blob/main/docs/research-references.md). Measure enquiry-to-booking time, staff actions, wrong-desk transfers and return attendance in a proposed pilot. | Public preview plus local verification, clearly labeled |

For slide 7, use [the business model](business-model.md). Its prices and financial examples are proposals to test with buyers. There are no paying customers or measured ROI. Integration and security now share slide 6 so the deck remains at eight slides.

## Problem-statement slide copy

- Patients can arrive without a confirmed department, specialist or appointment.
- Staff repeatedly check availability and coordinate bookings across calls and registers.
- Unclear directions, missing documents and desk transfers can delay consultation.
- Missed returns and travel, work or language barriers can go unnoticed between visits.
- Enquiries, records, bookings and follow-up updates are fragmented.

Closing line: “Care coordination should begin at home and continue until the planned visit is completed.”

## 60-second pitch

A patient should not need to reach the hospital before anyone starts arranging their visit. With Vishwas, a person with diabetes sends a short enquiry from home, including the department named in their referral and appointment preferences. The request reaches that department's inbox automatically. Once the department accepts, Vishwas assigns an available doctor and schedules a compatible slot with the patient's consent. The patient sees where to go, when to arrive and what to bring. Our public preview demonstrates this flow with fictional, disposable data. The fuller local prototype also encrypts supporting files, exchanges bookings with a sample hospital API and verifies consented commitments on a local Fabric network. After the consultation, clinician-set return dates drive reminders and barrier handling until attendance is confirmed. A hospital pilot will test whether this saves staff work and gives patients a clearer plan.

## Demonstration sequence

Use the local connected prototype for steps involving uploads, the sample hospital API or Fabric. The hosted preview covers the fictional enquiry and scheduling flow only.

1. Submit a fictional enquiry from home with an explicit referral department and automatic-scheduling consent.
2. Upload a synthetic file and show optional consent to a Fabric commitment.
3. Open the department's inbox and accept once.
4. Show the assigned doctor, compatible slot, booking acknowledgement and patient plan before check-in.
5. Show a missing department entering coordination and an unavailable slot remaining waitlisted.
6. Verify the file against Fabric only after a real successful anchor; show pending/failed status honestly if unavailable.
7. Record attendance and a clinician-set return date; exercise the simulated reminder and barrier flow.
8. Confirm return attendance. A reply or booking alone does not complete the visit.

## Implementation labels

The [hosted public preview](https://vishwas-care-demo.vercel.app) demonstrates the fictional enquiry and scheduling flow. It uses visitor-isolated in-memory SQLite; sessions may reset across Vercel cold starts or routing. Uploads are disabled, and it has no hospital API, Fabric, live WhatsApp, ABHA or cloud AI connection. The fuller local prototype has encrypted uploads and sample API booking; a real local Fabric transaction and a connected journey through confirmed return passed. See [verification](verification.md) and [connected proof](connected-proof.json). All 43 automated tests passed, including public-adapter isolation and unsafe-write rejection. The hosted browser journey through confirmed return also passed. There is no hospital pilot or measured waiting-time improvement.

## Claims to remove

Remove AI diagnosis, clinical triage, specialty selection from symptoms, suggested tests, guaranteed return, medical records on-chain, universal hospital compatibility, live ABDM retrieval and unsupported percentage gains. Do not show the hosted preview as an upload, Fabric or hospital-integration demonstration. Use explicit referral routing, one acceptance followed by automatic scheduling, and label the connected local prototype separately.
