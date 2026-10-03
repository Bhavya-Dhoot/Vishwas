# Security, recovery and local edge operation

This review strengthens a synthetic-data prototype. It does not certify a hospital deployment. The video is unchanged. See [verification](verification.md) for the latest executed checks.

## What changed and why

| Gap | Implementation | Remaining boundary |
| --- | --- | --- |
| An encrypted row could be copied to another location | AES-256-GCM additional authenticated data binds the payload to its record context; existing version-1 envelopes are explicitly migrated | A compromised application with its key can still read or rewrite records; valid old snapshots are not independently rollback-proof |
| Key rotation could corrupt the only copy | Tested offline copy-only rekey creates and verifies a new database under a new key, including documents and pending booking intents, while retaining the source | Requires the application to be stopped and an operator to switch configuration and test restore; no managed KMS or automatic rotation |
| A process could crash between hospital acknowledgement and local save | Encrypted persistent booking intent, stable idempotency key, startup/retry reconciliation and cancellation by key in the sample API | One application process; a real vendor must implement equivalent reservation and cancellation semantics |
| Shared staff password obscured attribution | Optional named staff directory with unique salted scrypt verifiers, disabled-account checks, generic failed-login responses and named audit actors | Local provisioning, shared staff permissions and restart-based account changes; no SSO, MFA or employment verification |
| An accidentally configured cloud service could receive requests | `EDGE_ONLY=true` blocks non-loopback hospital/Fabric endpoints and forces local administrative templates even if cloud AI credentials exist | Application-level policy, not a firewall or a geographically distributed edge deployment |
| Scheduling repeated expensive array scans | Occupancy and clinician load are indexed once per match | Whole-state encrypted JSON remains appropriate only for the current small single-process prototype |
| Scheduling consent could not be changed after enquiry | Patient-scoped consent action and UI; pending recovery rechecks the current state | A confirmed appointment is not cancelled by withdrawing future automatic-scheduling permission; staff arrange that change |
| Duplicate ledger requests could submit unnecessary transactions | Bridge reads an existing receipt first; contract remains idempotent and never overwrites commitments | Simultaneous submissions may still conflict and need a retry |
| Bridge resource use was unbounded | Eight concurrent requests, a small JSON body limit, header deadline and strict bearer-token format | Host-level monitoring, rate policy and certificate lifecycle remain operator responsibilities |
| Accidental credential publication | Repeatable Gitleaks history and publishable-file scans, ignored credential files and CI checks | Scanning detects known patterns; it cannot prove that every possible sensitive value is absent |

## Where processing happens

The Node.js service on the local host performs referral routing, slot matching, encryption, reminder checks and recovery. SQLite stores encrypted state, documents and pending booking intents on that host. The browser keeps the current screen in memory and uses an HttpOnly session cookie; it does not persist patient records in localStorage, IndexedDB or a service-worker cache.

Set `EDGE_ONLY=true` for a local evaluation. Cloud AI calls are disabled, and connector/ledger endpoints must use loopback addresses. Local templates, the sample hospital service and the local Fabric bridge remain available. If the hospital connector is unavailable, a booking is not presented as confirmed. Loss of access to the application itself requires reconnecting; this is not an offline patient-browser application.

The connected demo launcher enables this policy. A real hospital-side deployment would still need HTTPS, verified access, approved network endpoints and host firewall rules. The current listener intentionally remains loopback-only. No real hospital edge installation has been tested.

`node scripts/benchmark-edge.mjs` measured ten sequential previews over **100 synthetic clinicians, 10,000 slots and 1,000 existing episodes**: **58.21 ms median** on this machine. The measured path includes decryption, cloning and matching. It excludes concurrent users, HTTP, remote reservations and a hospital workload. Do not turn its milliseconds into an unmeasured throughput or waiting-time claim.

## Named local staff accounts

Use `scripts/create-staff-account.mjs <outside-repository accounts.json> <username> <display-name>` while the application is stopped. Supply `STAFF_INITIAL_PASSWORD` privately through the process environment. The tool stores a salted verifier, never the password, and refuses a location inside the repository. Remove the password variable from the calling shell afterward.

Set `APP_MODE=protected`, `STAFF_ACCOUNTS_FILE` to that external file, and supply `STATE_KEY` securely. The login page then requests a username and password. A configured account file takes precedence over the legacy shared-password option. To revoke an account, set its `disabled` field to `true` in the protected file and restart the app; the restart also clears existing sessions. Restrict the file with OS permissions. All named accounts have the existing staff role; departmental RBAC is not claimed.

## Offline rekey and recovery

Stop the application before rotation. Run `node scripts/rekey-database.mjs --offline <source.sqlite> <new.sqlite> <old-key-file> <new-key-file-outside-repository>`. The utility refuses an existing destination, creates a new random key outside the repository, copies and verifies encrypted workflow state, document rows and pending booking intents, and preserves the original database and key. Open and exercise the new copy before switching `DB_PATH` and `STATE_KEY`; retain the original until recovery is tested. The [automated rekey test](../test/rekey.test.mjs) covers wrong-key refusal and pending-intent preservation. This is a local operator tool, not a managed key service or automatic disaster recovery.

## Blockchain decision

Keep medical records and their metadata encrypted off-chain. Keep the existing random 32-byte salt and SHA-256 commitment; an unsalted public file hash would be easier to correlate. Fabric provides a consented integrity receipt, not confidentiality, clinical interpretation or proof of issuer identity. Do not add a public chain, custom cryptography or a second consensus system to this workflow.

The bridge uses TLS to the local peer and a service signing identity. Both local organizations endorse new commitments. Read-before-submit avoids an extra ledger transaction for an already anchored commitment. Peer membership does not by itself define hospital governance; real institutions must agree who writes, verifies, operates and responds to incidents. A single hospital can omit Fabric altogether.

The choices follow authenticated-encryption and key-separation guidance in [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) and the discussion of predictable data and salt in [Fabric private data documentation](https://hyperledger-fabric.readthedocs.io/en/release-2.5/private-data/private-data.html).

## SWOT items that cannot be closed by a local code change

- **Hospital integration:** a sample adapter is implemented; a real vendor must supply access, identifiers and tested booking/cancellation semantics.
- **Patient identity and account recovery:** real verification needs a selected identity/contact provider and a hospital-approved process.
- **WhatsApp and ABDM:** provider onboarding, credentials, consent flows and delivery/revocation callbacks are not supplied.
- **Medical document authenticity:** an integrity receipt cannot certify a report; issuer signatures or an approved source would be a separate integration.
- **Governance and data lifecycle:** retention periods, provider deletion, managed keys, incident ownership and consortium membership require institutional decisions.
- **Clinical escalation:** medical messages need an agreed staffed process; this project cannot decide urgency or recommend treatment.
- **Value and adoption:** a real pilot must measure staff effort, duplicate entry, booking time, support cost and planned return attendance.

These remain disclosed limitations, with a concrete next step for each. Describing them as solved would overstate what this repository demonstrates.
