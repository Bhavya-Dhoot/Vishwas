# Sample hospital connector

This is a working HTTP integration against a fictional hospital API, not a claim of compatibility with a hospital vendor. A real deployment needs a vendor adapter, identity and access management, operations support, and a review of the hospital's scheduling rules.

Node.js 22.13 or later is required. No packages are needed.

```powershell
node integrations/sample-hospital/server.mjs
```

The service listens on `127.0.0.1:4100`. Its generated API token is stored outside the repository at `%LOCALAPPDATA%\Vishwas\sample-hospital-api.token` on Windows, or `~/Vishwas/sample-hospital-api.token` when `LOCALAPPDATA` is absent. It never prints the secret. Reservation state persists in the ignored `data/sample-hospital.sqlite` file. `HOSPITAL_API_TOKEN`, `HOSPITAL_API_TOKEN_FILE`, `SAMPLE_HOSPITAL_PORT`, and `SAMPLE_HOSPITAL_DB` can override these defaults.

Start Vishwas in another PowerShell session with the matching secret:

```powershell
$env:HOSPITAL_API_URL = 'http://127.0.0.1:4100'
$env:HOSPITAL_API_TOKEN = (Get-Content -LiteralPath "$env:LOCALAPPDATA\Vishwas\sample-hospital-api.token" -Raw).Trim()
node --env-file-if-exists=.env server.mjs
```

Use the staff connector control to sync the directory before accepting an inquiry. The directory has six fictional clinicians across three departments and 21 days of slots generated from the service's UTC start date. Existing local bookings cannot be silently removed or changed by an import. If old locally booked slots no longer appear in a new directory, import is rejected and the adapter must retain those historical slots.

## API contract

Every request requires `Authorization: Bearer <token>`. The API is intended for server-to-server calls and rejects browser `Origin` headers. The connector accepts HTTPS, with HTTP allowed only for loopback development. Redirects are refused, response sizes are bounded, and requests time out. Tokens and remote error bodies are never returned to the patient interface.

| Method | Path | Request / response |
|---|---|---|
| GET | `/health` | `{ "status": "ok", "kind": "sample-hospital", "data": "fictional" }` |
| GET | `/directory` | `{ "departments": [...], "specialists": [...], "slots": [...] }` |
| POST | `/bookings` | `{ "idempotencyKey": "opaque-key", "slotId": "slot-id" }` → `{ "id": "reservation_UUID", "idempotencyKey": "opaque-key", "slotId": "slot-id", "status": "confirmed" }` |
| DELETE | `/bookings/:id` | `{ "id": "reservation_UUID", "status": "cancelled" }` |

Directory fields:

```json
{
  "departments": [{ "id": "endocrinology", "name": "Endocrinology", "location": "First floor, Desk B" }],
  "specialists": [{ "id": "sp_endo", "name": "Dr. Arjun Mehta (Demo)", "departmentId": "endocrinology", "languages": ["English", "Hindi"], "room": "F-02" }],
  "slots": [{ "id": "sp_endo_2026-10-03_morning", "specialistId": "sp_endo", "date": "2026-10-03", "time": "10:00", "capacity": 2 }]
}
```

Capacity is the total number of reservations allowed for a slot. The reservation endpoint is the final authority on availability; a previously fetched directory is not a lock. The current sample language set matches Vishwas's English/Hindi interface.

Repeated booking requests with the same key and slot return the same reservation. A key cannot move to a different slot. Capacity checks and reservation writes share a SQLite transaction. Cancellation is idempotent; retrying a cancelled key reactivates the same reservation only if capacity is available. The sample API accepts no patient names, record contents, ABHA numbers, or other clinical fields.

Vishwas previews the exact assignment without persisting it, requests the hospital reservation, and commits the local appointment only after acknowledgment. If the local revision changed or saving fails, the server attempts cancellation. Network timeouts can leave an uncertain external reservation: retrying the same opaque key reconciles it. A failed rollback is an operational exception, not a confirmed local appointment. Production adapters also need scheduled reconciliation and monitoring of such exceptions.

Run the executable checks with `node --test test/connector.test.mjs`. They cover real HTTP directory import and booking, capacity collisions, duplicate calls, restart persistence, cancellation, local commit conflict, outage behavior, malformed responses, redirect refusal, and timeout handling.
