# Vishwas — 75-second jury demo

**Set up:** Run `npm start` on Node.js 22.13+. Use separate browser profiles (for example, a normal window for staff and an incognito window for the patient), because ordinary tabs share a session cookie. Open `http://127.0.0.1:3000` for staff and enter the staff demo; open `http://127.0.0.1:3000/?view=patient` in the patient profile. Reset before creating a new fictional request. For a connected demonstration, start the [sample hospital service](../integrations/sample-hospital/README.md) and use `scripts/start-connected-demo.ps1`; sync its directory first. See [verification](verification.md) for any confirmed live Fabric run. WhatsApp and ABHA remain simulated. Use the short spoken lines below while clicking.

| Time | Show | Say |
| --- | --- | --- |
| 0–12 s | Patient tab: submit a new request with the department from an existing referral, language and scheduling consent. | “The patient starts at home. They supply the department already written on their referral and their preferences.” |
| 12–27 s | Staff tab: refresh, open the department inbox and accept the request once. Point to assigned doctor, slot, reason and policy version. | “The correct department receives it. One acceptance matches an available doctor and slot with the patient’s consent. Unclear referrals go to coordination, and unavailable matches stay visible.” |
| 27–39 s | Patient tab: refresh journey. Point to doctor, time, clinic location and checklist before check-in. Optionally show a fictional uploaded file. | “The patient has a plan before travelling. Files are encrypted for authorized staff; uploaded content never chooses a specialty.” |
| 39–54 s | Staff tab: check in, confirm attendance, enter a clinician-set return date. | “At the visit, staff confirm attendance. The clinician sets the return date, which opens a separate follow-up.” |
| 54–68 s | Advance demo date and run reminders; show simulated inbox and a selected travel/work barrier with its staff draft. | “With consent, reminders appear here in a simulated inbox. A practical barrier becomes a staff task and a reviewed administrative reply.” |
| 68–75 s | Point to open follow-up and its original due date. | “The return stays open until staff verify attendance. Rebooking or messaging alone does not count.” |

**If the click path takes longer:** Stop after the 39-second pre-arrival reveal. State the rest as: “The same journey records attendance and tracks the clinician-set return until the patient actually comes back.” The pre-arrival reveal is the central proof. For the upload, use only the synthetic examples in [demo-files](demo-files); stay within the 2 MiB limit.

**If asked about impact:** “We have verified the local workflow with tests and a two-browser walkthrough. We have not measured reduced waiting time, clinic throughput or clinical outcomes.” See [verification](verification.md) and the [jury answers](swot-and-judge-qa.md).

## Optional security proof after the journey

Run `npm test` to demonstrate repeatable checks. Explain that workflow state and uploaded files are encrypted with a key held separately, and that opening a patient URL alone cannot grant access. If the Fabric bridge is running and verified, show the consented file’s commitment lookup; otherwise show `anchor_failed` or `unavailable` honestly. A matching ledger commitment checks integrity relative to the committed file, not clinical authenticity. The sample hospital connector can demonstrate directory sync and acknowledged booking, but it is not a real vendor integration. Use the [security design](security-design.md) and [verification record](verification.md) for exact evidence. Do not reveal keys, tokens, passwords or cookies on a projector.
