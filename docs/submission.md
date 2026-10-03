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

Vishwas starts with a short enquiry from home: the department named in an existing referral, uploaded documents, language and appointment preferences. Published routing rules send the request to that department's inbox; an unclear referral goes to a coordination inbox. After the department accepts once, Vishwas assigns an available doctor and schedules a compatible slot with the patient's consent. The patient receives the appointment, location and preparation checklist before travelling. A configurable hospital connector exchanges directories, availability and booking acknowledgements. Uploaded files stay encrypted off-chain; an optional Hyperledger Fabric record holds only a salted verification commitment. After the visit, clinician-set return dates drive reminders, barrier handling and attendance tracking. The demo uses fictional patients, a sample hospital API and simulated messaging. Vishwas does not interpret records, diagnose, recommend tests or treatment, or infer a specialty from symptoms.

**Length:** 136 words; 1012 characters. Limit: 150 words / 1,200 characters.

## Solution name

Vishwas

7 characters; minimum 5.

## Scope guardrail

Select **I confirm our solution stays outside the out-of-scope list above** for the scope described here. If an explanation is requested:

Vishwas routes an explicitly stated referral department and coordinates available appointments. It does not interpret uploaded medical records, select a specialty from symptoms, diagnose, score clinical risk, suggest investigations or treatment, or give autonomous clinical advice. Unclear requests enter a coordination inbox.

The initial enquiry captures an existing recommendation, language and scheduling preferences. Uploaded records accompany the enquiry for authorized staff; their clinical content does not drive the routing algorithm. Staff acceptance does not make diagnosis, clinical decision support or suggested tests eligible under this form.

## How you will build it

We use a JavaScript web app, Node.js 22 and encrypted SQLite storage. Versioned rules route explicit referrals; deterministic scheduling checks department, language, preferences and capacity. A configurable REST connector integrates a sample hospital API. AES-256-GCM protects records; server sessions enforce access. Hyperledger Fabric stores salted document commitments, with files off-chain. Optional OpenAI drafting supports administrative replies. WhatsApp delivery and ABHA consent remain simulated.

**Length:** 63 words; 505 characters. Limit: 80 words / 600 characters.

## Existing work

**No - we are building a new solution**

We started with the concept and an existing pitch deck. The local prototype was built during submission preparation using fictional patients. This is a new solution, with no prior launched product or live hospital integration.

This follows the applicant's declaration that only a concept and deck existed before this work. Disclose the prototype and commit history when asked what is built at submission time.

## Pitch deck

Use **6–8 slides**, PDF or PowerPoint, maximum **25 MB**. The existing deck was not supplied for review or upload. Use the revised [eight-slide context](pitch-deck-context.md) and [architecture change notes](architecture-update.md) to update it.

## Links and supporting files

Paste one supporting link per line:

https://github.com/Bhavya-Dhoot/Vishwas

The repository contains the local prototype and submission materials. A public hosted app and LinkedIn URL have not been supplied. The [existing video](https://raw.githubusercontent.com/Bhavya-Dhoot/Vishwas/main/brag-output/brag.mp4) shows the previous manual-booking workflow; wait for its revision before using it to demonstrate the new automation. No form or deck has been submitted on your behalf.

## Core idea for the PPT

**The hospital visit starts at home.** A patient supplies the department already named in a referral, uploads supporting files and states their preferences. Vishwas places the request in the department's inbox. One acceptance triggers doctor assignment and scheduling; the patient receives a clear plan before travelling. The same journey continues through the clinician's return date, reminders and confirmed attendance.

**One-line pitch:** From a referral at home to an arranged hospital visit—and a follow-up that stays visible.

**What the automation removes:** routine inbox sorting, repeated doctor-and-slot matching, manual reminder checks and fragmented follow-up tracking. Unclear referrals, unavailable slots and clinical questions remain visible exceptions.

## Security and blockchain wording

Files are encrypted off-chain with AES-256-GCM. Keys are stored separately, and server authorization limits access. With explicit consent, Hyperledger Fabric stores a salted cryptographic commitment that can later be checked against the file. It does not store the medical record or decide where a patient should go. A matching commitment proves integrity relative to the committed file; it does not prove who issued the record or whether it is medically correct.

The permissioned ledger is a prototype for verification across participating institutions. A single hospital can run the workflow with encryption and access controls while leaving ledger anchoring disabled. Real deployment needs hospital identities, managed keys, HTTPS, retention rules and operational security review.

## ABHA context

Use **Ayushman Bharat Health Account (ABHA)** under **Ayushman Bharat Digital Mission (ABDM)**. The prototype has an optional simulated consent step; it does not verify an ABHA number or retrieve records. Future retrieval requires the applicable ABDM onboarding and consent flow. ABHA does not establish PM-JAY insurance eligibility. See the [Ministry of Health ABDM update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068).

## Current build status

The earlier local journey, encrypted storage and session controls have been verified. The revised deterministic router, one-acceptance scheduler and encrypted document API are implemented and have automated coverage. The combined interface, sample hospital connector and local Fabric network are being integrated and will be reported as verified only after their checks pass. WhatsApp delivery, ABHA and live AI remain simulated or unconfigured. No hospital pilot, waiting-time reduction or patient outcome has been measured.
