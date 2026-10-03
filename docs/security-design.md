# Vishwas — security design and demonstration boundary

**Decision:** encrypt uploaded files and workflow state, enforce access on the server, and offer a permissioned integrity receipt when the uploader consents. The ledger is optional: appointment coordination works without it. [Verification](verification.md) records which integrations have actually been exercised.

## The answer to give a judge

“The patient’s file and its metadata are encrypted in local SQLite with AES-256-GCM. The key is stored separately. Patient sessions can access only their own files, and staff access is checked on the server. With explicit consent, we can put a salted commitment on Hyperledger Fabric and later compare it with the saved file. No name, document, ABHA number, filename or raw file hash goes on-chain. The demo uses fictional data; real deployment still needs verified identities, HTTPS, managed keys, retention rules and a security review.”

## Stored data and access

The application accepts PDF, UTF-8 text and JSON files up to 2 MiB each, at most five per patient. It checks file structure and type but does **not** interpret clinical content or establish that a report is genuine. The full document record—patient association, sanitized filename, type, byte count, timestamp, random salt, commitment and bytes—is encrypted before SQLite stores it. Workflow state is also encrypted. The server decrypts data to operate, so this is **encryption at rest, not end-to-end encryption**. A compromised server or host account can access working data.

| Need | Choice | Limit |
| --- | --- | --- |
| Protect stored data | AES-256-GCM through Node's crypto API, with a fresh 12-byte nonce, authentication tag and record-context binding on every save | A stolen database remains vulnerable if the separate key is also stolen; an older valid snapshot can be replayed |
| Keep keys apart | Local user key file for the synthetic demo; supplied key for protected local mode; tested offline copy-only rekey with source retained | No managed vault or automatic rotation; live restore and incident procedures remain operational work |
| Restrict access | Server sessions, HttpOnly cookies, anti-forgery checks, patient ownership and staff role checks | Demo entry is deliberately open for fictional identities; protected mode supports named staff accounts; the legacy shared-password option remains |
| Protect traffic | HTTPS/TLS required for public deployment | The local loopback demo uses HTTP |

These choices follow [OWASP's cryptographic storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [key management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html) guidance. Protected local mode also checks salted scrypt staff-password verifiers and limits failed logins. Named local accounts attribute staff actions but do not verify employment, provide SSO/MFA or implement departmental roles. The offline rekey utility copies encrypted state, documents and pending booking intents under a new key, verifies them, and leaves the source untouched; a deployment still needs a tested restore and key-rotation procedure.

## Why and how Fabric is used

Fabric is a proposed shared integrity registry for participating institutions. The application computes `SHA-256(random 32-byte salt || SHA-256(file bytes))`. The salt and file remain encrypted off-chain. Only the resulting 64-character commitment is submitted through a bearer-authenticated bridge to the permissioned ledger. The local two-organization test network is a development setup; it does not establish real hospital identities or consortium governance. See the [Fabric test-network guide](https://hyperledger-fabric.readthedocs.io/en/release-2.5/test_network.html) and [Fabric private-data architecture](https://hyperledger-fabric.readthedocs.io/en/latest/private-data-arch.html).

An upload succeeds even if anchoring fails: the encrypted file is saved with `anchor_pending` or `anchor_failed`, and an authorized user can retry. Verification recomputes the commitment and checks the ledger. A **verified** result requires both a matching local computation and a successful ledger lookup. A match only shows integrity relative to what was committed; it does not prove the issuer's identity, medical accuracy, correct patient association or clinical suitability. If the ledger is unavailable, verification says so rather than showing a badge.

Deleting a file removes the encrypted off-chain record. A commitment already written to Fabric remains, as the upload consent must explain. Without the salt and file, it should not reveal the document, but metadata and linkability still need review by the participating institutions. The ledger cannot replace encryption, authorization, backups or consent. A single hospital can operate the workflow with ledger anchoring disabled. A shared ledger is justified only if separate organizations agree on its governance and need a jointly witnessed record; [NIST's blockchain overview](https://csrc.nist.gov/pubs/ir/8202/final) describes that model.

The Fabric adapter, chaincode, bridge and setup are in [the local Fabric guide](../integrations/fabric/README.md). The actual local ledger and a connected document-upload verification passed; [verification.md](verification.md) records the transactions and [connected-proof.json](connected-proof.json) records the workflow checks. This establishes a working development integration, not production governance or independent security certification.

## Connector and failure boundaries

The sample hospital service accepts opaque booking keys and slot IDs, not names or document contents. Vishwas imports its directory, reserves remotely before committing a local booking, and attempts cancellation if the local commit fails. Reservation calls use an idempotency key; retrying after an uncertain network result can reconcile the same request. Encrypted booking intents persist before remote requests. Startup and bounded scheduled reconciliation reuse their idempotency keys. Terminal cancellation by key handles a changed slot or consent, including late requests. Real vendor APIs must support equivalent semantics. With a connector configured, demo reset and manual booking or rescheduling are blocked because they could orphan remote reservations. Existing local bookings must be reconciled before connecting a real hospital directory. See the [sample connector contract](../integrations/sample-hospital/README.md).

## Hardening and local edge controls

Version-2 AES-GCM envelopes bind each record to its expected storage context; validated legacy envelopes migrate explicitly. Named local staff login, patient scheduling-consent changes, durable booking recovery and local-only outbound policy are implemented. The bridge reads before duplicate writes and bounds request concurrency. `EDGE_ONLY=true` forces administrative templates and loopback-only hospital/Fabric endpoints. These controls reduce specific failure modes; they do not make the application independently immutable or protect a compromised host. See the [hardening record](security-hardening.md) and [verification](verification.md).

## Before real patient use

The separate [Vercel demonstration](public-demo.md) uses HTTPS and Secure/HttpOnly/SameSite cookies with same-origin writes and the existing CSRF/role checks. Each visitor receives a disposable in-memory workspace. Upload endpoints are blocked, no connector credentials are deployed, and startup rejects private deployment settings. Open access is only for fictional demonstration data. This does not publish the protected local database or its keys.

Agree the data purpose and minimum fields with a hospital. Add verified patient identities and institution-managed staff access, HTTPS with Secure cookies, managed keys and tested restore/rotation, documented consent and deletion, protected backups, incident response, monitoring, and an independent security review. Each hospital adapter needs vendor API access, identifier mapping, booking rules and acceptance testing. Fabric use additionally needs institutional membership, certificate and key operations, retention policy and an agreed answer to how remaining commitments are explained on deletion. The local demo and simulated ABHA/WhatsApp flows provide none of these approvals.

Do not claim “unhackable”, “end-to-end encrypted”, “ABDM-certified”, “HIPAA compliant”, “DPDP compliant” or that a matching commitment proves a record authentic.
