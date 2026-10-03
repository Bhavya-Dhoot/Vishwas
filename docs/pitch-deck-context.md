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
| 6. Connect around existing systems | Browser app and Node.js workflow, configurable directory/availability/booking connector, sample hospital API. Real vendors need mapping and validation. | Architecture from architecture-update.md |
| 7. Patient data and verification | AES-256-GCM encrypted records off-chain, server access controls, optional salted commitment on Hyperledger Fabric. Integrity is distinct from medical authenticity. | Encrypted vault → commitment only → Fabric |
| 8. Pilot and evidence | Measure enquiry-to-booking time, staff actions per booking, wrong-desk transfers, preparation readiness and return attendance. Ask for a care-team workflow trial. | Working prototype evidence, GitHub and proposed measures |

## 60-second pitch

A patient should not need to reach the hospital before anyone starts arranging their visit. With Vishwas, a person with diabetes sends a short enquiry from home, including the department named in their referral, supporting documents and appointment preferences. The request reaches that department's inbox automatically. Once the department accepts, Vishwas assigns an available doctor and schedules a compatible slot with the patient's consent. The patient sees where to go, when to arrive and what to bring. A configurable connector exchanges schedules and booking acknowledgements with a sample hospital API. Records stay encrypted off-chain; an optional Hyperledger Fabric commitment supports later integrity checks. After the consultation, clinician-set return dates drive reminders and barrier handling until attendance is confirmed. We are demonstrating this with fictional data. A pilot will measure whether staff handle fewer routine steps and patients arrive with a clearer plan.

## Demonstration sequence

1. Submit a fictional enquiry from home with an explicit referral department and automatic-scheduling consent.
2. Upload a synthetic file and show optional consent to a Fabric commitment.
3. Open the department's inbox and accept once.
4. Show the assigned doctor, compatible slot, booking acknowledgement and patient plan before check-in.
5. Show a missing department entering coordination and an unavailable slot remaining waitlisted.
6. Verify the file against Fabric only after a real successful anchor; show pending/failed status honestly if unavailable.
7. Record attendance and a clinician-set return date; exercise the simulated reminder and barrier flow.
8. Confirm return attendance. A reply or booking alone does not complete the visit.

## Implementation labels

The routing and encrypted document APIs have automated coverage. The interface, sample connector and local Fabric network are being integrated; use docs/verification.md for final evidence before calling the combined flow verified. WhatsApp delivery and ABHA remain simulated. Optional AI drafts administrative replies only; live provider calls remain unverified. There is no live hospital pilot or measured waiting-time improvement.

## Claims to remove

Remove AI diagnosis, clinical triage, specialty selection from symptoms, suggested tests, guaranteed return, medical records on-chain, universal hospital compatibility, live ABDM retrieval and unsupported percentage gains. Use explicit referral routing, one acceptance followed by automatic scheduling, encrypted records off-chain and configurable sample connector.
