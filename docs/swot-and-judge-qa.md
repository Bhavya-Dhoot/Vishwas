# Vishwas — SWOT and jury questions

**One-line answer:** Vishwas helps a care team turn a patient's referral request into a confirmed specialist appointment **before the patient travels**, then keeps the clinician-set return visit visible until attendance is verified.

Use the answers in your own voice. The local demo contains fictional people, clinicians, slots and messages. It is a clinic operations workflow for the Diabetes track, not a clinical decision system or a deployed service.

## SWOT

| | What a judge should hear |
| --- | --- |
| **Strengths** | The workflow begins at home, before the hospital queue. Staff confirm the referral department; matching then uses department, language, slot and capacity. The patient receives a location and document-presence checklist. Attendance requires a separate staff action, and a clinician-set return creates a new episode with its original due date preserved. These steps run in the local prototype. |
| **Weaknesses** | There is no hospital pilot, real clinician directory, public patient identity check, live WhatsApp delivery or ABDM connection. Local session controls do not verify who a person is in the real world, and protected mode has one shared staff account. The checklist records presence, not whether a document is sufficient. Staff still have to review requests and handle exceptions. |
| **Opportunities** | A clinic could test whether pre-arrival confirmation reduces wrong-desk visits and repeated calls, and whether staff can see and resolve follow-up barriers earlier. A later integration could connect actual roster, booking, check-in and approved messaging systems. These are hypotheses for a supervised pilot, not measured gains. |
| **Threats** | Wrong referral details, stale slot data, shared phones, limited connectivity, consent withdrawal, message delivery failure and staff overload could make a real workflow unreliable. Hospital procurement, integration and data-governance requirements could slow adoption. A pilot needs safe fallbacks and measured staff workload as well as patient outcomes. |

## What can be claimed today

| Claim | Evidence and exact status | Say this in the room |
| --- | --- | --- |
| Pre-arrival coordination works | [Verification](verification.md) records a two-browser local walkthrough: patient submits, staff confirms and books, patient sees specialist, time, room, location and checklist before check-in. | “We can demonstrate the before-arrival handoff locally.” |
| Booking respects constraints | Automated tests cover confirmed department, slot capacity, past-slot rejection and invalid transitions. | “The prototype enforces these booking rules against fictional slots.” |
| Return visits stay accountable | Tests and browser walkthrough confirm a distinct follow-up episode, unchanged original due date and staff-attested return attendance. | “A reminder or rebooking does not count as a completed visit.” |
| Outreach is consent-aware | Tests cover patient/caregiver consent, draft approval and rechecking consent before simulated sending. The inbox is local. | “We simulate outreach and test consent checks; we do not send WhatsApp messages.” |
| AI is bounded | Optional administrative draft adapter was tested with mocked provider responses; the default clinic template works without a key. Live model output was not evaluated. | “AI can help draft a logistical reply for staff review. It makes no clinical decision.” |
| ABHA is optional | The prototype has a simulated consent choice. No ABHA number or record is fetched. | “ABHA is a possible later connection, not part of this live demo.” |
| Benefit and scale | No hospital pilot, time saving, waiting-time reduction, clinical outcome or production throughput has been measured. Dashboard counts use synthetic data. | “Those are pilot questions, not results.” |
| Existing work declaration | The concept and deck preceded this work; the local prototype was built during submission preparation. There was no previously launched product. | “Select **No — we are building a new solution** and disclose the prototype transparently.” |

## Likely jury questions and ready answers

### Problem and differentiation

1. **What is the problem in one sentence?** A patient may have a referral but still lack a confirmed specialist, slot, clinic location and preparation details before leaving home; the return visit can then get lost in a separate process.

2. **Why focus on diabetes if you do not give medical advice?** People with diabetes may have repeated specialist visits. We address the operational handoffs around those visits. The clinician owns the medical plan and sets the return date.

3. **Is this just an appointment booking app?** Booking is one step. Vishwas starts with staff review of a referral, shows the patient the arrival plan, records attendance, and opens a separate return episode that stays visible until the person actually comes back.

4. **How is it different from a hospital information system or a reminder product?** Many systems already hold appointments or send reminders. Our proposed value is the connected, pre-arrival handoff from referral review to verified return. We would integrate with a hospital's existing systems rather than ask staff to maintain a parallel calendar indefinitely.

5. **What is genuinely new here?** The product hypothesis is that resolving department, language, capacity, location and document readiness before travel, then tracking the original return due date, can close an operational gap. The prototype proves the workflow can be demonstrated; novelty and impact still need comparison in a clinic pilot.

6. **Who uses it and who benefits?** A coordinator, nurse or OPD team operates the queue. A patient or consented caregiver starts and checks the journey. Clinicians set the medical follow-up date; they do not need to use an AI recommendation.

### Workflow and edge cases

7. **How do you route a patient safely?** The patient supplies the department named on an existing referral, or leaves it for review. Staff confirm the department before any booking. The software does not infer a specialty from symptoms or records.

8. **What if there is no referral, or the department is unclear?** The request remains for staff review. A coordinator must obtain clarification through the clinic's normal process; the prototype does not guess a department.

9. **What if the patient chose the wrong department?** Staff correct and confirm the route before booking. Once booked, a real clinic would need a documented transfer workflow; that is not proven by this prototype.

10. **How do you prevent overbooking?** A booking must match the confirmed department, use a non-past slot and respect the fictional slot's capacity. In a real hospital, the source of truth would have to be its current roster and booking system.

11. **How does language matching work?** The demo filters fictional specialists by their listed English/Hindi languages and available slots. This is a service preference, not a guarantee that every clinician or message will be understood; staff must handle cases with no match.

12. **What does the preparation checklist verify?** Only whether referral papers, previous reports and appointment details are present. It neither uploads nor reads those documents, and it cannot certify that they are clinically sufficient.

13. **How do you know the patient attended?** The demo requires check-in plus staff confirmation with attendance evidence. Rebooking, a reply or a sent reminder never closes the episode. A hospital pilot would connect an approved attendance source.

14. **What if a patient misses or postpones the return?** The episode remains open. Staff can rebook while the clinician-set original due date remains available for reporting. A new clinical due date would require the clinician's decision; the app should not silently move it.

15. **What happens when a patient reports a barrier?** The demo records a selected logistical category such as travel, work or booking, prepares a staff-reviewed administrative draft, and leaves resolution as a separate staff action. It does not claim that sending a message solved the barrier.

### Clinical boundary, accuracy and trust

16. **Does the AI triage patients or suggest tests?** No. It does not diagnose, infer a department from symptoms, read records, score risk, suggest investigations or treatment, or decide urgency. A medical question gets no automatic advice draft.

17. **What exactly does AI do?** If configured, it can reword an approved template for a selected logistical-barrier category and language. Staff review the draft before simulated sending. Clinic templates provide the same workflow without a model.

18. **How do you control hallucinations or unsafe messages?** We constrain inputs to an administrative category and template, keep output as a draft, and require staff approval. That reduces risk but does not prove message accuracy; a live provider and real-language evaluation are still needed.

19. **Can a patient type a medical emergency into the inbox?** Free text is not reliably classified as safe. In the demo, the explicit medical category creates no reply draft and goes to staff. A real service needs a staffed escalation policy and clear emergency instructions before accepting live messages.

20. **Why should patients trust the plan?** The plan shows a staff-confirmed department and a booked fictional slot, rather than an algorithmic medical recommendation. For deployment, trust also depends on current hospital schedules, verified identity, clear consent, accessible language and a reachable staff contact.

### Privacy, consent and access

21. **What personal data does the prototype use?** Fictional names and journey state in local SQLite. It does not collect real phone numbers or ABHA numbers, upload medical records, or send real WhatsApp messages. Only synthetic data should be entered.

22. **Can a caregiver receive reminders automatically?** No. Caregiver permission is separate from patient outreach permission, and the recipient's current consent is checked before a simulated message is approved. In a pilot, the clinic must verify the caregiver relationship and contact channel.

23. **What happens when someone withdraws consent?** The prototype can update patient and caregiver messaging flags; new reminders and draft approval check the current flags. Existing local history remains. A real deployment needs a documented withdrawal, retention and deletion process across every connected provider.

24. **Does knowing a patient link grant access?** No. The server checks a session bound to that patient, so changing a patient identifier cannot grant access to another journey. The public demo deliberately permits entry to three fictional seed identities. Protected local mode disables that shortcut, but does not yet verify a patient's real-world identity or provide account recovery.

25. **Is the saved data encrypted, and who manages keys?** The implementation uses AES-256-GCM for the saved workflow, with a fresh nonce on each write and the key outside the database. The demo key is held in the local user's application-data directory; protected local evaluation requires a separately supplied key. That protects a database copy without its key, not a compromised server or host account. Production key management and rotation are still work to do. See the [security design](security-design.md) and [verification record](verification.md).

26. **What does ABHA add today?** Only an optional simulated consent step. It does not fetch records, prove identity or determine insurance eligibility. Any real ABDM connection would require applicable onboarding and scoped patient consent; ABHA remains optional. See the [Ministry of Health ABDM update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068), [consent explainer](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2017129&lang=2&reg=48) and [ABDM sandbox](https://sandbox.abdm.gov.in/sandbox/v3).

### Deployment, value and measurement

27. **What about patients without smartphones, WhatsApp or strong connectivity?** Staff could create or update a request by phone or at the desk, and a pilot should offer a non-digital route. The current prototype has a browser patient view and simulated inbox; it has not tested offline use, SMS, IVR or voice.

28. **Can a busy OPD actually operate this at scale?** We do not know yet. The prototype shows the steps, not production throughput. A pilot should time staff review, booking and barrier resolution per request, check queue growth and exceptions, and stop or simplify tasks that add work.

29. **How would you integrate with a hospital?** Start with one department and agreed ownership of referral review, roster, slots, arrival and attendance. Then connect to approved hospital systems and messaging providers with the hospital's data and security review. None of those connections is live today.

30. **Who pays, and what is the business model?** A plausible customer is a hospital or clinic buying an operational service, perhaps priced by site or managed appointment volume. Pricing, procurement path and willingness to pay are unvalidated; first show a staff-workload and patient-flow benefit in a supervised pilot.

31. **What metric proves this works?** Define a pilot cohort and compare referral-to-booking time, document readiness, registration-to-consultation time where timestamps exist, staff time and verified return attendance. Keep the original due date, and report reschedules, unreachable patients and consent withdrawals separately. No improvement has been measured yet.

32. **What is the biggest limitation today, and the next step?** It is a local synthetic-data prototype without real identity checks, messaging, hospital integration or a pilot. The next step is a care-team walkthrough to test the workflow and staff burden, then a scoped supervised pilot if a hospital wants it.

33. **Is this an existing product?** No. The idea and deck existed first, and we built this local prototype during submission preparation. There was no previously launched product or hospital deployment, so the declaration is **“No — we are building a new solution.”**

### Harder security questions

34. **Why not blockchain?** Our immediate requirement is to protect private records and control access within one clinic. A ledger does not replace those controls. We would revisit a permissioned ledger only if independent organisations need a jointly governed audit history. Patient records do not belong on a public chain. This is a design judgment based on the distinction explained in [NIST's blockchain overview](https://csrc.nist.gov/pubs/ir/8202/final).

35. **Is this end-to-end encryption?** No. The server must decrypt the journey to perform booking and follow-up work. We describe it precisely as authenticated encryption at rest. HTTPS is also needed for transport before public deployment; the demo runs on local loopback HTTP.

36. **What happens if the key is lost or the stored data is changed?** A missing or wrong key must stop access rather than create a fresh empty record. Modified ciphertext fails authentication. Key recovery, encrypted backups and a tested restore procedure are required before real use; the current prototype has no automatic recovery service.

37. **Can an administrator still see the data?** The running application can, and someone who controls that application or its key may be able to as well. We do not claim protection from a fully compromised server. A deployment needs restricted operating-system and service access, managed keys, individual staff permissions and independent review.

38. **Is the audit trail immutable?** No. It records actions and the server-derived role, and is inside the encrypted state. It is useful for demonstrating the workflow, but an authorized operator with the key can alter data, and an older valid snapshot can be replayed. A production audit requirement needs stronger independent retention and monitoring.

39. **Can the AI see patient records?** The optional adapter receives only an allowlisted logistical category, language and approved template. It does not receive names, records or the patient's free text. The live provider is unconfigured in this demo; tests use mocked responses. Staff approval is still required for a draft.

40. **What proof of security do you have?** We can show repeatable encryption, tamper and authorization checks in the repository and the exact outcomes in the verification record. These are implementation tests, not an independent penetration test, legal compliance assessment or certification.

41. **How do you prevent brute-force login?** Protected local mode uses a salted scrypt password verifier, constant-time comparison and a limit on failed login attempts. A public service would also need an identity provider, individual accounts, stronger abuse controls and a recovery process.

42. **Can we deploy it with real patient data tomorrow?** No. It is ready for a synthetic demonstration and care-team feedback. Hosting, HTTPS, identity verification, key operations, retention, clinical escalation ownership, integration testing and independent review must be settled first.

## Closing line

“We help a care team make the referral journey clear before the patient travels, then keep the clinician's requested return visible until attendance is confirmed.”
