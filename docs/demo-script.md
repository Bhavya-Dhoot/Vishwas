# Vishwas — 75-second jury demo

**Set up:** Run `npm start` on Node.js 22.13+. Use two separate browser profiles (for example, a normal window for staff and an incognito window for the patient), because ordinary tabs share a session cookie. Open `http://127.0.0.1:3000` for staff and enter the staff demo; open `http://127.0.0.1:3000/?view=patient` in the patient profile and start a new fictional request. Reset before creating that request if needed. This is a local demonstration; WhatsApp, ABHA and hospital connections are simulated. Use the short spoken lines below while clicking.

| Time | Show | Say |
| --- | --- | --- |
| 0–12 s | Patient tab: submit a new request with a referral department and language. | “The patient starts at home, before travelling. They give the department written on their referral and their preferred language.” |
| 12–27 s | Staff tab: refresh, open the new request, confirm the referral department, select a matching specialist and available slot, book. | “A care-team member confirms that department. Vishwas shows matching clinicians and capacity-checked slots; it never guesses a specialty from symptoms.” |
| 27–39 s | Patient tab: refresh journey. Point to doctor, time, clinic location and checklist while no check-in is recorded. | “Now the patient knows where and when to go, and which papers to carry, before arrival. The checklist only records whether papers are present.” |
| 39–54 s | Staff tab: check in, confirm attendance, enter a clinician-set return date. | “At the visit, staff confirm attendance. The clinician sets the return date, which opens a separate follow-up.” |
| 54–68 s | Advance demo date and run reminders; show simulated inbox and a selected travel/work barrier with its staff draft. | “With consent, reminders appear here in a simulated inbox. A practical barrier becomes a staff task and a reviewed administrative reply.” |
| 68–75 s | Point to open follow-up and its original due date. | “The return stays open until staff verify attendance. Rebooking or messaging alone does not count.” |

**If the click path takes longer:** Stop after the 39-second pre-arrival reveal. State the rest as: “The same journey then records attendance and tracks a clinician-set return until the patient actually comes back.” The pre-arrival reveal is the central proof.

**If asked about impact:** “We have verified the local workflow with tests and a two-browser walkthrough. We have not measured reduced waiting time, clinic throughput or clinical outcomes.” See [verification](verification.md) and the [jury answers](swot-and-judge-qa.md).

## Optional security proof after the journey

Run `npm test` to demonstrate the repeatable checks. Explain that the saved state is encrypted, that the key is held separately, and that opening a patient URL alone cannot grant access. Use the [security design](security-design.md) and [verification record](verification.md) for the exact tested controls. Do not reveal encryption keys, passwords or cookies on a projector. The separate protected local mode is an evaluation of access controls, not a production deployment.
