import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type ReleaseNoteLike = {
  version?: string;
  betaReleaseCounter?: number;
  title?: string;
  summary?: string;
  bullets?: string[];
  updatedAtUtc?: string;
  generatedAtUtc?: string;
  committedAtUtc?: string;
  hiddenFromPublic?: boolean;
  changedFiles?: string[];
};

type ReleaseNotesLike = {
  currentVersion?: string;
  betaReleaseCounter?: number;
  lastCommitSha?: string;
  generatedAtUtc?: string;
  notes?: ReleaseNoteLike[];
};

export type CurrentHeadArtifactInput = {
  path: string;
  currentHead?: string;
  classification?: "generated_pre_commit" | "current" | "unknown";
};

export type SameCommitReleaseHeadDisciplineInput = {
  nowMs: number;
  head: string;
  changedFiles: string[];
  packageJsonDiff: string;
  releaseNotes: ReleaseNotesLike | null;
  fallbackSource: string;
  currentHeadArtifacts: CurrentHeadArtifactInput[];
  deployTriageSafe?: boolean;
  releaseNotesPass?: boolean;
};

export type SameCommitReleaseHeadDisciplineReport = {
  reportKey: "same-commit-release-head-discipline";
  generatedAtUtc: string;
  currentHead: string;
  changedFiles: string[];
  buildDeployScriptChanged: boolean;
  releaseArtifactsChanged: string[];
  requiredReleaseArtifacts: string[];
  latestVisibleBetaNoteFresh: boolean;
  latestVisibleBetaNoteTitle: string | null;
  releaseNotesAndFallbackAgree: boolean;
  staleCurrentHeadArtifacts: Array<{
    path: string;
    currentHead: string | null;
    classification: string;
  }>;
  deployTriageSafe: boolean;
  releaseNotesPass: boolean;
  validationFailures: string[];
};

const root = process.cwd();
const FRESHNESS_MS = 24 * 60 * 60 * 1000;
const REQUIRED_RELEASE_ARTIFACTS = [
  "CHANGELOG.md",
  "public/kandydrops-release-notes.json",
  "src/lib/release-notes/public-release-notes.ts",
  "src/lib/release-notes/release-version-contract.ts",
] as const;

const BUILD_DEPLOY_SCRIPT_PATTERN = /(?:^|\n)\s*[+-]?\s*"(?:(?:pre)?build|build:debug|(?:pre)?deploy|deploy|vercel|firebase|app-hosting)"\s*:/imu;

function normalizePath(value: string) {
  return value.trim().replace(/\\/gu, "/");
}

function safeGit(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson<T>(relativePath: string): T | null {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as T;
  } catch {
    return null;
  }
}

function visibleNotes(notes: ReleaseNoteLike[] | undefined) {
  return (notes ?? []).filter((note) => note.hiddenFromPublic !== true);
}

function latestNoteTimestamp(note: ReleaseNoteLike | undefined) {
  if (!note) return NaN;
  return Date.parse(note.updatedAtUtc || note.generatedAtUtc || note.committedAtUtc || "");
}

function releaseNotesAgreeWithFallback(releaseNotes: ReleaseNotesLike | null, fallbackSource: string) {
  if (!releaseNotes) return false;
  const expected = [
    `"currentVersion": "${releaseNotes.currentVersion}"`,
    `"betaReleaseCounter": ${releaseNotes.betaReleaseCounter}`,
    `"lastCommitSha": "${releaseNotes.lastCommitSha}"`,
  ];
  return expected.every((entry) => fallbackSource.includes(entry));
}

export function buildSameCommitReleaseHeadDisciplineReport(
  input: SameCommitReleaseHeadDisciplineInput,
): SameCommitReleaseHeadDisciplineReport {
  const changedFiles = Array.from(new Set(input.changedFiles.map(normalizePath).filter(Boolean))).sort();
  const releaseArtifactsChanged = REQUIRED_RELEASE_ARTIFACTS.filter((path) => changedFiles.includes(path));
  const buildDeployScriptChanged = changedFiles.includes("package.json")
    && BUILD_DEPLOY_SCRIPT_PATTERN.test(input.packageJsonDiff);
  const latestVisible = visibleNotes(input.releaseNotes?.notes)[0];
  const latestTimestamp = latestNoteTimestamp(latestVisible);
  const latestVisibleBetaNoteFresh = Number.isFinite(latestTimestamp)
    && (input.nowMs - latestTimestamp) <= FRESHNESS_MS
    && latestVisible?.betaReleaseCounter === input.releaseNotes?.betaReleaseCounter
    && latestVisible?.version === input.releaseNotes?.currentVersion;
  const staleCurrentHeadArtifacts = input.currentHeadArtifacts
    .filter((artifact) => artifact.currentHead && artifact.currentHead !== input.head && artifact.classification !== "generated_pre_commit")
    .map((artifact) => ({
      path: normalizePath(artifact.path),
      currentHead: artifact.currentHead ?? null,
      classification: artifact.classification ?? "unknown",
    }));

  const report: SameCommitReleaseHeadDisciplineReport = {
    reportKey: "same-commit-release-head-discipline",
    generatedAtUtc: new Date(input.nowMs).toISOString(),
    currentHead: input.head,
    changedFiles,
    buildDeployScriptChanged,
    releaseArtifactsChanged,
    requiredReleaseArtifacts: [...REQUIRED_RELEASE_ARTIFACTS],
    latestVisibleBetaNoteFresh,
    latestVisibleBetaNoteTitle: latestVisible?.title ?? null,
    releaseNotesAndFallbackAgree: releaseNotesAgreeWithFallback(input.releaseNotes, input.fallbackSource),
    staleCurrentHeadArtifacts,
    deployTriageSafe: input.deployTriageSafe === true,
    releaseNotesPass: input.releaseNotesPass !== false,
    validationFailures: [],
  };

  report.validationFailures = validateSameCommitReleaseHeadDiscipline(report);
  return report;
}

export function validateSameCommitReleaseHeadDiscipline(report: SameCommitReleaseHeadDisciplineReport) {
  const failures: string[] = [];
  if (report.buildDeployScriptChanged && report.releaseArtifactsChanged.length !== report.requiredReleaseArtifacts.length) {
    failures.push("build/deploy script changes must include same-commit release-note artifacts.");
  }
  if (!report.latestVisibleBetaNoteFresh) {
    failures.push("latest visible Beta note must be fresh for the same commit.");
  }
  if (!report.releaseNotesAndFallbackAgree) {
    failures.push("release notes and bundled public release JSON must agree.");
  }
  for (const artifact of report.staleCurrentHeadArtifacts) {
    failures.push(`stale currentHead artifact ${artifact.path} must be refreshed or classified generated_pre_commit.`);
  }
  if (report.deployTriageSafe && !report.releaseNotesPass) {
    failures.push("deploy triage cannot be safe while release notes fail.");
  }
  return failures;
}

export function shouldWriteSameCommitReleaseHeadDisciplineReport(report: SameCommitReleaseHeadDisciplineReport) {
  return report.changedFiles.length > 0;
}

function readChangedCurrentHeadArtifacts(changedFiles: string[]): CurrentHeadArtifactInput[] {
  return changedFiles
    .filter((path) => /^agent\/state\/.*\.generated\.json$/u.test(path))
    .map((path) => {
      const raw = readJson<Record<string, unknown>>(path);
      return {
        path,
        currentHead: typeof raw?.currentHead === "string" ? raw.currentHead : undefined,
        classification: raw?.currentHeadClassification === "generated_pre_commit" ? "generated_pre_commit" : undefined,
      };
    });
}

function buildInputFromWorkspace(): SameCommitReleaseHeadDisciplineInput {
  const trackedFiles = safeGit(["diff", "--name-only"])
    .split(/\r?\n/u)
    .map(normalizePath)
    .filter(Boolean);
  const untrackedFiles = safeGit(["ls-files", "--others", "--exclude-standard"])
    .split(/\r?\n/u)
    .map(normalizePath)
    .filter(Boolean);
  const changedFiles = Array.from(new Set([...trackedFiles, ...untrackedFiles])).sort();
  const packageJsonDiff = safeGit(["diff", "--", "package.json"]);
  const releaseNotes = readJson<ReleaseNotesLike>("public/kandydrops-release-notes.json");
  const fallbackPath = join(root, "src/lib/release-notes/public-release-notes.ts");
  const fallbackSource = existsSync(fallbackPath) ? readFileSync(fallbackPath, "utf8") : "";
  const deploymentRecovery = readJson<{ deploymentSafeToRetry?: boolean; releaseNotesFixed?: boolean }>("agent/state/deployment-recovery.generated.json");

  return {
    nowMs: Date.now(),
    head: safeGit(["rev-parse", "HEAD"]) || "unknown",
    changedFiles,
    packageJsonDiff,
    releaseNotes,
    fallbackSource,
    currentHeadArtifacts: readChangedCurrentHeadArtifacts(changedFiles),
    deployTriageSafe: deploymentRecovery?.deploymentSafeToRetry === true,
    releaseNotesPass: deploymentRecovery?.releaseNotesFixed !== false,
  };
}

function writeReport(report: SameCommitReleaseHeadDisciplineReport) {
  const statePath = join(root, "agent/state/same-commit-release-head-discipline.generated.json");
  const docsPath = join(root, "docs/agent-truth/same-commit-release-head-discipline.md");
  mkdirSync(dirname(statePath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsPath, [
    "# Same-Commit Release Head Discipline",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    `Build/deploy script changed: ${report.buildDeployScriptChanged ? "yes" : "no"}`,
    `Release artifacts changed: ${report.releaseArtifactsChanged.join(", ") || "none"}`,
    `Latest visible Beta note fresh: ${report.latestVisibleBetaNoteFresh ? "yes" : "no"}`,
    `Release notes/fallback agree: ${report.releaseNotesAndFallbackAgree ? "yes" : "no"}`,
    `Stale currentHead artifacts: ${report.staleCurrentHeadArtifacts.length}`,
    "",
    "## Validation",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- passed"]),
    "",
  ].join("\n"));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildSameCommitReleaseHeadDisciplineReport(buildInputFromWorkspace());
  if (shouldWriteSameCommitReleaseHeadDisciplineReport(report)) {
    writeReport(report);
  }
  if (report.validationFailures.length > 0) {
    console.error("Same-commit release/head discipline validation failed:");
    for (const failure of report.validationFailures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("Same-commit release/head discipline validation passed.");
}
