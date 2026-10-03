# Vishwas — copy-ready hackathon application

Prepared for **Bhavya Dhoot** on **3 October 2026**. Paste only the answer under each field label. Word and character counts are for checking, not for the form.

| Form field | Answer |
| --- | --- |
| Applicant name, if requested | Bhavya Dhoot |
| Track | Diabetes |
| Primary user | Doctor / Care Team |
| Closest use-case heading | Clinic Operations & Patient Flow |
| Solution name | Vishwas |
| Existing work | Yes - we are building on an existing product |

The primary operator is a care coordinator, nurse or OPD staff member. Patients start the request from home, and consented caregivers can participate. The chosen heading reflects the first problem Vishwas addresses: arranging the correct specialist and arrival details before the patient travels. Follow-up remains part of the same workflow.

## The problem you are solving

Before travelling to a hospital, a person with diabetes may have a referral but no clear way to turn it into the right appointment. They need to know which clinic to visit, which specialist has a slot, where to go and which papers to bring. When these details are settled only after arrival, patients may queue at the wrong desk or make another trip, while staff repeat the same guidance by phone. The next gap comes after the visit: a clinician may set a return date, but missed follow-ups can disappear into separate registers and messages. Travel, work, language or caregiver constraints remain unseen until someone calls. Care teams need a shared view from the patient's request at home through arrival and the next confirmed visit.

**Length:** 126 words; 736 characters. Limit: 150 words / 1,200 characters; minimum: 100 characters.

## Your solution

From home, a patient submits a visit request with their referral department and language. Clinic staff review the referral department remotely; Vishwas does not infer a specialty from symptoms. The care team compares specialists in that department by language and available slots, books one, and the patient sees the time, clinic location and a checklist for referral papers, previous reports and appointment details before travelling. The checklist records presence only; no medical records are uploaded or interpreted. At arrival, staff record check-in and confirm attendance. A clinician-set return date opens a separate follow-up. Vishwas flags it when due, creates consent-based reminders in a simulated WhatsApp inbox and lets patients report practical barriers for staff to handle. Administrative replies require staff approval; caregivers participate with consent. The local prototype uses fictional patients. ABHA consent is simulated. Vishwas gives no diagnosis, risk score, investigation or treatment advice.

**Length:** 145 words; 1,019 characters. Limit: 150 words / 1,200 characters; minimum: 100 characters.

## Solution name

Vishwas

**Length:** 7 characters; minimum: 5 characters.

## Scope confirmation

Select the confirmation that the solution stays outside the form's excluded clinical scope. If a text explanation is requested, use:

> Vishwas takes a referral request before travel, then coordinates the appointment after staff confirm the department. It does not diagnose, select a department from symptoms, interpret medical records, score clinical risk, suggest investigations or treatment, or provide autonomous clinical advice. Staff approval would not make those excluded functions part of this proposal.

The checklist records whether documents are present, not what they contain. The prototype does not upload medical records. A clinical question in the demo goes to staff without an automated advice draft.

## How you will build it

The local prototype uses Node.js 22 with built-in HTTP and SQLite, plus responsive vanilla JavaScript and CSS. It stores referral, booking, checklist, check-in and follow-up actions. Reminders and staff-approved replies appear in a simulated WhatsApp inbox; a demo clock makes due dates testable. An optional OpenAI Responses API drafting adapter is implemented but unconfigured; clinic templates work without it. ABHA consent is simulated; live messaging and ABDM connections need separate integration.

**Length:** 71 words; 503 characters. Limit: 80 words / 600 characters; minimum: 30 characters.

The described local implementation uses built-in Node.js HTTP and SQLite with a browser interface. The messaging inbox, ABHA consent and patients are simulated. The optional OpenAI Responses API adapter is implemented and unit-tested against a mocked provider, but has no live credentials. Clinic templates work without it. No live AI, WhatsApp or ABDM connection is claimed. Local persistence is not a claim of production readiness.

## Existing work

Select the form's **Yes - we are building on an existing product** choice if it asks whether any part has already been built. If an explanation is requested, use:

> We began with the concept and an existing pitch deck. During submission preparation, we built a small local prototype of the patient request, referral review, booking and follow-up workflow using fictional data. This is a new solution, with no prior launched product or live hospital integration.

The local workflow and the patient-initiated pre-arrival journey passed automated and browser checks; see the [verification record](verification.md). If the form's “existing product” wording refers strictly to a product launched before this hackathon, explain this distinction in its free-text field rather than implying prior deployment.

## Pitch deck

The applicant reports an existing deck, but it was not supplied for review or upload here. The form requests **6–8 slides, PDF or PowerPoint, maximum 25 MB**. [Deck context and narrative](pitch-deck-context.md) shows how to align it with this application. Do not claim the deck has been reviewed or uploaded.

## Links and supporting files

Optional supporting link:

https://github.com/Bhavya-Dhoot/Vishwas

Describe the repository as a local synthetic-data prototype with its source code, screenshots and submission documents. Leave LinkedIn, video and prototype URL fields blank unless an actual public link is available. Do not present the repository as a playable video, deployed app or pilot.

## ABHA context

Use **Ayushman Bharat Health Account (ABHA)** under the **Ayushman Bharat Digital Mission (ABDM)**. ABHA is a voluntary 14-digit health identifier, as confirmed in the [Ministry of Health's ABDM update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068). The [Ministry of Health explainer](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2017129&lang=2&reg=48) describes consent-based access to linked records.

Here, ABHA is an optional simulated consent step. It does not fetch records. A future integration would require applicable ABDM onboarding and patient consent. ABHA does not establish PM-JAY insurance eligibility.
