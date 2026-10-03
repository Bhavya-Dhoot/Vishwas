# Repository secret scan

Scanned on 2026-10-03 with Gitleaks 8.30.1. The scan covered all Git refs reachable in this checkout and the current tracked plus non-ignored working files. The checked-out history contained 8 commits through `0becc8a6ca8f66afe3a547b543905d50a65cc062`.

Gitleaks reported 0 findings in reachable history and 0 findings in the final working-file snapshot. The snapshot included 85 files, including the public-demo adapter, deployment builder, supporting-document source and research references. One video file was skipped; it was left untouched.

A separate whole-directory diagnostic found 48 pattern matches only in ignored generated/runtime content under `data/` and `brag-output/work/`, including local Fabric test identity material and dependency test fixtures. Those paths are excluded by `.gitignore`; no corresponding finding appeared in tracked files or Git history. The scanner output and this note omit matched values.

A narrow text check covered 9 demo, proof, submission, and QA files. It found no non-reserved email domains or phone-like strings. This does not evaluate names, addresses, or other personal details.

The repeatable local command is `node scripts/check-secrets.mjs` with Gitleaks installed. GitHub Actions runs the same command on pushes and pull requests after fetching full history. The scanner reports only file, commit, and rule metadata.

The Windows scanner archive was fetched from the official v8.30.1 release and checked against that release's SHA-256 checksum list. Its binary remains in ignored `data/tools` for repeat scans. The Vercel staging script copies only application code, public assets, the supporting PDF and research list; it does not copy local databases, keys, Fabric identities, environment files or video work files. The public handler refuses private deployment settings and connector credentials at startup. The supporting PDF was generated from the reviewed fictional-project text, extracted for a text check and visually reviewed on all three pages; this is not an automated PII certification.

Gitleaks checks known secret patterns; it does not certify the absence of every credential or personal identifier. The scan does not OCR images or inspect the skipped video, and it does not certify ignored runtime data. A separate dependency audit in the parent task reported 0 known vulnerabilities for the bridge and chaincode packages.
