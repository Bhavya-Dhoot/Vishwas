# Vishwas — creative brief and Brag handoff

Prepared for **Bhavya Dhoot · 4 October 2026**. This is context for a new video made by the design model you choose. It is a creative brief, **not a locked narration script**.

## Copy this prompt into the video-making chat

Open the Vishwas repository in your chosen model, then paste:

```text
Use Brag to make a new 60-second Vishwas product film from this repository.
Read context.md first, then the current product and verification documents it links.
Treat the repository as the input; this file is a brief, not a verbatim script.

You are the creative director. Choose a fresh visual direction, hook, story,
typography, palette, motion language, transitions and sound. You may rewrite the
suggested copy and change the scene order or timing. Make it visibly different
from the existing teal-and-cream screen-demo film. Do not stop for style approval:
briefly explain your choice and build. Preserve the factual boundaries below.

The central reveal is a patient being routed from home to the department already
named in their referral, followed by ONE department acceptance that automatically
assigns a compatible available doctor and slot with the patient's consent.
Show the arrival plan before travel, then follow-up through confirmed attendance.

Build the actual video, not just a plan or storyboard. Use real product screens
and interactions for evidence, with original motion graphics to tell the story.
Keep the public Vercel demo and fuller local connected prototype clearly labeled.
Choose captions-only or a short voiceover; narration is authorized if it improves
the film. The story must also work with sound off. Use fictional data only.

Use /brag if installed; otherwise use /brag-slim with the repository as input,
60 seconds, landscape 1920x1080 at 30 fps, and --style auto. Use brag-styles and
motion-kit for the design and motion, fast-render for browser-frame rendering,
and narrate if you choose voiceover. Read their installed instructions.

Write to a NEW timestamped brag-output-YYYY-MM-DD-HHmmss directory. Preserve the
existing brag-output video and the application. Deliver the MP4, a strong poster,
share copy, editable scene/source files, and a short QA report. Keep intermediates
under that directory's work folder. Inspect rendered frames and the encoded video.
Do not deploy, publish, message anyone, push commits or buy assets as part of this
video request. Finish with links to the actual files and one sentence on the angle.
```

If using a slash command directly, start with:

```text
/brag-slim . --duration 60 --format landscape --style auto

Follow context.md as a flexible creative brief. Choose a new design, preserve the
verified product claims, and complete the rendered deliverables described there.
```

On Bhavya's current Windows machine, the repository is `H:\vishwash`. In a clone, use its actual location. Do not pass `context.md` alone as Brag's script input: that can cause the tool to treat every word as mandatory on-screen copy.

## The story to understand before designing

**The hospital visit starts at home.**

A person with diabetes already has a referral, but still needs a department, an available doctor, an appointment and clear arrival instructions. Staff often coordinate those arrangements through separate calls and registers. Vishwas brings the enquiry, booking and later return visit into one workflow.

The patient states the department already named in their referral, language and appointment preferences. Deterministic rules put the enquiry in that department's inbox. An unclear referral goes to a general coordination inbox. The department accepts once; the system then matches a compatible available doctor and slot with the patient's scheduling consent. The patient gets a plan before travelling.

After the consultation, a clinician supplies the return date. Reminders, practical barriers and staff replies stay attached to the journey. A message or rebooking does not count as a completed return: staff must record attendance.

**Audience:** hackathon judges, hospital administrators and care coordinators. Make the operational value clear to someone who has never seen the project.

**Primary user:** Doctor / Care Team. **Track:** Diabetes. **Use case:** Clinic Operations & Patient Flow. **Name:** Vishwas. **Applicant:** Bhavya Dhoot.

**Intended value:** less routine coordination work and a clearer plan for patients. Actual hospital time savings, waiting-time reductions and patient outcomes have not been measured.

## Creative freedom

You own the art direction. The existing product colors are source material, not a mandatory palette for the film. The previous video used deep teal, cream and mint with screen crops, cursor actions and quiet pulse music. Make the new film feel like a fresh interpretation, not a recolored copy.

You may choose a visual metaphor such as a journey finding its route, disconnected tasks becoming one sequence, or a request turning into an appointment. These are possibilities, not required scenes. Pick one coherent idea and develop it. You can depart from Brag's preset looks if a custom design communicates the product better.

Use real interface content when demonstrating working functionality. Crop, reframe, animate, highlight and combine it with illustrations; do not invent a different dashboard and present it as a shipped screen. Conceptual scenes should be visibly illustrative. Keep the patient's agency and the department's single acceptance legible.

The creative model may change the hook, storyboard, language, music and narration. It may omit technical details that slow the story. It may not change product facts, fabricate results or turn coordination into medical advice. Strong copy and readable motion matter more than showing every feature.

## Choose the right source for each claim

| Capability | Public Vercel demo | Local connected prototype |
| --- | --- | --- |
| Referral enquiry, department inbox, one-acceptance matching | Working with fictional data | Working with fictional data |
| Preparation checklist, attendance, follow-up and barriers | Working; reminders use demo controls | Working; local reminder scheduler also available |
| Persistent state | Disposable, per-visitor in-memory workspace; may reset | Encrypted SQLite on the local host |
| Document upload | Disabled | Encrypted fictional PDF/text/JSON upload |
| Hospital booking acknowledgement | No external connection | Actual HTTP exchange with a sample hospital API; not a real vendor |
| Fabric integrity receipt | No connection | Real local two-organization development ledger; optional consented anchoring |
| WhatsApp and ABHA | Simulated | Simulated |
| Administrative AI | Local templates | Optional adapter tested with mocked provider responses; live model calls unverified |

If showing uploads, hospital acknowledgements or a successful Fabric check, label that footage **“Local prototype · synthetic data”**. If using only the hosted demo, tell the routing and continuity story without implying those integrations are connected. The public demo is not a hospital deployment.

Use brief, readable labels at the relevant moment: **“Fictional demo”**, **“Sample hospital API”**, **“Simulated messaging”**, **“Local Fabric network”**. Do not hide a qualification in tiny text while the headline claims the opposite. Do not show every label on every frame.

## Facts that must remain accurate

- Routing follows an explicitly supplied referral department or exact directory label. The system does not read reports, interpret symptoms or choose a medical specialty from them.
- The department accepts once before automatic assignment and scheduling. Consent, language, availability and patient preferences constrain the match. Missing consent or capacity remains a visible exception.
- The doctor is a compatible available match, not an AI-certified “best doctor.” Medical triage, diagnosis, clinical risk scoring and test/treatment recommendations are outside scope.
- Follow-up dates come from a clinician. Practical barriers can reach staff; the system does not autonomously resolve clinical questions or guarantee a return.
- Files and workflow records in the local prototype use AES-256-GCM encryption at rest. The server can decrypt them; do not call this end-to-end encryption.
- Fabric receives only a salted cryptographic commitment, with consent. Medical records, names and patient IDs are not stored on-chain. The receipt checks integrity against the committed version, not issuer identity or medical truth.
- Local processing and the `EDGE_ONLY` outbound policy are implemented on one host. They are not proof of a deployed distributed edge network or offline patient access.
- No live hospital integration, paying customer, measured ROI, clinical benefit or regulatory certification is established. Do not invent testimonials, patient stories presented as real, customer logos or percentage improvements.

Verified at the handoff baseline, commit `0a6f65b`: 43 automated tests, a separate Fabric contract test, local and public browser journeys, and a real local sample-API/Fabric walkthrough passed. These establish prototype behavior, not hospital effectiveness. Recheck current evidence if the repository changes; test counts do not need to appear in the film.

## Suggested story beats — change them freely

These timings are a starting point, not a shot list to copy. Give the pre-arrival reveal the most attention.

| Approximate time | Viewer should understand | Possible evidence |
| --- | --- | --- |
| 0–5 s | A visit should start being arranged before travel | A home request and a destination taking shape |
| 5–15 s | The existing referral reaches the appropriate department | Enquiry → department inbox |
| 15–30 s | One acceptance triggers the routine matching work | Accept → doctor + slot → patient arrival plan |
| 30–43 s | Coordination continues after the consultation | Clinician-set return date → simulated reminder → practical barrier |
| 43–53 s | Confirmed attendance closes the return visit | Separate follow-up episode → recorded return |
| 53–60 s | Remember Vishwas and try the demo | Brand, one clear promise and readable MVP URL |

A security beat is optional. If included, keep it short and use the local-prototype qualification. Blockchain should not displace the central patient journey. Proposed pricing and the complete technology stack belong in the deck unless they make this particular film stronger.

Optional copy seeds, open to rewriting:

- “The hospital visit starts at home.”
- “The referral reaches the department. One acceptance arranges the visit.”
- “A doctor, a time, and a clear plan before travel.”
- “A reminder is a step. Attendance completes the visit.”
- “Vishwas. From referral to return.”

Optional narration seed, not a required script:

> Why wait until someone reaches the hospital to start arranging their visit? With Vishwas, a patient sends an enquiry from home using the department already named in their referral. The request reaches that department's inbox. Once the team accepts, the system matches an available doctor and appointment with the patient's consent. The patient sees when to arrive, where to go and what to bring. After the consultation, the clinician's return date stays attached to the journey. Reminders and practical barriers reach the care team, and the visit closes only when attendance is confirmed. This is our working prototype with fictional data. Vishwas: from a referral at home to a follow-up that stays visible.

## Sources and assets

| Read or inspect | Purpose |
| --- | --- |
| `README.md` | Product overview and local setup |
| `docs/submission.md` and `docs/submission.json` | Current application wording and scope |
| `docs/public-demo.md` | Hosted behavior, limits and visitor-session handling |
| `docs/verification.md`, `docs/public-demo-proof.json`, `docs/connected-proof.json` | What has actually been tested |
| `docs/architecture-update.md`, `docs/security-design.md` | Integration and cryptography boundaries |
| `docs/demo-script.md`, `docs/demo-files/` | Fictional scenario and local walkthrough |
| `public/index.html`, `public/app.js`, `public/styles.css` | Real interface and styles for reuse |
| `docs/screenshots/pre-arrival.png` | Request from home |
| `docs/screenshots/routing.png` | Department routing and acceptance |
| `docs/screenshots/patient-plan.png` | Plan ready before arrival |
| `docs/screenshots/follow-up.png` | Follow-up and barrier handling |
| `docs/screenshots/overview.png` | Staff overview |
| `brag-output/brag.mp4`, `brag-output/brag-plan.md`, `brag-output/QA.md` | Previous film, factual reference and visual direction to move beyond |
| `output/pdf/Vishwas-Supporting-Document.pdf` | Supporting product/security/business summary |
| `docs/research-references.md` | Research background; never substitute its results for Vishwas outcomes |

Inspect screenshots before using them; fresh captures are preferable when the interface has changed. Follow the repository's current `AGENTS.md` or supplied project instructions for any code inspection. Do not read or record `.env` files, cookies, tokens, local databases, encryption keys or Fabric signing identities for creative material.

## Capture and production instructions

1. Inspect the current product and choose a creative direction. Write a short `brag-plan.md` with the angle, source mode and scene timing. The user has authorized creative freedom; ordinary design choices do not need approval.
2. Prefer the working local connected prototype if available and needed. Follow the documented launchers and use fictional files from `docs/demo-files`. Do not stop unrelated services, reset an existing connected database or delete Fabric state to obtain footage. Use an isolated fictional capture workspace where needed.
3. For the local shared workflow, use separate patient and staff browser profiles. For the hosted version, keep a new enquiry and its later staff view in the same visitor workspace: submit, sign out, enter the staff demo in the same browser. Separate browser profiles on Vercel do not share enquiries. A hosted session can reset on inactivity or instance changes.
4. If local integrations are unavailable, proceed with the public workflow or existing verified local captures. Identify their source accurately. Never fabricate an anchor receipt, API acknowledgement or live-message delivery. Keep any unavailable feature out of the live demonstration.
5. Read `motion-kit` before building scenes. Make actions produce visible results: enquiry arrives, acceptance assigns the appointment, reminder reveals a barrier, attendance completes the journey. Avoid slide after slide of explanatory text. Keep one clear focus per beat and enough settled time to read captions.
6. Read `fast-render` for a browser-drawn film; use its supported still capture, audit and render workflow. Put rendering sources, cue data, fonts, captures and audio stems in the new output directory's `work/` folder. Do not install a large new toolchain if the existing tools suffice.
7. If choosing voiceover, use `narrate` when available. Synthesize first, then fit scenes and captions to the real line durations. Music and effects should support speech, not compete with it. Prefer original/generated or properly licensed audio; record attribution where required. Do not use paid APIs or purchases without separate authorization.
8. Review stills from every scene and transitions, then inspect the encoded MP4 with and without sound. Check mobile readability, clipping, contrast, cursor timing, factual labels, pronunciation if narrated, and the final URL. Keep a held, readable end card; other pauses should earn their time.

## Deliverables and completion criteria

Default: a **60-second, 1920×1080, 30 fps MP4** with broadly compatible H.264 video, AAC audio and `yuv420p` pixel format. Aim for a practical sharing size, ideally below 25 MB when quality permits. The hackathon's deck upload limit does not establish a separate video limit.

Deliver in a new `brag-output-YYYY-MM-DD-HHmmss/` directory:

- `brag.mp4` — final film, with a strong settled poster as frame zero without changing timing.
- `brag.jpg` — matching share poster.
- `share-copy.txt` — one to three natural sentences plus the public demo URL.
- `brag-plan.md` — chosen concept and final scene plan.
- `QA.md` — media properties, source mode, actual checks, asset attribution and any limitation.
- `work/` — editable scene/source and reproduction inputs. Include the actual render command in QA. If using a browser timeline, expose the time-based render entry expected by the installed renderer.

Success means a stranger understands **who uses Vishwas, what happens before arrival, what one acceptance automates, and how follow-up stays visible**. The result should work muted, feel like motion rather than a slide deck, and make no claim stronger than its evidence.

Preserve the previous video. This handoff does not ask for changes to the app, another deployment, automatic publishing or a social post.

## Optional prompt: design first, rendering in another model

Use this only if your chosen design model cannot render video:

```text
Read context.md and the linked Vishwas evidence. Act as creative director for a
fresh 60-second product film. You have freedom over the visual system, hook,
storytelling and sound, within the factual boundaries. Do not ask me to pick a
style. Choose one, explain it briefly, and create a production-ready design handoff:
scene timing, copy/optional narration, composition, motion and interaction cues,
asset/source mapping, audio direction and a concise rendering-agent prompt.
Deliver it as video-design.md. If you generate visual or timeline source, include
editable files and explain how to run them. Do not claim a rendered MP4 exists.
```

Then give the rendering model:

```text
Use Brag to execute video-design.md, with context.md as the product truth and
delivery brief. Inspect the real Vishwas UI and produce the final film, poster,
share copy and QA report. Preserve the chosen design while solving timing,
readability and rendering details. Verify every scene's product claims. Do not
stop at another plan; deliver the rendered files in a new timestamped directory.
```

## Optional prompt: shorter WhatsApp cut

```text
Using context.md and the finished new film, create a separate 20–25 second vertical
cut at 1080x1920, 30 fps. Keep the main film intact. Recompose for a phone rather
than cropping text. Focus on home enquiry → department acceptance → doctor and slot
→ a clear plan before travel, with a brief follow-up beat and the demo URL. You have
creative freedom over the edit. Keep source-mode labels truthful and the story
understandable without sound. Deliver brag-vertical.mp4 and its poster/share copy.
```

## Links for the end card and handoff

- Public MVP: https://vishwas-care-demo.vercel.app
- GitHub: https://github.com/Bhavya-Dhoot/Vishwas
- Supporting PDF: https://vishwas-care-demo.vercel.app/Vishwas-Supporting-Document.pdf
- Latest submission: https://github.com/Bhavya-Dhoot/Vishwas/blob/main/docs/submission.md
- Research: https://github.com/Bhavya-Dhoot/Vishwas/blob/main/docs/research-references.md

Use the MVP URL as the primary call to action. If adding a QR code, encode that exact URL and test the rendered code. Keep the full bibliography and architecture details out of the main end card.
