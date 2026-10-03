# Local Hyperledger Fabric demonstration

This is a real permissioned Fabric 2.5.16 ledger, based on the official two-organization test network at commit `5789681b4f4d24e58fa40f19a69f5496892374b6`. Both organizations endorse writes. A single Raft orderer runs locally. This test network does **not** demonstrate independent institutional governance, high availability, or a production deployment.

Ledger values contain only a 32-byte salted commitment and Fabric transaction metadata. The application retains random salts, patient data, record IDs, filenames, and encrypted document bytes off chain. Never supply an unsalted patient/document hash. The chaincode permits Org1MSP clients, validates lowercase hex, and returns the original record for duplicate anchors without overwriting it. Consent and document access remain enforced by the application; the ledger is an integrity receipt, not a medical database or consent engine. Fabric transaction envelopes also contain the submitting organization's certificate and transaction arguments; use a service identity, never a patient identity.

## Windows / Docker Desktop

Requirements: running Docker Desktop Linux engine, PowerShell 7, Node 22, Git, internet for initial downloads. The tooling container mounts the Docker socket, as required by the sample deployment; run only reviewed code. Existing Docker projects are not removed or modified. All published ports bind `127.0.0.1`. Ports 7050, 7051, 7053, 9051, 9443–9445 and bridge port 3101 must be free.

From the repository root:

```powershell
npm ci --prefix integrations/fabric
npm ci --prefix integrations/fabric/chaincode
./integrations/fabric/network.ps1 start
./integrations/fabric/start-bridge.ps1
```

Keep the bridge terminal running. In the application terminal, configure the same locally generated token (do not paste it into source control or logs):

```powershell
$env:FABRIC_GATEWAY_TOKEN=[IO.File]::ReadAllText((Join-Path $PWD 'data/fabric/bridge-token.txt')).Trim()
$env:FABRIC_GATEWAY_URL='http://127.0.0.1:3101'
npm run verify --prefix integrations/fabric
```

Then start the main application in that terminal using its README. Certificates, keys, samples, ledgers and the bridge secret stay under gitignored `data/fabric` or project-scoped Docker volumes. The bridge connects with TLS using the Org1 User1 signing identity; its bearer-authenticated HTTP listener is loopback only. TLS signing credentials and local host access must be protected by the operator.

The smoke test generates a random salted synthetic commitment, submits through Fabric Gateway, waits for commit, queries committed state, verifies idempotency, and checks that requests without the secret fail. Its transaction ID is a real Fabric transaction, not a simulated receipt. `npm test --prefix integrations/fabric` separately checks chaincode validation, organization authorization, and no-overwrite behavior without pretending to be a network test.

## Bridge contract

All endpoints require `Authorization: Bearer <FABRIC_GATEWAY_TOKEN>`.

* `POST /commitments` with exactly `{"commitment":"<64 lowercase hex>"}` returns `{commitment,transactionId,status:"anchored",exists:true}` only after committed-state verification.
* `GET /commitments/<64 lowercase hex>` evaluates the ledger and returns that record or HTTP 404 `{exists:false}`.
* `GET /health` queries the ledger and reports `{status:"ready",network:"hyperledger-fabric"}`; unavailability returns HTTP 503. It does not expose credentials or patient data.

The bridge permits at most eight concurrent requests, validates JSON and token format, and checks for an existing commitment before submitting another transaction. Duplicate receipts normally use a ledger query; simultaneous writes may still need retry.

On Fabric failure, the bridge returns 503 and the application must retain a pending/unavailable proof state. A local hash by itself is never a confirmed Fabric proof.

Stop the bridge with Ctrl+C. Stop only this demo's containers while retaining ledgers:

```powershell
./integrations/fabric/network.ps1 stop
```

Do not run the upstream `network.sh down` script: its broad cleanup is disabled in this adapted checkout. Deliberately deleting demo volumes loses its receipts; maintain ledger persistence for as long as receipts need verification.

References: [official Fabric test network](https://hyperledger-fabric.readthedocs.io/en/release-2.5/test_network.html), [Fabric Gateway Node API](https://hyperledger.github.io/fabric-gateway/main/api/node/), [Fabric 2.5.16 release](https://github.com/hyperledger/fabric/releases/tag/v2.5.16).
