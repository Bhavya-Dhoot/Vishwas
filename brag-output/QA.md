# Vishwas video QA

- **Final:** `brag.mp4` — 10,637,181 bytes (10.64 MB decimal), SHA-256 `46E3C876C2F2E37D9C4DC245FC3C931D2F60DB31F2FA740B8903D0912A1ACF4E`.
- **Media probe:** 60.00 seconds; H.264 High, 1920×1080, progressive, 30 fps, yuv420p; AAC-LC audio, 48 kHz stereo. The renderer captured 1,800 frames. Audio decode measured −16.2 dB mean and −3.6 dB peak, confirming an audible track. The share copy and poster are beside it.
- **Source:** Fresh browser captures of the updated local demo, using separate patient and staff sessions and a fresh in-memory synthetic database. The captured journey runs from Tara Demo’s home request through staff referral confirmation, specialist booking, patient plan and checklist, initial attendance, clinician-set follow-up, simulated travel barrier/reminder, and staff-verified return. No measured impact claim appears in the film.
- **Motion check:** fast-render audit measured median frame activity of 4.4% of pixels per 0.25 s, 5% quiet overall. The only quiet stretch was 57.50–60.00 s, the held end card. Chromium reported NVIDIA RTX A2000 Direct3D11 rendering.
- **Visual check:** Inspected rendered stills from each scene and both transition windows, then decoded and inspected frames 0, 29, 50, and 58 seconds from the compressed MP4. The first encoded frame is the settled brand poster. The appointment time, doctor, room, clinic location, travel barrier, and end URL remain legible at 1080p.
- **Scope:** All people and data are fictional. WhatsApp and ABHA are simulated. The film makes no production security or end-to-end encryption claim.

Reproduction inputs are retained locally in `work/` (excluded from Git to keep rendering intermediates out of the repository): `capture.mjs`, `finish.mjs`, `scene.html`, fresh screenshots, fonts, sound cues, and soundtrack. The source render is `work/brag-master.mp4`; the final MP4 was compressed with libx264 CRF 20 and audio copied from that source.
