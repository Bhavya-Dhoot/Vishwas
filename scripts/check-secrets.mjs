import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gitleaks = process.env.GITLEAKS_BIN || "gitleaks";
const temporaryRoot = mkdtempSync(join(tmpdir(), "vishwash-secret-scan-"));
const worktreeRoot = join(temporaryRoot, "worktree");

function runScanner(args) {
  const result = spawnSync(
    gitleaks,
    [...args, "--redact=100", "--no-banner", "--log-level=fatal", "--report-format=json", "--report-path=-"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
  );

  if (result.error || result.status === null || result.status > 1) {
    throw new Error("Gitleaks failed; check that a recent Gitleaks version is installed.");
  }

  let findings;
  try {
    findings = JSON.parse(result.stdout || "[]");
  } catch {
    throw new Error("Gitleaks returned an unreadable report; raw output was suppressed.");
  }

  return { findings, exitCode: result.status };
}

function copyCurrentFiles() {
  const listed = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: repoRoot, encoding: "buffer", maxBuffer: 10 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
  );
  if (listed.error || listed.status !== 0) throw new Error("Unable to list tracked and non-ignored working files.");

  const paths = listed.stdout.toString("utf8").split("\0").filter(Boolean);
  let copied = 0;
  let skippedVideos = 0;

  for (const file of paths) {
    if (/\.(?:mp4|m4v|mov|avi|webm|mkv)$/i.test(file)) {
      skippedVideos += 1;
      continue;
    }

    const source = resolve(repoRoot, file);
    if (source !== repoRoot && !source.startsWith(`${repoRoot}${sep}`)) continue;
    if (!existsSync(source)) continue;

    const destination = join(worktreeRoot, file);
    mkdirSync(dirname(destination), { recursive: true });
    if (lstatSync(source).isSymbolicLink()) {
      writeFileSync(destination, readlinkSync(source));
    } else {
      copyFileSync(source, destination);
    }
    copied += 1;
  }

  return { copied, skippedVideos };
}

function safeFinding(finding, scanRoot) {
  const file = String(finding.File || "");
  const relativeFile = file
    ? (isAbsolute(file) ? relative(scanRoot, file) : file).replaceAll("\\", "/")
    : "unknown";
  return {
    file: relativeFile,
    ...(finding.Commit ? { commit: String(finding.Commit) } : {}),
    rule: String(finding.RuleID || "unknown"),
  };
}

try {
  const version = spawnSync(gitleaks, ["version"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (version.error || version.status !== 0) {
    throw new Error("Gitleaks is required; install it from https://github.com/gitleaks/gitleaks/releases.");
  }

  const history = runScanner(["git", "--log-opts=--all", repoRoot]);
  mkdirSync(worktreeRoot);
  const currentFiles = copyCurrentFiles();
  const worktree = runScanner(["dir", worktreeRoot]);
  const findings = [
    ...history.findings.map((finding) => safeFinding(finding, repoRoot)),
    ...worktree.findings.map((finding) => safeFinding(finding, worktreeRoot)),
  ];

  console.log(`Gitleaks ${version.stdout.trim()}: history findings=${history.findings.length}; working-file findings=${worktree.findings.length}.`);
  console.log(`Working scan copied ${currentFiles.copied} tracked/non-ignored files; skipped ${currentFiles.skippedVideos} video files.`);
  for (const finding of findings) console.log(JSON.stringify(finding));

  if (findings.length) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
} finally {
  const tempPath = resolve(temporaryRoot);
  const allowedTempRoot = resolve(tmpdir());
  if (tempPath.startsWith(`${allowedTempRoot}${sep}`)) {
    rmSync(tempPath, { recursive: true, force: true });
  }
}
