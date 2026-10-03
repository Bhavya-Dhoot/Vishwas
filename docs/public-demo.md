# Public demonstration

**MVP:** https://vishwas-care-demo.vercel.app

**Supporting PDF:** https://vishwas-care-demo.vercel.app/Vishwas-Supporting-Document.pdf

Deployed with the Vercel CLI. This version runs on Vercel without a tunnel or a laptop kept online. It runs the actual routing, matching, attendance, reminder and barrier workflow using fictional records. Each visitor cookie selects a separate in-memory workspace. It does not share a hospital database.

## What to try

Enter the staff demo, open the referral awaiting review, and accept it once to assign a doctor and appointment. The readiness checklist, attendance, clinician-set follow-up, demo clock and reminder controls demonstrate the rest of the journey. You can also submit a fictional enquiry from home, sign out and enter the staff demo in the same browser to see it. Separate browser profiles have separate workspaces in this hosted version.

## Deliberate limits

- State is temporary. A cold start, another server instance, redeployment or 30 minutes of inactivity may reset the workspace. There is no durability or shared multi-user guarantee on Vercel.
- File uploads are blocked by the API and hidden from the interface. Do not enter real patient information.
- Hospital and Fabric adapters are unconfigured. WhatsApp and ABHA are simulated. Administrative replies use local templates, and reminders run through the demo controls, not a background scheduler.
- The host uses HTTPS, Secure/HttpOnly/SameSite cookies, Origin validation and the existing role/CSRF checks. Open demo entry deliberately grants fictional staff access within that visitor's workspace.
- Up to 32 visitor workspaces are kept in each warm function instance, with a 500-write limit per workspace. Expired inactive workspaces are closed on subsequent requests. This is a demonstration capacity limit, not production load management.

The local connected prototype separately supports encrypted persistent SQLite, document uploads, the sample hospital API and actual local Fabric anchoring. See [verification](verification.md), [architecture](architecture-update.md) and [public browser proof](public-demo-proof.json).

## Redeploy or remove

Run `node scripts/prepare-vercel-demo.mjs`, then run `vercel deploy --yes --prod` from `tmp/vercel-demo` after linking it to the `vishwas-care-demo` project. The staging script copies only application code, static assets, the supporting PDF and research list. It does not copy local databases, identities, credentials, environment files or video assets. Vercel project metadata and generated staging files are ignored by Git.

Run `scripts/verify-public-demo.cjs` with Playwright to verify the deployed journey. `DEMO_URL` can select another deployment URL. The run uses fictional input and records checks without session cookies.

Temporary describes this demonstration's purpose; it has no automatic deletion date. Remove the Vercel `vishwas-care-demo` project when the submission review ends. Removing the deployment does not affect the repository or local connected prototype.
