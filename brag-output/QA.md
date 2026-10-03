# Vishwas video QA

- **Final:** `brag.mp4`, 11,086,647 bytes (11.09 MB), SHA-256 `BED1B4AADBE51A51799498C4EFF679DEAC87B3BA79B1A3AD564F59643C814536`.
- **Media:** 60.00 seconds; H.264 High, 1920×1080, progressive, 30 fps, yuv420p; AAC-LC stereo at 48 kHz. The renderer captured 1,800 frames. Audio decode measured −16.2 dB mean and −3.7 dB peak.
- **Source:** Fresh browser captures from an isolated in-memory app and ephemeral local sample hospital API. Separate patient and staff browser contexts. Tara Demo selected Endocrinology and Hindi with scheduling consent; one staff acceptance assigned the doctor and slot and received a sample hospital acknowledgement. The same acceptance flow booked the follow-up. Browser errors: none.
- **Fabric:** The synthetic referral was encrypted and saved with explicit ledger consent. Its opaque commitment was anchored on the running local Fabric dev network, and the app verification response was `verified: true`, status `verified`. The file remained offchain. This check establishes byte integrity against that commitment, not clinical authenticity. The local network has two organizations; it is not an independent hospital deployment.
- **Motion:** fast-render audit measured median activity of 4.6% of pixels per 0.25 s and 5% quiet time. The only quiet stretch was the held brand card at 57.5–60 s. Renderer: NVIDIA RTX A2000 Direct3D11.
- **Visual:** Inspected scene stills, then decoded and inspected compressed frames at 0, 32, 55 and 58 seconds. The first encoded frame is the settled brand poster; the document scene shows the anchored status and verify action. The 60-second video includes the current one-click booking flow and confirmed return.
- **Scope:** All patient and clinical data are fictional; the hospital API is sample software; messaging is simulated. No measured impact claim.

Reproduction inputs are retained under `work/`: `capture.mjs`, `capture-report.json`, `update_scene.py`, `scene.html`, screenshots, fonts, sound cues, and soundtrack. The source render is `work/brag-master.mp4`; the final MP4 was compressed with libx264 CRF 20 and audio copied from that source.
