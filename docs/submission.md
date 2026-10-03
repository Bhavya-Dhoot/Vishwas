# Vishwas — copy-ready submission

Prepared for **Bhavya Dhoot** on **3 October 2026**. These answers describe the revised proposal. Implementation status is disclosed separately below. Paste only each field's answer into the form.

| Form field | Answer |
| --- | --- |
| Applicant | Bhavya Dhoot |
| Track | Diabetes |
| Primary user | Doctor / Care Team |
| Use case | Clinic Operations & Patient Flow |
| Solution name | Vishwas |
| Existing work | No - we are building a new solution |

## The problem you are solving

A person with diabetes may have a referral and previous reports but still arrive at hospital without knowing which clinic will receive them or whether a suitable doctor is available. Staff then spend time redirecting patients, checking papers and coordinating appointments across desks and phone calls. These arrangements could begin while the patient is still at home. After the consultation, return dates and missed visits are often tracked separately, leaving care teams to discover travel, work or language barriers through repeated calls. Vishwas addresses this coordination gap for patients, caregivers and hospital teams: getting an existing referral into the correct department's queue before arrival, arranging the appointment and keeping the next visit visible.

**Length:** 113 words; 771 characters. Limit: 150 words / 1,200 characters.

## Your solution

Vishwas starts with an enquiry from home: the department named in an existing referral, language and appointment preferences. Exact department rules send it to that inbox; an unclear referral goes to coordination. After one staff acceptance, Vishwas assigns an available doctor and compatible slot with the patient's consent. The patient sees the appointment, location and preparation checklist before travelling. The local prototype encrypts uploaded files off-chain, exchanges directory and booking acknowledgements with a sample hospital API, and can record a salted verification commitment on a local Hyperledger Fabric network. Clinician-set return dates then drive reminders, barrier handling and attendance tracking. A hosted public preview demonstrates the enquiry and scheduling flow with fictional data; it does not connect to the hospital API or Fabric or accept uploads. Vishwas does not interpret records, infer specialties from symptoms, diagnose or recommend tests or treatment.

**Length:** 141 words; 993 characters. Limit: 150 words / 1,200 characters.

## Solution name

Vishwas

7 characters; minimum 5.

## Scope guardrail

Select **I confirm our solution stays outside the out-of-scope list above** for the scope described here. If an explanation is requested:

Vishwas routes an explicitly stated referral department and coordinates available appointments. It does not interpret uploaded medical records, select a specialty from symptoms, diagnose, score clinical risk, suggest investigations or treatment, or give autonomous clinical advice. Unclear requests enter a coordination inbox.

The initial enquiry captures an existing recommendation, language and scheduling preferences. Uploaded records accompany the enquiry for authorized staff; their clinical content does not drive the routing algorithm. Staff acceptance does not make diagnosis, clinical decision support or suggested tests eligible under this form.

## How you will build it

JavaScript web app, Node.js 22 and encrypted SQLite locally. Versioned rules route existing referrals and match appointments. AES-256-GCM binds records to storage context; named staff sessions control access. An encrypted booking journal supports interruption recovery. A sample REST adapter exchanges schedules and booking acknowledgements; optional local Hyperledger Fabric holds salted commitments. The hosted public preview uses isolated, disposable in-memory state without uploads or external connectors. WhatsApp and ABHA remain simulated.

**Length:** 70 words; 545 characters. Limit: 80 words / 600 characters.

## Existing work

**No - we are building a new solution**

We started with the concept and an existing pitch deck. The local prototype was built during submission preparation using fictional patients. This is a new solution, with no prior launched product or live hospital integration.

This follows the applicant's declaration that only a concept and deck existed before this work. Disclose the prototype and commit history when asked what is built at submission time.

## Pitch deck

Use **6–8 slides**, PDF or PowerPoint, maximum **25 MB**. The existing deck was not supplied for review or upload. Use the revised [eight-slide context](pitch-deck-context.md) and [architecture change notes](architecture-update.md) to update it.

## Links and supporting files

Paste one supporting link per line:

https://github.com/Bhavya-Dhoot/Vishwas
https://vishwas-care-demo.vercel.app
https://vishwas-care-demo.vercel.app/Vishwas-Supporting-Document.pdf
https://github.com/Bhavya-Dhoot/Vishwas/blob/main/docs/research-references.md

The [public preview](https://vishwas-care-demo.vercel.app) is a visitor-isolated, disposable demonstration of the enquiry and scheduling flow. Its in-memory Vercel sessions can reset across cold starts or request routing; uploads are disabled, and it has no hospital, Fabric, live WhatsApp, ABHA or cloud AI connection. The [supporting PDF](https://vishwas-care-demo.vercel.app/Vishwas-Supporting-Document.pdf) and [research references](https://github.com/Bhavya-Dhoot/Vishwas/blob/main/docs/research-references.md) provide context. The repository contains the fuller local connected prototype and submission materials. The [updated 60-second video](https://raw.githubusercontent.com/Bhavya-Dhoot/Vishwas/main/brag-output/brag.mp4) shows that **local** prototype with the sample hospital API, encrypted uploads and local Fabric verification. A LinkedIn URL has not been supplied. No form or deck has been submitted on your behalf.

## Core idea for the PPT

**The hospital visit starts at home.** A patient supplies the department already named in a referral, uploads supporting files and states their preferences. Vishwas places the request in the department's inbox. One acceptance triggers doctor assignment and scheduling; the patient receives a clear plan before travelling. The same journey continues through the clinician's return date, reminders and confirmed attendance.

**One-line pitch:** From a referral at home to an arranged hospital visit—and a follow-up that stays visible.

**What the automation removes:** routine inbox sorting, repeated doctor-and-slot matching, manual reminder checks and fragmented follow-up tracking. Unclear referrals, unavailable slots and clinical questions remain visible exceptions.

## Security and blockchain wording

Files are encrypted off-chain with AES-256-GCM. Keys are stored separately, and server authorization limits access. With explicit consent, Hyperledger Fabric stores a salted cryptographic commitment that can later be checked against the file. It does not store the medical record or decide where a patient should go. A matching commitment proves integrity relative to the committed file; it does not prove who issued the record or whether it is medically correct.

The permissioned ledger is a prototype for verification across participating institutions. A single hospital can run the workflow with encryption and access controls while leaving ledger anchoring disabled. Real deployment needs hospital identities, managed keys, HTTPS, retention rules and operational security review.

## Edge processing and recovery

Routing, appointment matching, encryption, reminders and booking recovery run on the local Node.js server. `EDGE_ONLY=true` uses local templates and restricts the hospital and Fabric adapters to loopback endpoints. Patient records are not cached in browser storage. The hosted public preview uses isolated in-memory state and omits uploads and external connectors. Neither variant is a deployed hospital edge network. Named local staff accounts support audit attribution; a production identity provider and verified patient access remain deployment work. The 42-test local regression suite passed; see [verification](verification.md).

## ABHA context

Use **Ayushman Bharat Health Account (ABHA)** under **Ayushman Bharat Digital Mission (ABDM)**. The prototype has an optional simulated consent step; it does not verify an ABHA number or retrieve records. Future retrieval requires the applicable ABDM onboarding and consent flow. ABHA does not establish PM-JAY insurance eligibility. See the [Ministry of Health ABDM update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068).

## Business model — supporting context

This is additional deck and interview context; the form supplied does not have a separate business-model field.

Hospitals pay for Vishwas through a site subscription; patients and caregivers use it free. We propose a ₹40,000 paid pilot in one diabetes OPD, followed by a ₹20,000 monthly site subscription billed annually, with a separately scoped ₹60,000 integration fee. The pilot fee is credited against the first annual subscription on conversion; that annual term includes the pilot period. Messaging and hospital-system API charges are separate. We will use the pilot to measure staff effort, booking turnaround and planned return attendance before expanding. Fabric is optional for institutions needing shared verification. We will not earn referral commissions, offer paid doctor rankings or sell patient data. These are proposed commercial terms; there are no paying customers or measured returns yet.

See the [full business model](business-model.md) for scope, buyer, pricing assumptions, economics and the pilot plan.

## Current build status

The revised interface, deterministic routing and one-acceptance scheduling are available in a [public preview](https://vishwas-care-demo.vercel.app) with disposable visitor-isolated state. The fuller **local** prototype has encrypted uploads, a tested sample hospital connector and a verified local Fabric document transaction. All 43 automated tests and the local and public browser journeys passed; see [verification](verification.md) and [transaction evidence](connected-proof.json). The public preview has no uploads or external connections. WhatsApp delivery, ABHA and live AI remain simulated or unconfigured. No hospital pilot, waiting-time reduction or patient outcome has been measured.
