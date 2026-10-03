# Prototype verification — 3 October 2026

Verified locally on Windows with Node.js 22.17.1. All data was fictional; no third-party messages or live model calls were made.

## Automated tests

Run `npm test`. **13 tests passed; 0 failed.** They cover:

- Intake, confirmed routing, matching bookings, document readiness, check-in, attested completion and separate follow-up creation.
- Overdue reminders, deduplication, logistical drafts, approval, barrier resolution and a verified return.
- Slot capacity, department constraints, unchanged original due dates and invalid transitions.
- Patient/caregiver consent, medical questions without a draft and invalid JSON/actions.
- SQLite persistence across a server restart.
- Optional AI payload minimisation, provider failure and template fallback.
- Drafts bound to their original barrier, consent/approval changes while an AI request is pending, and stale concurrent results.
- AES-256-GCM persistence and a different nonce on the next save; the saved snapshot contains no test patient name in plaintext.
- Correct-key recovery, wrong-key rejection, ciphertext tampering rejection and refusal to open legacy plaintext state.
- Unauthenticated rejection, patient state scoping, cross-patient action denial, staff-only actions, server-derived actor identity and session revocation after logout/replacement.
- Missing/wrong anti-forgery tokens, protected-mode configuration, password checking and login throttling, and rejection of public demo entry/reset/date actions in protected mode.

The suite uses generated test keys and temporary databases. No real key, password, patient record or session cookie is part of its report.

## Browser walkthrough

A headless Chromium session completed the visible interface sequence using separate patient and staff browser contexts: patient submits from home → staff confirms Endocrinology referral → books → patient refreshes and sees the plan before check-in → mark documents → check in → confirm initial visit → create a follow-up → advance demo day → run reminders → add a travel barrier → improve the draft with the template fallback → approve simulated delivery → resolve the task → rebook → check in → confirm the return.

Assertions checked patient state isolation, absence of staff audit data in the patient response, no check-in/completion before arrival, the separate follow-up identifier, the unchanged original due date, and that a reply/booking never counted as attendance. There were no browser JavaScript errors. At 390px, the patient plan and staff overview had no horizontal overflow. Updated screenshots were visually inspected.

The repeatable walkthrough is [scripts/browser-smoke.cjs](../scripts/browser-smoke.cjs). It needs Playwright as a development tool and Chromium; the application itself has no runtime dependency installation. With Playwright available, run `node scripts/browser-smoke.cjs` from the repository root. Optional `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` variables can point to an existing local installation. It creates an isolated in-memory app and regenerates the fictional screenshots; it does not modify the running demo database.

## Pre-arrival test with two browser clients

A separate patient window opened /?view=patient and submitted a fictional request from home. A staff window reviewed it, confirmed the department and booked a specialist. The patient refreshed the journey and saw the specialist, date, room, clinic location and preparation checklist while checkedInAt and completedAt were both null. Patient-side document readiness appeared in the staff view. After staff later recorded attendance and a new return date, patient refresh selected the separate follow-up.

The patient view hid staff booking/attendance controls, and the API separately enforced role and ownership. Knowing or changing a URL identifier did not grant access. This flow produced no browser JavaScript errors; the patient entry also passed the 390px horizontal-overflow check. It demonstrates coordination before arrival using two local clients, not a live public deployment.

## Additional security review and running demo

A separate internal implementation review exercised modified authentication tags, foreign Origin, JSON-only writes, invalid Host headers, altered cookies, query-ID scoping and cross-patient message/ABHA-consent actions. No actionable defect was found within the stated local synthetic-data threat model. This was an internal review, not an independent security certification or penetration test.

Browser checks also covered protected staff sign-in with no demo controls, logout, and clearing the workspace after its session cookie was removed. This checks the expired-session response path; it does not imply an eight-hour wall-clock endurance test.

The local listener was restarted with the new implementation. An unauthenticated `GET /api/state` returned **401**; `GET /api/session` returned an unauthenticated demo session description. The default database is now the encrypted demo database. The older plaintext fictional database was left untouched, not silently migrated.

## What this does not establish

The checks do not establish production readiness, real patient identity, individual staff identity, live WhatsApp delivery, live ABDM access, live OpenAI output quality, hospital-system compatibility, or measured time savings. Local HTTP, key operations, backup/recovery, retention/deletion and deployment assurance remain limitations. The existing deck was not provided for inspection, and no application form was submitted.
