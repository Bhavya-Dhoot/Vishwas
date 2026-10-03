# Prototype verification — 3 October 2026

Verified locally on Windows with Node.js 22.17.1. All data was fictional; no third-party messages or live model calls were made.

## Automated tests

Run `npm test`. Ten tests cover:

- Intake, confirmed routing, matching bookings, document readiness, check-in, attested completion and separate follow-up creation.
- Overdue reminders, deduplication, logistical drafts, approval, barrier resolution and a verified return.
- Slot capacity, department constraints, unchanged original due dates and invalid transitions.
- Patient/caregiver consent, medical questions without a draft and invalid JSON/actions.
- SQLite persistence across a server restart.
- Optional AI payload minimisation, provider failure and template fallback.
- Drafts bound to their original barrier, consent/approval changes while an AI request is pending, and stale concurrent results.

## Browser walkthrough

A headless Chromium session completed the visible interface sequence: create a fictional patient → confirm Endocrinology referral → book → mark documents → check in → confirm initial visit → create a follow-up → advance demo day → run reminders → add a travel barrier → improve the draft with the template fallback → approve simulated delivery → resolve the task → rebook → check in → confirm the return.

Assertions checked the separate follow-up identifier, the unchanged original due date, and that a reply/booking never counted as attendance. There were no browser JavaScript errors in this flow. At 390px, the overview had no horizontal overflow. Screenshots were visually inspected.

## Pre-arrival test with two browser clients

A separate patient window opened /?view=patient and submitted a fictional request from home. A staff window reviewed it, confirmed the department and booked a specialist. The patient refreshed the journey and saw the specialist, date, room, clinic location and preparation checklist while checkedInAt and completedAt were both null. Patient-side document readiness appeared in the staff view. After staff later recorded attendance and a new return date, patient refresh selected the separate follow-up.

The patient view hid staff booking/attendance controls. An unknown patient link showed a new-request screen rather than a seed patient. This flow produced no browser JavaScript errors; the patient entry also passed the 390px horizontal-overflow check. It demonstrates coordination before arrival using two local clients, not a live public deployment.

## What this does not establish

The checks do not establish production readiness, staff authentication, live WhatsApp delivery, live ABDM access, live OpenAI output quality, hospital-system compatibility, or measured time savings. The existing deck was not provided for inspection, and no application form was submitted.
