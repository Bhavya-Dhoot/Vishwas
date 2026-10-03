# Vishwas — proposed business model

Prepared for Bhavya Dhoot on 3 October 2026. These prices, costs and sales targets are proposals to validate. Vishwas has a working local prototype, but no paying hospital, commercial pilot or measured operational return yet.

## The model in one sentence

**Hospitals pay a subscription to coordinate patients from the enquiry at home through the next confirmed visit; patients and caregivers use Vishwas free.**

The hospital buys a managed coordination workflow: referral-department inboxes, one-acceptance doctor assignment and scheduling, preparation, follow-up tracking and visibility into exceptions. The economic case is less coordination work and better use of appointments already requested by clinicians. Neither outcome has been measured yet.

## Customer, buyer and users

| Role | Who | What they get |
| --- | --- | --- |
| First customer | A mid-size private hospital or established diabetes centre with recurring OPD visits, a care desk and usable scheduling data | A focused operational service that can fit around the existing hospital system |
| Budget owner | Hospital owner, administrator or operations head | A measurable case for staff capacity, appointment coordination and follow-up completion |
| Internal champion | Diabetes OPD manager, nursing lead or care coordinator | Fewer routine sorting and matching steps; a visible queue for exceptions |
| Daily users | Care desk, OPD staff and authorized care teams | Department inbox, automatic scheduling after acceptance, document readiness and return tracking |
| Beneficiaries | Patients and consented caregivers | Free access to the enquiry, arrival plan and follow-up communication |
| Technical approver | Hospital IT/security team and scheduling-system owner | Defined interfaces, access controls, recovery procedures and accountable integration ownership |

Start with hospitals that can identify a meaningful coordination burden and provide API access. A small OPD may not generate enough benefit to support a hospital subscription. Qualify volume and staff workload before quoting a rollout.

## Proposed pricing

All figures are proposed launch prices, before applicable taxes. They are not market benchmarks or evidence of willingness to pay.

| Offer | Proposed price | Scope |
| --- | --- | --- |
| Paid pilot | **₹40,000 for 10 weeks** | One diabetes OPD, agreed workflow, training and a measured evaluation after deployment prerequisites are met. Custom integration is separate. |
| Hospital subscription | **₹20,000 per site per month**, billed annually at **₹2.4 lakh** | One site, up to three departments and 3,000 new enquiries per month; routing, scheduling workflow, patient access, encrypted storage within an agreed retention allowance, follow-up tracking, operational reports and support. |
| Initial integration | **₹60,000 for one scoped connector** | Map department/doctor IDs, exchange availability and booking acknowledgements, test failure handling and train the designated team. Confirm scope before fixing the quote; additional systems or vendor restrictions require a separate estimate. |
| Messaging and vendor charges | **Actual usage or direct hospital billing** | WhatsApp/SMS, telephony, and any hospital-system API licence charges. Approve these separately so the hospital sees its full cost. |
| Larger group or shared ledger | **Custom annual contract** | Additional sites, higher volume, dedicated deployment or a permissioned Fabric network shared by independent institutions. Quote its operation and governance separately. |

Credit the ₹40,000 pilot fee against the first annual subscription if the hospital converts within 30 days of the evaluation. For a converting customer, that first 12-month subscription term starts on the pilot start date and includes the pilot period. Its proposed first-year total is therefore **₹3 lakh**: ₹40,000 pilot + ₹2 lakh remaining subscription + ₹60,000 integration, plus approved usage and taxes. Do not count the pilot twice.

Count a new enquiry once; retries, messages and follow-up updates do not create another billable enquiry. Agree a higher volume band before expansion, with no surprise overage bill or interruption of an existing patient's access. Specify storage, retention, support hours and service expectations in the quote. These are proposed commercial terms, not billing features currently implemented in the prototype.

Keep encryption, access controls and ordinary audit history in the base service. Fabric is optional infrastructure for a shared verification requirement; charging for it should depend on a buyer needing that service, rather than making a security claim about blockchain.

## Why these revenue streams

The recurring subscription funds operation and support. The integration fee covers work that differs between hospital systems. Usage charges stay separate because message volume and vendor costs vary.

This separation reflects actual supplier structures: Twilio lists its WhatsApp handling charge separately from Meta template fees, and Clinicea documents API access and capacity charges. Neither source validates Vishwas's proposed prices. Sources checked 3 October 2026: [Twilio WhatsApp pricing](https://www.twilio.com/en-us/whatsapp/pricing), [Clinicea API access](https://help.clinicea.com/en/category/api-integrations-1yafzxw/).

Do not charge patients for routing, take commissions for choosing a doctor, sell patient data or offer paid placement in the scheduling algorithm. Revenue should come from the hospital's software contract. An available slot must still satisfy the referral department, consent and agreed scheduling constraints.

## How a hospital could justify the spend

Use the hospital's own numbers during the pilot. The following is an illustrative calculation, not a claim about any hospital or the current prototype.

| Assumption | Example |
| --- | --- |
| Eligible enquiries coordinated each month | 3,000 |
| Net staff time saved per enquiry, after exception handling | 2 minutes |
| Staff capacity released | 3,000 × 2 ÷ 60 = **100 hours/month** |
| Loaded staff cost used to value that time | ₹250/hour |
| Equivalent staff capacity value | **₹25,000/month** |
| Subscription plus integration spread over 12 months | ₹20,000 + ₹60,000 ÷ 12 = **₹25,000/month**, before usage and taxes |

At these assumptions, capacity value only matches the fixed first-year cost. It does not cover additional usage and it is **not cash saved** unless overtime, outsourced work or another actual expense falls. The hospital may value shorter queues or capacity for other tasks, but it must decide what that is worth. At 600 enquiries a month, the same assumptions release only 20 hours, worth ₹5,000: the ₹20,000 subscription would need another demonstrable benefit to make sense.

A second way to evaluate the service is attendance at already-planned appointments. If the hospital's contribution after variable delivery costs is an assumed **₹500 per genuinely additional completed visit**, a ₹20,000 monthly subscription needs **40 additional visits** to cover that fee. Including ₹5,000/month of integration cost needs **50**, before messaging and taxes. With 1,000 planned visits in the comparison cohort, 50 additional completions would be a **5 percentage-point** improvement. That is a threshold to test, not a promised result.

Use contribution after delivery costs, not the consultation price. Count only visits that would otherwise have been missed, check that the hospital has capacity, and avoid treating a reschedule as an extra visit. Do not add the full staff-capacity estimate to the visit contribution if both calculations use the same released resource.

## Illustrative economics for Vishwas

This is a steady-state scenario for one subscribed site; replace every cost with measured usage and support effort before relying on it.

| Monthly item | Assumption |
| --- | ---: |
| Subscription revenue | ₹20,000 |
| Hosting, storage, backups and monitoring allocation | ₹2,500 |
| Direct support: 8 hours × ₹500 | ₹4,000 |
| Optional administrative AI and other variable tooling allowance | ₹500 |
| Total direct service cost | **₹7,000** |
| Contribution before shared operating costs | **₹13,000 / 65%** |

This is not net profit. It excludes sales, engineering, security reviews, legal work and other shared costs. It also excludes a dedicated Fabric network and assumes messaging/vendor charges are paid separately. Integration and pilot delivery have their own costs: 40 engineering hours at an assumed ₹1,500/hour would consume the entire ₹60,000 setup fee.

The support burden is a material risk. At 16 support hours per month, the same scenario leaves ₹9,000 contribution, or 45%. A heavily customized hospital can easily be unprofitable at the proposed price.

For scale illustration, 10 subscribed sites at the same price produce **₹2 lakh MRR / ₹24 lakh annual recurring revenue** before churn, discounts and costs. One-time integration fees and the pilot are not ARR. If shared operating costs were ₹2.6 lakh/month, the ₹13,000-per-site scenario would require **20 sites** to cover them. These are arithmetic scenarios, not a sales forecast.

## How to get the first customers

1. **Interview 10 hospital decision-makers.** Ask the administrator and care desk to show the current referral-to-booking and follow-up process. Record eligible volume, staff minutes, repeated calls, missed visits and the cost of vendor API access. Ten is a discovery target, not completed work.
2. **Run three workflow walkthroughs.** Use fictional data first. Confirm that the one-acceptance flow fits the department's responsibilities and does not create a second calendar for staff to maintain.
3. **Offer two paid pilots.** Agree the annual conversion price, integration scope and success criteria before starting. A signed pilot order is stronger evidence of willingness to pay than enthusiasm for a demo.
4. **Measure one diabetes OPD, then expand within the site.** Reuse the connector and staff training across suitable departments only after the first workflow is useful.
5. **Build an integration channel after repeatable deployments.** Hospital software vendors and implementation partners can become a route to more sites once the adapter and support model work consistently.

The paid pilot starts after the production prerequisites are agreed and completed, not immediately from the current local demo. Those include hospital-managed use of the implemented named accounts, patient identity checks, HTTPS, managed key operations, retention/deletion procedures, a real vendor connection and validation of the implemented booking recovery against that vendor. A proposed ten-week evaluation could use two weeks of baseline measurement, six weeks of operation and two weeks of review. Follow-up outcomes must use clinician-set dates that fall within an agreed observation window; longer journeys need later evaluation.

## Pilot measures and conversion decision

| Measure | What to compare |
| --- | --- |
| Staff effort | Median staff minutes and actions per eligible enquiry, including exceptions and reconciliation |
| Booking turnaround | Time from enquiry to a confirmed hospital acknowledgement |
| Arrival preparation | Correct destination and required document presence before arrival |
| Planned return attendance | Actual attendance within the agreed window; report the denominator, cancellations and reschedules |
| Operational burden | Staff exceptions, failed bookings, support hours, opt-outs and additional data entry |
| Economics | Measured benefit versus subscription, integration, messaging, vendor fees and added hospital effort |

Where practical, compare a matched or phased group within the same hospital. Account for changes in staffing, available slots and patient mix. Choose a conversion threshold with the buyer before the pilot; do not claim that the prototype has achieved it.

## Competitive position and risks

Scheduling, patient portals and reminders already exist in clinic software; Clinicea publicly lists several of these capabilities. Vishwas must earn its place through the combined referral-to-return workflow, workable integration and measured reduction in coordination effort. The local blockchain demonstration is evidence of implementation, not a commercial advantage by itself. [Clinicea product plans](https://clinicea.com/pricing).

| Risk | Commercial response |
| --- | --- |
| The hospital already has adequate booking and reminder tools | Demonstrate a remaining coordination gap and measure incremental benefit against its current system |
| Every site requires expensive custom work | Scope and charge for integration; prioritize hospitals sharing a vendor and reuse tested adapters |
| Staff create a parallel register | Agree a source of truth and ownership; include duplicate entry in the pilot workload calculation |
| Support absorbs the subscription margin | Track hours per site, simplify recurring exceptions and price complex deployments separately |
| A better booking flow has nowhere to place patients | Measure available capacity; the product cannot create doctor availability |
| Blockchain operation becomes costly | Keep it optional; price shared-network operation only where institutions need and will govern it |
| The buyer does not renew | Review operational usage and verified value regularly; make data export and exit terms clear |

## Copy for the business-model slide

**Hospital-funded coordination, free for patients**

- Buyer: hospital administrator; daily user: the OPD care team.
- Proposed subscription: ₹20,000/site/month, with a scoped ₹60,000 integration fee.
- Entry offer: ₹40,000 paid diabetes-OPD pilot, credited against the first annual subscription.
- Messaging and vendor API charges are separate; shared Fabric deployment is optional.
- Expand after the pilot demonstrates value in staff effort, booking turnaround and planned return attendance.

**Footnote:** Proposed pricing and evaluation plan. No paying customers or measured ROI yet.

## Answer for a judge

“Hospitals pay for Vishwas through a site subscription, while patients and caregivers use it free. We propose starting with a paid pilot in one diabetes OPD, then charging ₹20,000 per month for a hospital site and a separate fee for the scheduling-system integration. The hospital pays for less coordination work and better visibility into planned return visits. We will measure those benefits before expanding. Messaging is billed separately, and Fabric is optional where institutions need shared verification. We do not earn commissions from choosing doctors or sell patient data. These are proposed commercial terms, not validated revenue.”
