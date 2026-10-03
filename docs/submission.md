# Vishwas — copy-ready application

Prepared for **Bhavya Dhoot** on **3 October 2026**. Paste only the text under each field label, excluding the word/character counts.

| Form field | Answer |
| --- | --- |
| Applicant name, if requested | Bhavya Dhoot |
| Which track are you submitting under? | Diabetes |
| Who is the primary user of your solution? | Doctor / Care Team |
| What use case is your team addressing? | Patient Follow-up & Continuity of Care |
| Name of your solution | Vishwas Care Continuity |
| Existing work | No - we are building a new solution |

The primary operator is the clinic's care coordinator, nurse or OPD team. Patients and consented caregivers are beneficiaries and participants. Use one track and one closest use-case heading.

## The problem you are solving

Diabetes care often involves repeat OPD visits over months or years. Before reaching the hospital, patients may struggle to locate records, find the department named in a referral, or arrange transport and caregiver support. Between visits, language, cost and scheduling barriers can prevent follow-up. Care teams may see a missed appointment without knowing why the patient could not return or whether another visit was booked. Scattered registers, calls and messages make coordination harder. Patients carry the burden of navigating the system, while staff repeatedly chase updates. The gap is operational: helping patients complete follow-up already planned by their clinician, and giving care teams visibility into practical barriers and confirmed attendance.

**Length:** 110 words; 763 characters. Limit: 150 words / 1,200 characters; minimum: 100 characters.

## Your solution

Vishwas Care Continuity will help diabetes care teams coordinate patients before and between visits. Staff confirm the referral department and follow-up date. Before arrival, patients gather records and find the booked or referred OPD through a hospital directory; unclear requests go to staff. Afterwards, Vishwas tracks overdue appointments and supports consented multilingual WhatsApp text and voice outreach. AI transcribes logistical replies, categorises practical barriers and drafts administrative responses for staff review, without receiving medical records. Caregivers participate only with permission. Staff help resolve booking or travel issues, and a follow-up is marked completed only after attendance is verified. Optional ABHA-linked record sharing is a future consent-based integration; the demo uses synthetic records and simulated ABHA screens. Vishwas supports navigation and follow-through without diagnosis, medical interpretation, clinical risk scoring, or test and treatment recommendations.

**Length:** 133 words; 1015 characters. Limit: 150 words / 1,200 characters; minimum: 100 characters.

## Solution name

Vishwas Care Continuity

**Length:** 23 characters; minimum: 5 characters.

## Scope guardrail

For the administrative scope described here, select the confirmation:

> I confirm our solution stays outside the out-of-scope list above - it does not diagnose, recommend treatment, provide clinical decision support, or give autonomous clinical advice.

The supplied form also excludes clinical risk scoring and interpretation of medical data. These are excluded from the proposal.

The initial idea's symptom/history-based triage, AI specialist selection and suggested investigations are outside this submission. Adding nurse or doctor approval would not remove them from the form's excluded categories. Staff confirm an already documented referral department and follow-up date. Records can be collected for the consultation; their clinical contents are not analysed by the platform's AI.

## How you will build it

Next.js/React, TypeScript, Node.js route handlers and PostgreSQL. Scheduled queries flag overdue appointments. WhatsApp Cloud API supports outreach, with a mock channel for demos. OpenAI speech-to-text and Responses APIs provide transcription, structured logistical-barrier categories and staff-reviewed reply drafts; medical records stay outside these AI calls. ABHA and hospital attendance integrations are simulated initially. Deploy the web prototype on Vercel.

**Length:** 58 words; 465 characters. Limit: 80 words / 600 characters; minimum: 30 characters.

All technologies describe a proposed implementation. They are not claims that the product or integrations have already been built. The approach uses [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [OpenAI speech-to-text](https://developers.openai.com/api/docs/guides/speech-to-text) and [structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Existing work

Select:

> No - we are building a new solution

If an explanation is requested:

> We are building a new solution. Before this submission, we had developed the concept and a pitch deck, but no product or prototype code. This repository contains submission and planning documents; implementation is planned.

This declaration reflects the applicant's confirmation. If implementation is added before the final submission, update the statement to disclose that work accurately.

## Pitch deck

Upload the existing deck after aligning it with the submission: **6–8 slides, PDF or PowerPoint, maximum 25 MB**. The deck was not provided here and has not been checked or edited.

[Deck context and narrative](pitch-deck-context.md) contains a seven-slide content map and a 60-second pitch. This document is supporting context, not a replacement upload.

## Links and supporting files

Paste this repository URL into the optional links field:

https://github.com/Bhavya-Dhoot/Vishwas

The repository is public and contains the proposal and build plan. Describe it as a submission repository, not a working prototype.

Leave LinkedIn, video and prototype URL fields blank unless you have an actual public link. No LinkedIn identity, demo deployment, partnership or paper has been invented. Do not put a GitHub repository in a field that specifically asks for a playable video or live app.

## ABHA context

Use **Ayushman Bharat Health Account (ABHA)** under the **Ayushman Bharat Digital Mission (ABDM)**. ABHA is a voluntary 14-digit health identifier, as confirmed in the [Ministry of Health's ABDM update](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2003068). Record sharing is based on patient consent; the [Ministry of Health explainer](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2017129&lang=2&reg=48) describes linked-record access and consent.

For this proposal, optional ABHA support means a clearly simulated consent journey now, with a future integration through applicable ABDM onboarding. Entering a number alone must not be presented as fetching a patient's entire medical history. ABHA also does not establish PM-JAY insurance eligibility. See the [official explainer](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2017129&lang=2&reg=48).
