# Vishwas — SWOT and jury questions

**One-line answer:** Vishwas helps a care team turn a patient's referral request into a confirmed specialist appointment **before the patient travels**, then keeps the clinician-set return visit visible until attendance is verified.

Use the answers in your own voice. The local demo contains fictional people, clinicians, slots and messages. It is a clinic operations workflow for the Diabetes track, not a clinical decision system or a deployed service.

## SWOT

| | What a judge should hear |
| --- | --- |
| **Strengths** | A valid referral department reaches its inbox before arrival; an unclear request goes to coordination. One acceptance triggers consented, deterministic doctor and slot matching, with reasons and a waitlist for exceptions. The patient receives a plan and can upload encrypted supporting files. The sample hospital connector demonstrates directory import and acknowledged booking. Attendance and clinician-set return visits remain separately verified. |
| **Weaknesses** | There is no hospital pilot, real vendor API, public identity check, live WhatsApp or ABDM connection. The sample connector needs durable crash recovery; Fabric governance and live-network evidence must be checked in [verification](verification.md). Protected local mode has one shared staff account. Upload checks do not establish that a report is genuine or sufficient. |
| **Opportunities** | A clinic could measure whether automated department sorting and matching reduce staff actions and referral-to-booking time, wrong-desk transfers and repeated calls. A scoped pilot could connect an approved roster, booking and attendance source. These are hypotheses, not measured gains. |
| **Threats** | Wrong referral details, stale slot data, remote booking uncertainty, shared phones, limited connectivity, consent withdrawal, message failure and staff overload could make a real workflow unreliable. Hospital procurement, consortium governance, integration and data-governance requirements could slow adoption. |

## What can be claimed today

| Claim | Evidence and exact status | Say this in the room |
| --- | --- | --- |
| Pre-arrival coordination works | The code routes exact referral departments to a department inquiry and unclear requests to coordination; [verification](verification.md) gives the current browser status. | “One staff acceptance triggers the consented appointment match in the local prototype.” |
| Booking respects constraints | Automated tests cover department, language, preferences, capacity, waitlist and retry behavior. The sample service tests real local HTTP reservation and idempotency. | “The prototype enforces these rules against fictional slots and a local sample hospital API.” |
| Documents and integrity | PDF/text/JSON upload, scoped access, encryption, retry/verify/delete and Fabric bridge behavior have automated checks. A live network claim needs [verification](verification.md). | “Files stay encrypted off-chain. A consented salted commitment can be checked on Fabric; a match does not prove who issued the file.” |
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

5. **What is new here?** The product hypothesis is that exact referral routing and one-acceptance scheduling remove routine sorting and slot matching while keeping exceptions visible. Encrypted records and a connected sample booking service support the same pre-arrival journey. A pilot must measure whether this actually reduces staff work.

6. **Who uses it and who benefits?** A coordinator, nurse or OPD team operates the queue. A patient or consented caregiver starts and checks the journey. Clinicians set the medical follow-up date; they do not need to use an AI recommendation.

### Workflow and edge cases

7. **How do you route a patient safely?** A valid directory ID or exact department label from an existing referral enters that department's inbox. An unknown or missing label goes to coordination. Staff accept the department before scheduling. Symptoms and uploaded records never select a specialty.

8. **What if there is no referral, or the department is unclear?** It becomes a coordination inquiry. A coordinator selects a valid department through the clinic's normal process, then accepts it. The system does not guess.

9. **What if the patient chose the wrong department?** Staff correct and confirm the route before booking. Once booked, a real clinic would need a documented transfer workflow; that is not proven by this prototype.

10. **How do you prevent overbooking?** Local matching checks department, language, preferences, date and capacity. With the sample connector, a remote idempotent reservation must be acknowledged before local booking commits. A real hospital's booking system must remain the authority.

11. **How does language matching work?** The deterministic matcher filters clinicians by listed English/Hindi languages, then considers the patient's date, time and preferred doctor. It chooses an available slot in stable order or records why the inquiry is waitlisted. This is a service preference, not a guarantee of understanding.

12. **What does the preparation checklist verify?** Only whether referral papers, previous reports and appointment details are marked ready. Patients can separately upload PDF, text or JSON files for authorized staff. The app checks file type and stores bytes securely; it does not read clinical meaning or certify sufficiency.

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

21. **What personal data does the prototype use?** Fictional names, journey state and optional uploaded synthetic documents in local SQLite. It does not collect real phone numbers or ABHA numbers or send real WhatsApp messages. Uploaded bytes, metadata and random salt are encrypted. Only synthetic data should be entered.

22. **Can a caregiver receive reminders automatically?** No. Caregiver permission is separate from patient outreach permission, and the recipient's current consent is checked before a simulated message is approved. In a pilot, the clinic must verify the caregiver relationship and contact channel.

23. **What happens when someone withdraws consent?** The prototype can update patient and caregiver messaging flags; new reminders and draft approval check the current flags. Existing local history remains. A real deployment needs a documented withdrawal, retention and deletion process across every connected provider.

24. **Does knowing a patient link grant access?** No. The server checks a session bound to that patient, so changing a patient identifier cannot grant access to another journey. The public demo deliberately permits entry to three fictional seed identities. Protected local mode disables that shortcut, but does not yet verify a patient's real-world identity or provide account recovery.

25. **Is the saved data encrypted, and who manages keys?** AES-256-GCM protects the workflow snapshot and every document's full metadata and bytes, with a fresh nonce per save. The demo key is held outside SQLite in the local user's application-data directory; protected mode requires a supplied key. This protects a database copy without its key, not a compromised server. Managed keys and rotation are deployment work. See [security design](security-design.md).

26. **What does ABHA add today?** Only an optional simulated consent step. It does not fetch records, prove identity or determine insurance eligibility. Any real ABDM connection would require applicable onboarding and scoped patient consent; ABHA remains optional. See the [Ministry of Health ABDM update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068), [consent explainer](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2017129&lang=2&reg=48) and [ABDM sandbox](https://sandbox.abdm.gov.in/sandbox/v3).

### Deployment, value and measurement

27. **What about patients without smartphones, WhatsApp or strong connectivity?** Staff could create or update a request by phone or at the desk, and a pilot should offer a non-digital route. The current prototype has a browser patient view and simulated inbox; it has not tested offline use, SMS, IVR or voice.

28. **Can a busy OPD actually operate this at scale?** We do not know yet. The prototype shows the steps, not production throughput. A pilot should time staff review, booking and barrier resolution per request, check queue growth and exceptions, and stop or simplify tasks that add work.

29. **How would you integrate with a hospital?** The tested local sample API imports departments, clinicians and slots, then acknowledges idempotent remote reservations using opaque IDs. A hospital pilot needs vendor API access, identifier mapping, booking and cancellation rules, security review and acceptance testing. No real hospital API has been supplied.

30. **Who pays, and what is the business model?** A plausible customer is a hospital or clinic buying an operational service, perhaps priced by site or managed appointment volume. Pricing, procurement path and willingness to pay are unvalidated; first show a staff-workload and patient-flow benefit in a supervised pilot.

31. **What metric proves this works?** Define a pilot cohort and compare referral-to-booking time, document readiness, registration-to-consultation time where timestamps exist, staff time and verified return attendance. Keep the original due date, and report reschedules, unreachable patients and consent withdrawals separately. No improvement has been measured yet.

32. **What is the biggest limitation today, and the next step?** It is a local synthetic-data prototype without real identity checks, messaging, vendor integration or a pilot. Remote reservation recovery is not yet durable across a process crash. The next step is a care-team walkthrough and a scoped supervised pilot if a hospital wants it.

33. **Is this an existing product?** No. The idea and deck existed first, and we built this local prototype during submission preparation. There was no previously launched product or hospital deployment, so the declaration is **“No — we are building a new solution.”**

### Harder security questions

34. **Why use Fabric when a database could store a hash?** A single hospital can use its encrypted database and access controls alone. Fabric is an optional shared receipt if independent institutions agree to witness commitments under common governance. It does not protect the file or replace authorization. The local two-organization network is a technical demonstration, not a hospital consortium. See [Fabric's architecture](https://hyperledger-fabric.readthedocs.io/en/latest/private-data-arch.html).

35. **Is this end-to-end encryption?** No. The server decrypts the journey and documents to perform authorized work. We describe it as authenticated encryption at rest. HTTPS is needed before public deployment; the demo runs on local loopback HTTP.

36. **What happens if the key is lost or the stored data is changed?** A missing or wrong key stops access rather than creating a fresh empty record. Modified ciphertext fails authentication. Key recovery, encrypted backups and a tested restore are required before real use. Fabric can detect a mismatch against a previously committed file, but cannot recover the file or lost key.

37. **Can an administrator still see the data?** The running application can, and someone who controls that application or its key may be able to as well. We do not claim protection from a fully compromised server. A deployment needs restricted operating-system and service access, managed keys, individual staff permissions and independent review.

38. **Is the audit trail immutable?** The application audit log is inside its encrypted state and is not independently immutable. An authorized operator with the key can alter it, and an older valid snapshot can be replayed. A Fabric commitment is an independent integrity receipt for a consented file, not an immutable log of every action.

39. **Can the AI see patient records?** The optional adapter receives only an allowlisted logistical category, language and approved template. It does not receive names, records or the patient's free text. The live provider is unconfigured in this demo; tests use mocked responses. Staff approval is still required for a draft.

40. **What proof of security do you have?** Automated checks cover encryption, tamper detection, scoped document access and failure states. The [verification record](verification.md) distinguishes those tests from any live Fabric transaction. These are implementation checks, not a penetration test, legal assessment or certification.

41. **How do you prevent brute-force login?** Protected local mode uses a salted scrypt password verifier, constant-time comparison and a limit on failed login attempts. A public service would also need an identity provider, individual accounts, stronger abuse controls and a recovery process.

42. **Can we deploy it with real patient data tomorrow?** No. It is ready for a synthetic demonstration and care-team feedback. A real pilot needs hospital API access, reconciled existing bookings, durable recovery after remote acknowledgement, HTTPS, verified identities, managed keys, retention and deletion rules, clinical escalation ownership, Fabric governance if used, and independent review.

## Additional questions judges may ask about the new flow

**How much staff work does one acceptance remove?** The design removes routine inbox sorting for exact referral departments and repeated doctor-and-slot matching. Staff still accept ownership and handle unclear referrals, missing consent, waitlists and failures. No reduction has been measured. A pilot should count staff actions and elapsed time per enquiry.

**Does the app choose the medically best doctor?** No. It chooses an administratively compatible available doctor using department, language, patient preferences and capacity. The clinician and hospital retain clinical responsibility.

**What happens when there is no matching slot?** The accepted inquiry stays waitlisted with a reason, including a distinction between patient preferences and lack of matching capacity. It does not silently override preferences. A retry can book once compatible capacity appears.

**Does a Fabric match prove the report is authentic?** No. It proves the currently saved bytes match the earlier consented commitment. It cannot establish who issued the file, whether the contents are medically true or whether it belongs to the right patient.

**Can a file be deleted from Fabric?** The encrypted off-chain file can be deleted. A commitment already written to Fabric remains. Consent language must state that limit, and a real consortium needs a retention and privacy policy.

**Who runs the ledger?** The local network has two sample organizations and a service identity. A real network needs named hospital participants, membership rules, certificate and key operations, governance, monitoring and a dispute process. The demo does not supply those.

**What if the connector times out or the process crashes?** An idempotency key lets a retry ask for the same reservation. Local commit failure triggers cancellation; failed cancellation requires staff reconciliation. A crash after remote acknowledgement but before local commit needs a durable queue and scheduled reconciliation, which this prototype does not yet have.

## Closing line

“We help a care team make the referral journey clear before the patient travels, then keep the clinician's requested return visible until attendance is confirmed.”
