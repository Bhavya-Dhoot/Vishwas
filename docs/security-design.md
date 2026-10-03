# Vishwas — security design and demonstration boundary

**Decision:** use authenticated encryption for stored data and check access on the server. A blockchain is not needed for the current single-clinic workflow. This document separates the design from the evidence in [verification.md](verification.md); only completed tests are evidence of implementation.

## The answer to give a judge

“We minimise what we collect, encrypt the saved workflow with AES-256-GCM, and check patient and staff permissions on the server. The encryption key is separate from the database. A patient session can access its own journey; only a staff session can confirm a route or attendance. The demo uses fictional records. Before using real patient data, we need verified identities, HTTPS, managed keys, a retention policy and an independent security review.”

## Why this cryptography

| Need | Choice | What it provides | What it does not provide |
| --- | --- | --- | --- |
| Protect saved journey data | AES-256-GCM through Node's built-in crypto library | Encryption plus detection of modified ciphertext; a fresh random 12-byte nonce and 16-byte authentication tag per save | Protection from an attacker who has both the database and its key, or controls the running server |
| Protect the encryption key | Separate local user key file for the synthetic demo; separately supplied secret for protected local evaluation | Keeps a copied database from carrying its decryption key | A managed vault, hardware protection or automatic key rotation |
| Check a staff password | Salted scrypt verifier and constant-time comparison | Password checking without a plaintext password inside the patient database | Verified employment, multi-factor authentication or individual staff accounts |
| Restrict a patient journey | Random server session, HttpOnly cookie, per-request ownership checks | A patient identifier alone does not grant access | Real-world identity proof or a recovery process across devices |
| Protect browser-to-server traffic | HTTPS/TLS before deployment | Transport confidentiality and authentication when properly configured | At-rest protection; the current local loopback demo runs over HTTP |

OWASP recommends established authenticated encryption modes such as GCM, key separation and minimising stored information. This is why we use the platform crypto implementation rather than inventing an algorithm. See [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html). Node exposes the required authenticated-encryption primitives in its [crypto API](https://nodejs.org/docs/latest-v22.x/api/crypto.html).

For passwords, scrypt is available in Node without an additional dependency. Its work factor must be deliberately configured; password hashing serves a different purpose from encrypting records. See [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Would blockchain be better?

For this version, no. The practical threat is someone obtaining a database copy or accessing another person's journey. Encryption and access checks directly address those cases. A shared ledger addresses agreement about a transaction history among participants, which is a different requirement. NIST describes the distributed, tamper-evident ledger model in its [Blockchain Technology Overview](https://csrc.nist.gov/pubs/ir/8202/final).

| Option | Fit for Vishwas now | Decision |
| --- | --- | --- |
| AES-GCM storage plus server access checks | Directly protects stored content and limits application access | Implement and test |
| Managed cloud key service | Separates operational key control and supports stronger key lifecycle management | Use when a deployment and hosting provider are agreed |
| Public blockchain containing patient data | Replicates sensitive information beyond the clinic and makes later removal difficult | Do not use |
| Permissioned ledger across independent hospitals | Could support a jointly governed audit trail if that becomes an actual requirement | Reconsider only with named participants, governance and a specific audit need |

That assessment is our architectural judgment, not a claim that every blockchain is insecure. A future ledger should contain no patient records or identifiers; even hashes and references require a privacy review because they may be linkable. It would still need encryption, authorization and key management. The current audit history is an application log, not an independently witnessed, immutable ledger.

## Data flow and limits

The browser sends a request to the local server. The server checks the session, request origin, anti-forgery token, role and record ownership before applying the action. The workflow is serialised, encrypted and written to SQLite. The server decrypts it when opening the database, and holds working data in memory. Consequently, this is **encryption at rest, not end-to-end encryption**.

Only fictional names, languages, consent choices, referral-department requests, booking details, attendance and simulated messages belong in this demo. It has no medical-record upload, ABHA-number collection or real contact-number delivery. Optional AI drafting receives an allowlisted barrier category, language and template; raw records and patient free text are not model inputs.

Session cookies and ownership checks complement encryption. OWASP explains why [session controls](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [TLS](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html) are separate requirements. The HTTP loopback cookie configuration must not be copied unchanged into a public deployment.

## What to test and show

1. Save a fictional name and read the raw database: the saved payload is a ciphertext envelope, not the name.
2. Restart with the right key: the same journey returns.
3. Change the ciphertext or use the wrong key: opening the saved state fails; it does not silently reset or fall back to plaintext.
4. Call the state API without a session: it rejects access.
5. Use one patient's session to request another patient's action: it rejects the action.
6. Attempt a staff-only action from a patient session, or omit the anti-forgery token: it rejects the action.
7. Withdraw outreach permission: new simulated delivery is blocked, including after an AI draft was started.
8. Complete a return journey: only check-in plus staff-attested attendance closes it.

Test outcomes belong in the verification record, not inferred from this list. An automated check is not a penetration test or a compliance certificate.

## Before real patient use

Agree the data purpose and minimum fields with the hospital; define identity verification, individual staff access and revocation, consent, retention and deletion, backup and recovery, incident response and deployment ownership. Add HTTPS with Secure cookies, managed keys, tested key rotation and restore, operational monitoring and independent security review. A lost key needs a recovery plan; an exposed key needs a rotation and incident plan. See [OWASP Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html).

A local key file shares the host's trust boundary. Operating-system permissions and full-disk encryption remain relevant; application encryption alone does not protect a fully compromised account or process. SQLite size and schema are not concealed. The current design also does not detect replay of an older valid database snapshot or prove that an authorized operator never altered an entry.

ABHA consent remains simulated. A real connection needs applicable ABDM onboarding and scoped patient consent; the identifier itself is not a decryption key or blanket access permission. See the [ABDM sandbox](https://sandbox.abdm.gov.in/sandbox/v3) and the [Ministry of Health consent explainer](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2017129&lang=2&reg=48).

Do not claim “unhackable”, “blockchain-secured”, “end-to-end encrypted”, “ABDM-certified”, “HIPAA compliant” or “DPDP compliant” from this prototype.
