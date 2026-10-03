# Prototype verification — 3 October 2026

Verified locally on Windows with Node.js 22.17.1. All patients, clinicians and files are fictional. No WhatsApp messages, ABDM retrieval or live model calls were made.

## Automated checks

`npm test`: **43 passed, 0 failed** after routing, document, connector and security hardening changes. The isolated Fabric chaincode test also passed (**1 passed, 0 failed**); it is separate from the live-network verification below.

- Explicit department IDs and exact department labels route deterministically; referral-note contents do not infer a specialty.
- One acceptance selects a compatible available doctor and slot. Repeated acceptance is idempotent.
- Language, capacity, patient doctor/time preferences and automatic-scheduling consent are checked. Follow-ups retain scheduling constraints.
- Missing consent and unavailable slots remain visible. A waitlisted request can be retried after capacity is imported.
- Staff acceptance cannot silently replace a patient's preferred doctor. Legacy route confirmation cannot strand an accepted waitlisted request.
- Directory imports validate references and preserve booked slots. Concurrent workflow instances cannot overbook local capacity.
- Real HTTP tests against the sample hospital API cover authentication, directory sync, capacity races, duplicate requests, restart persistence, rollback and downtime. A failed remote reservation does not confirm a local booking.
- Connected reset and manual rescheduling are rejected to avoid orphaning remote reservations. Local-only reset revokes patient sessions and clears uploaded files.
- Document tests cover AES-256-GCM encryption of bytes, names, metadata, salts and commitments; authenticated restart; tamper rejection; ownership checks; limits; consent-gated anchoring; and offline retry behavior.
- Session tests cover unauthenticated access, patient isolation, staff-only operations, CSRF, logout/replacement, protected-mode configuration, password verification and throttling.
- The consultation and return journey retains the original due date and requires recorded check-in and attendance evidence. Messages and rebookings do not count as attendance.
- Administrative AI tests use mocked responses and a working template fallback, limited inputs and rechecks of consent and draft state.
- Version-2 AES-256-GCM envelopes bind workflow, document and booking-intent ciphertext to their expected record context; transplanting a valid envelope into another record fails. Legacy version-1 envelopes require explicit migration.
- Named staff-account tests cover salted scrypt verifiers, invalid credentials and disabled accounts. The legacy shared staff password remains an option.
- Durable encrypted booking intents are written before remote reservation; tests cover restart recovery, repeat requests, changed slot/consent, cancellation by idempotency key and unresolved remote states.
- `EDGE_ONLY=true` tests enforce loopback connector/Fabric endpoints and local administrative templates even when AI credentials are set.
- Offline rekey tests verify a new-key copy of workflow state, documents and pending booking intents, preserve the source, and reject wrong keys or an existing destination.

Test secrets and temporary databases are generated locally. No credential appears in this record.

## Browser walkthrough

The updated `scripts/browser-smoke.cjs` passed in headless Chromium using separate patient and staff contexts:

Home enquiry → automatic department inquiry → one acceptance → doctor and slot assigned → patient plan before arrival → encrypted synthetic upload visible to authorized staff → checklist → check-in → attendance → clinician-set follow-up → reminder → practical barrier → reviewed reply → automatic follow-up booking → confirmed return.

There were **no browser JavaScript errors**. Patient scoping and the absence of check-in before arrival were asserted. Patient and staff layouts were checked at **390 pixels**, with no horizontal overflow. Current screenshots are under `docs/screenshots`.

This browser run used the local directory. Separate HTTP integration tests exercised the sample hospital connector. The running local app is connected to the standalone sample API and Fabric bridge; authenticated health checks and directory synchronization succeeded.

## Real Fabric and connected journey

`npm run verify --prefix integrations/fabric` passed against the actual local two-organization Fabric 2.5.16 network. It submitted a salted synthetic commitment, queried committed state, confirmed duplicate anchoring returns the same receipt, and rejected an unauthenticated lookup. The initial transaction was `5051359033542d86fdae6dad4982a97fc6d8658c314dfc8bf9bfa4129c79f98b`.

`node scripts/verify-connected.mjs` then passed with an isolated application, a real HTTP sample hospital service and that live local Fabric network. It exercised encrypted file upload, ledger verification, one-acceptance booking, acknowledgement persistence, duplicate acceptance, patient isolation, reminder/barrier handling, separate follow-up booking and confirmed return. Its transaction was `f97e05c2cdf8073ae4d6e47ba331b292dbf57bac5134e4fd3094c974ba79f3ef`. The [machine-readable evidence](connected-proof.json) contains the commitment and checks without credentials or patient identifiers.

The network launcher also ran again successfully without deleting the ledger. Existing unrelated Docker projects were preserved. Certificates, private keys, ledger volumes and bridge tokens are excluded from Git.

The synthetic local scheduling-preview benchmark used **100 clinicians, 10,000 slots and 1,000 existing episodes**. Ten measured sequential previews had a **58.21 ms median** on this machine. The path includes decryption, cloning and matching; it excludes HTTP, concurrent users and remote reservations. This is not measured hospital throughput or waiting-time reduction.

## Public Vercel verification

The [public MVP](https://vishwas-care-demo.vercel.app) runs the workflow in separate temporary visitor workspaces. The deployed Chromium walkthrough passed home enquiry, routing, one-acceptance booking, attendance, follow-up reminders, a practical barrier, reviewed reply and confirmed return. It also checked visitor isolation, patient scoping, cross-origin rejection, disabled uploads, the supporting PDF and a 390px layout. No browser JavaScript errors occurred. See [machine-readable public evidence](public-demo-proof.json) and [deployment limits](public-demo.md).

The 43-test total includes one local regression test for the Vercel adapter's parsed-body handling, Secure/HttpOnly cookies, independent visitor state and unsafe-write rejection. The public build has no hospital/Fabric connection, persistent database or scheduler. It is not the live local connected demonstration described above.

## Local integration status

| Component | Verified status |
| --- | --- |
| Main app | Local demo at 127.0.0.1:3000; encrypted persistent state |
| Sample hospital API | Local service at 127.0.0.1:4100; authenticated health and directory sync succeeded |
| Booking connector | Actual HTTP integration tests passed; remote acknowledgement precedes local confirmation |
| Fabric | Real local two-organization network, committed transaction and document integrity lookup verified |
| WhatsApp and ABHA | Simulated; no live external exchange |
| OpenAI drafting | Implemented and tested with mocked responses; live provider unconfigured |
| Video | Updated 60-second film verified: one-acceptance scheduling, actual sample API and local Fabric proof; see brag-output/QA.md |

## Review and limitations

A separate code review found a transition that could strand an accepted waitlisted request. The route-change guard and regression test now prevent it. Additional checks preserve the patient's doctor preference and follow-up scheduling constraints. UI fixes preserve disabled controls, avoid restoring file-input paths and clear sensitive workspace content after authorization failures.

The connector now saves an encrypted booking intent before contacting the sample hospital API. Startup, explicit retry and bounded scheduled reconciliation reuse the same idempotency key; a changed slot or withdrawn scheduling consent triggers terminal cancellation by key. Unresolved remote outcomes remain visible for staff reconciliation. This recovery was tested against the sample API, not a real vendor. Existing local bookings are not automatically migrated. Connected rescheduling and reset require reconciliation. Remote capacity can change after directory synchronization; conflicts remain explicit exceptions.

The ledger integration is optional. Files remain encrypted off-chain; only consented salted commitments are submitted. A pending or failed anchor is never proof of a ledger transaction. A matching commitment establishes file integrity relative to the committed version, not medical truth or issuer identity.

Demo entry deliberately permits access to fictional staff and seed patients. Protected local mode removes those shortcuts and can use named local staff accounts with salted verifiers and named audit actors; it does not provide enterprise SSO, MFA, departmental roles, real-world patient identity verification or patient account recovery. An offline copy-only rekey utility was tested with the original database retained, but managed KMS and operational key lifecycle are still absent. `EDGE_ONLY=true` limits outbound hospital/Fabric endpoints to loopback and forces local administrative templates; it is an application policy, not a host firewall or deployed hospital edge service. The app runs on loopback HTTP. HTTPS, managed keys, verified identities, retention operations, vendor acceptance tests and independent review are required before real patient use.

No hospital time saving, patient outcome improvement, production throughput or regulatory certification is claimed.

## Reproduce

Run `npm test` with Node.js 22.13 or later. The core app needs no package installation. To run the browser check, provide a Playwright module and browser executable through `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE`, then run `node scripts/browser-smoke.cjs`.

Follow `integrations/sample-hospital/README.md` for the sample API and `integrations/fabric/README.md` for the separate Fabric network and bridge. `scripts/start-connected-demo.ps1` reads their local token files without printing secrets and starts the connected demo after health checks. `-WithoutFabric` enables the sample hospital connection while leaving ledger anchoring unconfigured.
