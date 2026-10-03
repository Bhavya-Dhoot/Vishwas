# Vishwas

**A referral routed from home. A prepared visit. A follow-up that stays visible.**

Vishwas starts before the patient travels to hospital. From home, the patient submits the department named in an existing referral, language and scheduling preferences, and optional supporting files. Exact referral departments reach their department inbox; unclear requests reach coordination. One staff acceptance triggers consented doctor and slot matching. The patient sees the appointment, location and preparation checklist before arrival. The same journey then carries through check-in, reminders and a confirmed return visit.

**Applicant:** Bhavya Dhoot · **Track:** Diabetes · **Primary user:** Doctor / Care Team
**Submission category:** Clinic Operations & Patient Flow

**[Open the public MVP](https://vishwas-care-demo.vercel.app)** · **[Supporting PDF](https://vishwas-care-demo.vercel.app/Vishwas-Supporting-Document.pdf)** · **[Research papers](docs/research-references.md)**

The Vercel demo uses separate temporary visitor workspaces. Sessions may reset; uploads and hospital/Fabric connections are disabled there. It runs without a laptop or tunnel. The local version below provides persistent encrypted state and the connected demonstration. See [hosted demo details](docs/public-demo.md) and [WhatsApp-ready links](docs/share-links.txt).

![Patient starts a pre-arrival request in Vishwas](docs/screenshots/pre-arrival.png)

## Run it

Use Node.js **22.13 or newer**. The core app needs no dependency installation or build step.

```sh
git clone https://github.com/Bhavya-Dhoot/Vishwas.git
cd Vishwas
npm start
```

Open the [staff entry](http://127.0.0.1:3000) in a normal browser window and the [patient pre-arrival page](http://127.0.0.1:3000/?view=patient) in a separate browser profile or incognito window. Ordinary tabs share a session cookie. Enter the staff demo and submit a new fictional request from the patient window. Use **Demo controls → Reset demo** before starting a fresh walkthrough. Node 22 may print an experimental SQLite warning.

The default **demo mode** deliberately offers entry to fictional staff and seeded patient sessions. Saved state is encrypted in the ignored `data/vishwas-demo-encrypted.sqlite` file; its key is stored separately under the current user's local application-data directory. Keep both for recovery. The previous plaintext demo database is not migrated or overwritten.

```sh
npm test
```

## Try the journey

1. On the patient page, submit a fictional request from home. Supply the exact department named on an existing referral, or leave it unclear for coordination. Set language, scheduling consent and any date, time or doctor preference. The server creates a session bound to that patient; the journey URL alone does not grant access.
2. In the staff tab, refresh and accept the request from its department inbox or the coordination inbox. With consent, Vishwas assigns a matching doctor and available slot in one action. It records the routing and scheduling reasons and policy version. An incompatible request stays waitlisted; without scheduling consent it awaits staff scheduling. No specialty is inferred from symptoms or uploaded records.
3. Return to the patient tab and click **Refresh journey**: the doctor, time, room and checklist appear before any check-in. Upload a small fictional PDF, UTF-8 text or JSON file if desired. The encrypted file stays off-chain; an optional Fabric commitment requires separate consent. Sample files are in [docs/demo-files](docs/demo-files).
4. Mark document readiness from the patient page. Staff see those updates in the same journey.
5. At arrival, staff record check-in and attendance evidence, then enter a clinician-set return date. The patient can refresh to see the new follow-up.
6. Advance the demo clock and run reminders. Add a travel/work/booking barrier, review its draft and record staff help.
7. Accept the separate follow-up inquiry to arrange its appointment, then verify return attendance. A booking or message alone does not complete it. Manual rescheduling is available in local-only mode; connected changes require reconciliation.

The demo begins on 3 October 2026, with slots through 20 October. The automatic reminder check runs every minute while the server is on; **Run reminders** invokes the same logic immediately.

## What is implemented

- Exact referral-department routing to an inbox, coordination for unclear requests, and one-acceptance deterministic matching with reasons, policy version and waitlist handling.
- Encrypted PDF/text/JSON uploads, scoped download and deletion, optional salted Fabric commitments, document-presence checklist, check-in and staff-attested attendance.
- Separate follow-up episodes, immutable original due dates, local-only rescheduling and operational counts.
- English/Hindi reminders in a simulated WhatsApp inbox, patient/caregiver consent, logistical replies, reviewed drafts and audit history.
- Optional OpenAI administrative reply drafting, with a working clinic-template fallback.
- Responsive staff/patient demo views and optional simulated ABHA consent.
- Sample hospital REST connector for directory sync and acknowledged reservations, with opaque IDs and idempotency.
- AES-256-GCM encrypted state and document records, separate keys, server sessions, patient ownership checks, staff-only actions and anti-forgery checks.

See the [patient's plan before arrival](docs/screenshots/patient-plan.png), [staff workspace](docs/screenshots/overview.png), [routing screen](docs/screenshots/routing.png) and [follow-up inbox](docs/screenshots/follow-up.png).

## Integration status

The **local, synthetic-data prototype** has passed a connected journey from upload through confirmed return using the sample hospital connector and a real local Hyperledger Fabric network; see [verification](docs/verification.md) and [transaction evidence](docs/connected-proof.json). The separate [public Vercel demo](docs/public-demo.md) demonstrates routing and follow-up without those connections. No real hospital has supplied an API or accepted an integration. WhatsApp delivery and ABHA consent are simulated. No real messages are sent or ABHA records fetched, and no hospital pilot has taken place.

For the connected local demonstration, start the [sample hospital service](integrations/sample-hospital/README.md), then use `scripts/start-connected-demo.ps1` to preflight its token and start Vishwas with a persistent connected database. The script can also preflight the [local Fabric bridge](integrations/fabric/README.md); `-WithoutFabric` runs the connector demonstration without ledger anchoring. These are separate local services with their own setup. `HOSPITAL_API_URL` and `HOSPITAL_API_TOKEN` configure the connector; the sample token lives outside the repository under `%LOCALAPPDATA%\Vishwas\sample-hospital-api.token`. Sync the directory from the staff control before accepting a new inquiry. Do not enable a connector against existing local bookings until those bookings are reconciled. While connected, reset and manual booking/rescheduling are blocked to avoid orphan reservations. An encrypted durable booking journal now replays pending reservations on startup and on bounded scheduler passes. The sample API supports lookup and terminal cancellation by idempotency key. Unresolved bookings stay pending; a real adapter must implement the same guarantees.

The AI adapter is implemented and tested with mocked responses. To configure it, copy .env.example to .env and set OPENAI_API_KEY and OPENAI_MODEL for a supported Responses API model. No key is required to use the prototype. **Improve draft** sends only a selected administrative category, language and approved template; it does not send patient records or free text. Staff still approve the result. Live AI calls have not been verified in this environment.

Keep the server on localhost and use fictional data. Demo entry is deliberately open; it is not patient identity verification. The separate protected local mode supports named staff accounts (or a legacy shared password) and requires a supplied encryption key, disables demo entry/reset/date changes, and starts without seeded patient records. It remains a synthetic-data evaluation, with a fictional clinician directory and no public deployment.

## Security and protected local evaluation

See [security design and blockchain decision](docs/security-design.md) for the threat model, choices and limitations. The saved workflow is encrypted; the server decrypts it to operate, so this is **not end-to-end encryption**. Losing the key prevents recovery. A compromised server can access working data.

For protected local evaluation, set `APP_MODE=protected`, a unique `STAFF_PASSWORD` of at least 12 characters, and `STATE_KEY` containing 64 hexadecimal characters generated by a cryptographically secure random generator. Use a new database path or the protected-mode default. Keep these values in an ignored environment file or supply them through a secret manager; never commit or project them. `.env.example` documents the configuration without real secrets.

Protected mode supports named staff accounts with unique salted scrypt verifiers, login throttling and server sessions. Staff actions retain their individual audit actor. It does not provide patient identity proof, SSO/MFA or patient account recovery after session expiry. Before real use, add HTTPS, managed key lifecycle and recovery, verified identities, hospital integrations, retention/deletion procedures and an independent security review. No regulatory certification is claimed.

For named local accounts, edge-only operation and the closed/open security gaps, see [security hardening](docs/security-hardening.md). `EDGE_ONLY=true` forces local templates and loopback-only connector endpoints. The connected demo launcher enables it. No patient records are cached for offline browser use. AES-GCM binds state, document and booking-intent records to their storage context.

Run `node scripts/benchmark-edge.mjs` for a synthetic local scheduling benchmark; it is not a production capacity claim.

## Submission materials

- [Creative video brief and ready-to-paste Brag prompts](context.md)
- [Updated 60-second demo video](brag-output/brag.mp4) · [poster](brag-output/brag.jpg) · [share copy](brag-output/share-copy.txt)
- [All form answers and core idea](docs/submission.md)
- [Form values and length checks](docs/submission.json)
- [Implementation, ABHA scope and next steps](docs/build-plan.md)
- [Eight-slide deck context and 60-second pitch](docs/pitch-deck-context.md)
- [SWOT and jury Q&A](docs/swot-and-judge-qa.md)
- [Proposed business model, pricing and pilot economics](docs/business-model.md)
- [75-second live demo script](docs/demo-script.md)
- [Security design and blockchain decision](docs/security-design.md)
- [Verification record](docs/verification.md)
- [Supporting PDF](output/pdf/Vishwas-Supporting-Document.pdf)
- [Research references with direct links](docs/research-references.md)
- [Public demo and deployment limits](docs/public-demo.md)
- [Repository security scan](docs/repository-security-audit.md)

The project started with the concept and an existing deck. This is a **new solution**, with the prototype built during submission preparation and its progress disclosed. There was no previously launched product. The deck itself was not supplied for review or upload.

The video uses real screens from the synthetic workflow with captions and music. It was made with the requested [brag-scaled skills](https://github.com/Bhavya-Dhoot/brag-scaled); it contains no patient-outcome claims or live messages.

## Scope and evidence

Routing uses only a valid department ID or exact department label from an existing referral. Staff accept the department before assignment. No diagnosis, medical-record interpretation, clinical risk scoring, investigation suggestions or treatment advice are implemented.

Automated tests cover the full workflow, booking/consent constraints, persistence and optional AI drafting. A desktop browser walkthrough also completed the journey through a confirmed return, and the mobile layout was checked at 390px. All dashboard figures are synthetic; no reduction in hospital waiting time or clinical outcome has been measured.
