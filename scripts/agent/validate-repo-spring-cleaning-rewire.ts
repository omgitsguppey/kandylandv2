import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

type Severity = "P0" | "P1" | "P2" | "P3";

type Freshness = "fresh" | "stale" | "unknown" | "missing";

type GeneratedReportAction =
  | "current_authority"
  | "evidence_only"
  | "archive_candidate"
  | "needs_owner"
  | "stale_authority_risk";

type CleanupType =
  | "archive_candidate"
  | "merge_candidate"
  | "validator_replacement_candidate"
  | "stale_doc_candidate"
  | "legacy_lane_candidate"
  | "duplicate_report_candidate"
  | "keep_current_authority"
  | "needs_human_review";

type GeneratedReportInventoryItem = {
  path: string;
  generatedAt?: string;
  generatedAtUtc?: string;
  currentHead?: string;
  sourceCommit?: string;
  ageHours: number | null;
  freshness: Freshness;
  ownerScript: string | null;
  ownerDoc: string | null;
  consumedByScore: boolean;
  consumedByAdminDebug: boolean;
  consumedByLaunchReadiness: boolean;
  action: GeneratedReportAction;
  usageEvidence: string[];
};

type InventoryFinding = {
  findingKey: string;
  lane: string;
  severity: Severity;
  title: string;
  description: string;
  files: string[];
  evidence: string[];
  cleanupType: CleanupType;
  recommendedAction: string;
  usageEvidence: string[];
};

type DisconnectedUiSurfaceFinding = InventoryFinding & {
  routeOrComponent: string;
  expectedApiOrSource: string;
  actualApiOrSource: string;
  sourceMetadataPresent: boolean;
  staleUnavailableHandling: boolean;
  brokenOrSelfLoopLinks: boolean;
};

type RecommendedSection = {
  sectionKey: string;
  title: string;
  purpose: string;
  sourceFindings: string[];
  recommendedOwner: string;
};

type RecommendedFix = {
  stepKey: string;
  severity: Severity;
  title: string;
  targetFiles: string[];
  validators: string[];
  rationale: string;
};

export type RepoSpringCleaningRewireReport = {
  generatedAtUtc: string;
  reportKey: "repo-spring-cleaning-rewire";
  currentHead: string;
  summary: {
    generatedReportsScanned: number;
    staleGeneratedReports: number;
    duplicateDoctrineGroups: number;
    conflictingValidatorGroups: number;
    legacyLanes: number;
    fakeAuthorityRisks: number;
    disconnectedUiSurfaces: number;
    cleanupCandidates: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
    p3Count: number;
  };
  generatedReportInventory: GeneratedReportInventoryItem[];
  doctrineConflicts: InventoryFinding[];
  validatorConflicts: InventoryFinding[];
  legacyLaneCandidates: InventoryFinding[];
  fakeAuthorityRisks: InventoryFinding[];
  disconnectedUiSurfaces: DisconnectedUiSurfaceFinding[];
  cleanupCandidates: InventoryFinding[];
  recommendedSections: RecommendedSection[];
  recommendedFixOrder: RecommendedFix[];
};

const REPORT_PATH = "agent/state/repo-spring-cleaning-rewire.generated.json";
const DOC_PATH = "docs/agent-truth/repo-spring-cleaning-rewire.md";
const STALE_AFTER_HOURS = 24;

const SCORE_CONSUMER_PATHS = [
  "scripts/agent/score-public-beta-readiness.ts",
  "scripts/agent/validate-public-beta-score.ts",
  "src/lib/agent-score/core.ts",
  "src/lib/agent-score/weights.ts",
  "src/lib/agent-score/reporting.ts",
  "tests/unit/public-beta-score.spec.ts",
];

const ADMIN_DEBUG_CONSUMER_PATHS = [
  "src/lib/admin-debug-control-tower.ts",
  "src/lib/admin-debug-summary-cards.ts",
  "src/app/admin/debug/page.tsx",
];

const LAUNCH_READINESS_CONSUMER_PATHS = [
  "scripts/agent/validate-launch-readiness-final.ts",
  "scripts/agent/validate-launch-finalization-baseline.ts",
  "scripts/agent/validate-launch-pr-triage.ts",
  "docs/agent-truth/launch-readiness-final.md",
  "docs/agent-truth/final-launch-readiness-report.md",
  "docs/agent-truth/launch-pr-triage.md",
];

const OWNER_SCRIPT_HINTS: Record<string, string> = {
  "codebase-junk-cleanup.generated.json": "scripts/agent/scan-codebase-junk.ts",
  "public-beta-score.generated.json": "scripts/agent/score-public-beta-readiness.ts",
  "phase-one-score-ui-triage.generated.json": "scripts/agent/validate-phase-one-score-ui-triage.ts",
  "provider-smoke-evidence.generated.json": "scripts/agent/validate-provider-smoke-evidence.ts",
  "runtime-smoke-evidence.generated.json": "scripts/agent/validate-runtime-smoke-evidence.ts",
  "admin-truth-sample-evidence.generated.json": "scripts/agent/validate-admin-truth-sample-evidence.ts",
  "final-launch-readiness-report.generated.json": "scripts/agent/validate-launch-readiness-final.ts",
  "launch-readiness-report.generated.json": "scripts/agent/validate-launch-readiness-final.ts",
  "launch-pr-triage.generated.json": "scripts/agent/validate-launch-pr-triage.ts",
};

function repoPath(root: string, relativePath: string) {
  return join(root, relativePath);
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/");
}

function readText(root: string, relativePath: string) {
  const fullPath = repoPath(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(root: string, relativePath: string): Record<string, unknown> {
  const source = readText(root, relativePath);
  if (!source) return {};
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function fileExists(root: string, relativePath: string) {
  return existsSync(repoPath(root, relativePath));
}

function readCurrentHead(root: string) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unavailable";
  }
}

function listTrackedFiles(root: string) {
  try {
    return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/u)
      .map((entry) => normalizePath(entry.trim()))
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}

function listDirectGeneratedReports(root: string) {
  const stateDirectory = repoPath(root, "agent/state");
  if (!existsSync(stateDirectory)) return [];
  return readdirSync(stateDirectory)
    .filter((entry) => entry.endsWith(".generated.json"))
    .map((entry) => `agent/state/${entry}`)
    .sort((left, right) => left.localeCompare(right));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function hasAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

function hasAll(source: string, needles: string[]) {
  return needles.every((needle) => source.includes(needle));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNestedString(report: Record<string, unknown>, path: string[]) {
  let current: unknown = report;
  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return asString(current);
}

function readGeneratedAt(report: Record<string, unknown>) {
  return asString(report.generatedAtUtc)
    ?? asString(report.generatedAt)
    ?? asString(report.timestampUtc)
    ?? asString(report.timestamp);
}

function readSourceCommit(report: Record<string, unknown>) {
  return asString(report.sourceCommit)
    ?? asString(report.currentHead)
    ?? asString(report.head)
    ?? asNestedString(report, ["git", "head"])
    ?? asNestedString(report, ["metadata", "sourceCommit"]);
}

function ageHours(generatedAt: string | undefined, now: Date) {
  if (!generatedAt) return null;
  const generatedAtMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) return null;
  return Math.max(0, Math.round(((now.getTime() - generatedAtMs) / (60 * 60 * 1000)) * 10) / 10);
}

function reportFreshness(relativePath: string, generatedAt: string | undefined, age: number | null) {
  if (!generatedAt) return fileExists(process.cwd(), relativePath) ? "unknown" : "missing";
  if (age === null) return "unknown";
  return age <= STALE_AFTER_HOURS ? "fresh" : "stale";
}

function readSources(root: string, paths: string[]) {
  return paths.map((path) => [path, readText(root, path)] as const);
}

function sourceMentionsPath(root: string, paths: string[], reportPath: string) {
  const reportBase = basename(reportPath);
  return readSources(root, paths).some(([, source]) =>
    source.includes(reportPath) || source.includes(reportPath.replaceAll("/", "\\")) || source.includes(reportBase),
  );
}

function buildUsageEvidence(root: string, trackedFiles: string[], candidate: string, maxEntries = 8) {
  const candidateBase = basename(candidate);
  const candidateName = candidateBase.replace(/\.generated\.json$/u, "").replace(/\.[tj]sx?$/u, "");
  const needles = unique([candidate, candidate.replaceAll("/", "\\"), candidateBase, candidateName]);
  const evidence: string[] = [];

  for (const file of trackedFiles) {
    if (file === candidate) continue;
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|md|json)$/u.test(file)) continue;
    const source = readText(root, file);
    if (!source) continue;
    if (needles.some((needle) => needle.length > 3 && source.includes(needle))) {
      evidence.push(file);
    }
    if (evidence.length >= maxEntries) break;
  }

  return evidence.length > 0 ? evidence : ["No direct static reference found in tracked text files."];
}

function ownerScriptForReport(root: string, trackedFiles: string[], reportPath: string) {
  const reportBase = basename(reportPath);
  const hinted = OWNER_SCRIPT_HINTS[reportBase];
  if (hinted && fileExists(root, hinted)) return hinted;

  const normalizedName = reportBase.replace(/\.generated\.json$/u, "");
  const scriptCandidates = [
    `scripts/agent/validate-${normalizedName}.ts`,
    `scripts/agent/score-${normalizedName}.ts`,
    `scripts/agent/build-${normalizedName}.ts`,
    `scripts/agent/scan-${normalizedName}.ts`,
  ];
  const existingCandidate = scriptCandidates.find((candidate) => fileExists(root, candidate));
  if (existingCandidate) return existingCandidate;

  const scriptFiles = trackedFiles.filter((file) =>
    (file.startsWith("scripts/agent/") || file.startsWith("scripts/check-")) && file.endsWith(".ts"),
  );
  const directOwner = scriptFiles.find((file) => {
    const source = readText(root, file);
    return source.includes(reportPath) || source.includes(reportBase);
  });

  return directOwner ?? null;
}

function ownerDocForReport(root: string, trackedFiles: string[], reportPath: string) {
  const reportBase = basename(reportPath);
  const normalizedName = reportBase.replace(/\.generated\.json$/u, "");
  const directDoc = `docs/agent-truth/${normalizedName}.md`;
  if (fileExists(root, directDoc)) return directDoc;

  const docs = trackedFiles.filter((file) => file.startsWith("docs/agent-truth/") && file.endsWith(".md"));
  const referencedBy = docs.find((file) => {
    const source = readText(root, file);
    return source.includes(reportPath) || source.includes(reportBase);
  });

  return referencedBy ?? null;
}

function buildGeneratedReportInventory(root: string, now: Date, trackedFiles: string[]) {
  return listDirectGeneratedReports(root).map((reportPath): GeneratedReportInventoryItem => {
    const report = readJson(root, reportPath);
    const generatedAt = readGeneratedAt(report);
    const age = ageHours(generatedAt, now);
    const freshness = reportFreshness(reportPath, generatedAt, age);
    const ownerScript = ownerScriptForReport(root, trackedFiles, reportPath);
    const ownerDoc = ownerDocForReport(root, trackedFiles, reportPath);
    const consumedByScore = sourceMentionsPath(root, SCORE_CONSUMER_PATHS, reportPath);
    const consumedByAdminDebug = sourceMentionsPath(root, ADMIN_DEBUG_CONSUMER_PATHS, reportPath);
    const consumedByLaunchReadiness = sourceMentionsPath(root, LAUNCH_READINESS_CONSUMER_PATHS, reportPath);
    const hasAuthorityConsumer = consumedByScore || consumedByAdminDebug || consumedByLaunchReadiness;
    const action: GeneratedReportAction = freshness === "stale" && hasAuthorityConsumer
      ? "stale_authority_risk"
      : !ownerScript && !ownerDoc
        ? "needs_owner"
        : hasAuthorityConsumer
          ? "current_authority"
          : freshness === "stale"
            ? "archive_candidate"
            : "evidence_only";

    return {
      path: reportPath,
      generatedAt,
      generatedAtUtc: asString(report.generatedAtUtc),
      currentHead: asString(report.currentHead),
      sourceCommit: readSourceCommit(report),
      ageHours: age,
      freshness,
      ownerScript,
      ownerDoc,
      consumedByScore,
      consumedByAdminDebug,
      consumedByLaunchReadiness,
      action,
      usageEvidence: buildUsageEvidence(root, trackedFiles, reportPath, 6),
    };
  });
}

function finding(
  findingKey: string,
  lane: string,
  severity: Severity,
  title: string,
  description: string,
  files: string[],
  evidence: string[],
  cleanupType: CleanupType,
  recommendedAction: string,
  usageEvidence: string[] = [],
): InventoryFinding {
  return {
    findingKey,
    lane,
    severity,
    title,
    description,
    files,
    evidence,
    cleanupType,
    recommendedAction,
    usageEvidence,
  };
}

function buildDoctrineConflicts(root: string, trackedFiles: string[]) {
  const publicBetaDoc = readText(root, "docs/agent-truth/public-beta-score.md");
  const launchDoc = readText(root, "docs/agent-truth/launch-readiness-final.md");
  const finalLaunchDoc = readText(root, "docs/agent-truth/final-launch-readiness-report.md");
  const releaseNotesDoc = readText(root, "docs/agent-truth/public-beta-release-notes.md");
  const generatedAuthorityDoc = readText(root, "docs/agent-truth/generated-report-authority.md");
  const adminDebugDoc = readText(root, "docs/agent-truth/admin-debug-control-tower.md");
  const watchTimeDoc = readText(root, "docs/agent-truth/watch-time-rollup-truth.md");

  return [
    finding(
      "public-beta-score-doctrine-still-allows-boolean-evidence-lane",
      "public beta score",
      "P1",
      "Public beta score doctrine conflicts with formal evidence artifacts",
      "The score doctrine says the score is deterministic, but the current runner still uses boolean/string-derived inputs while formal evidence artifacts exist.",
      [
        "docs/agent-truth/public-beta-score.md",
        "scripts/agent/score-public-beta-readiness.ts",
        "agent/state/provider-smoke-evidence.generated.json",
        "agent/state/runtime-smoke-evidence.generated.json",
        "agent/state/admin-truth-sample-evidence.generated.json",
      ],
      [
        `publicBetaDocMentionsFormalEvidence=${publicBetaDoc.includes("formal evidence")}`,
        "score runner still has hasTargetedBehaviorEvidence: false, provider smoke launch-report string parsing, debug-entry admin truth scoring, and visual file-existence scoring.",
      ],
      "stale_doc_candidate",
      "Keep the doctrine but update it with a strict artifact-ingestion contract when the score evidence fix lands.",
      buildUsageEvidence(root, trackedFiles, "docs/agent-truth/public-beta-score.md", 5),
    ),
    finding(
      "launchable-language-conflicts-with-missing-smoke-evidence",
      "launch readiness",
      "P1",
      "Launch readiness language can outpace missing smoke evidence",
      "Launch-readiness docs and reports can use launchable/final language while provider/runtime/admin truth evidence artifacts remain missing or unverified.",
      [
        "docs/agent-truth/launch-readiness-final.md",
        "docs/agent-truth/final-launch-readiness-report.md",
        "agent/state/provider-smoke-evidence.generated.json",
        "agent/state/runtime-smoke-evidence.generated.json",
        "agent/state/admin-truth-sample-evidence.generated.json",
      ],
      [
        `launchDocUsesLaunchable=${/launchable/i.test(launchDoc)}`,
        `finalLaunchDocUsesLaunchable=${/launchable/i.test(finalLaunchDoc)}`,
        "provider/runtime/admin truth evidence reports are tracked separately and must not be overridden by launchable wording.",
      ],
      "merge_candidate",
      "Reconcile launch-readiness docs with the score evidence artifact contract and keep final launch wording capped by formal smoke evidence.",
      buildUsageEvidence(root, trackedFiles, "docs/agent-truth/launch-readiness-final.md", 5),
    ),
    finding(
      "generated-report-snapshot-authority-needs-single-doctrine-link",
      "generated reports",
      "P1",
      "Generated report snapshot doctrine is split across docs and validators",
      "The repo says generated reports are snapshots, but score, Admin Debug, and launch readiness still consume generated reports in ways that can look authoritative when stale.",
      [
        "AGENTS.md",
        "docs/agent-truth/generated-report-authority.md",
        "src/lib/admin-debug-control-tower.ts",
        "agent/state/*.generated.json",
      ],
      [
        `generatedAuthorityDocLoaded=${generatedAuthorityDoc.length > 0}`,
        "AGENTS says generated reports are evidence snapshots and stale after 24 hours unless a contract says otherwise.",
      ],
      "merge_candidate",
      "Add one reusable snapshot-consumption rule for score, launch readiness, and Admin Debug generated-report cards.",
      ["AGENTS.md", "docs/agent-truth/generated-report-authority.md"],
    ),
    finding(
      "admin-debug-doctrine-overlaps-score-and-admin-analytics-lanes",
      "admin debug",
      "P2",
      "Admin Debug doctrine overlaps score and admin analytics truth lanes",
      "Admin Debug is the control tower, but its generated-report cards overlap score and analytics truth lanes without one visible ownership boundary.",
      [
        "docs/agent-truth/admin-debug-control-tower.md",
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/admin-debug-summary-cards.ts",
      ],
      [
        `adminDebugDocLoaded=${adminDebugDoc.length > 0}`,
        "Control Tower reads many generated reports, while score truth and analytics truth keep separate validators.",
      ],
      "merge_candidate",
      "Split Admin Debug display inventory from canonical score/analytics ownership in the spring-cleaning follow-up.",
      buildUsageEvidence(root, trackedFiles, "src/lib/admin-debug-control-tower.ts", 5),
    ),
    finding(
      "watch-time-doctrine-needs-legacy-test-cleanup-section",
      "watch time",
      "P1",
      "Watch-time doctrine is canonical but tests still encode legacy duration as watch time",
      "The watch-time doctrine defines canonical rollup semantics, but a metrics snapshot test still expects page-duration/watchSecondsTotal as canonical watch time.",
      [
        "docs/agent-truth/watch-time-rollup-truth.md",
        "src/lib/server/watch-time-rollup.ts",
        "src/lib/server/admin-user-metrics-snapshot.ts",
        "tests/unit/admin-user-metrics.spec.ts",
      ],
      [
        `watchTimeDocLoaded=${watchTimeDoc.length > 0}`,
        "tests/unit/admin-user-metrics.spec.ts fixture still uses watchSecondsTotal as expected watchTimeMs.",
      ],
      "legacy_lane_candidate",
      "Keep the canonical rollup and add a cleanup section for legacy diagnostic duration tests.",
      buildUsageEvidence(root, trackedFiles, "src/lib/server/watch-time-rollup.ts", 5),
    ),
    finding(
      "release-note-doctrine-is-current-authority-not-cleanup-target",
      "release notes",
      "P3",
      "Release-note doctrine should remain the current Beta badge authority",
      "Release notes have a clear public-beta badge contract and should be kept as the current authority while this inventory is added.",
      [
        "docs/agent-truth/public-beta-release-notes.md",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
      ],
      [
        `releaseNotesDocMentionsAcceptedPublicBeta=${releaseNotesDoc.includes("accepted public beta")}`,
        "This patch updates the Beta badge through the release-note lane instead of inventing a separate UI truth.",
      ],
      "keep_current_authority",
      "Keep release-note doctrine intact; only publish the required Beta badge note for this inventory patch.",
      buildUsageEvidence(root, trackedFiles, "docs/agent-truth/public-beta-release-notes.md", 5),
    ),
  ];
}

function packageScripts(root: string) {
  const packageJson = readJson(root, "package.json");
  const scripts = packageJson.scripts;
  return scripts && typeof scripts === "object" && !Array.isArray(scripts)
    ? scripts as Record<string, string>
    : {};
}

function missingPackageScriptTargets(root: string, scripts: Record<string, string>) {
  return Object.entries(scripts)
    .flatMap(([name, command]) => Array.from(command.matchAll(/(?:tsx|node|vitest|ts-node)\s+([^\s&|]+\.tsx?)/gu), (match) => ({
      name,
      target: normalizePath(match[1]),
    })))
    .filter(({ target }) => target.startsWith("scripts/") && !fileExists(root, target));
}

function buildValidatorConflicts(root: string, trackedFiles: string[]) {
  const scripts = packageScripts(root);
  const scoreValidator = readText(root, "scripts/agent/validate-public-beta-score.ts");
  const scoreRunner = readText(root, "scripts/agent/score-public-beta-readiness.ts");
  const phaseOneTriage = readText(root, "scripts/agent/validate-phase-one-score-ui-triage.ts");
  const codebaseJunkValidator = readText(root, "scripts/agent/validate-codebase-junk-cleanup.ts");
  const releaseValidator = readText(root, "scripts/agent/validate-public-beta-changelog.ts");
  const adminAnalyticsOverview = readText(root, "scripts/check-admin-analytics-overview.ts");
  const launchReadinessValidator = readText(root, "scripts/agent/validate-launch-readiness-final.ts");
  const creatorProjectionValidator = readText(root, "scripts/agent/validate-creator-dashboard-projection-lock.ts");
  const missingScriptTargets = missingPackageScriptTargets(root, scripts);
  const packageScriptEvidence = missingScriptTargets.length > 0
    ? missingScriptTargets.map(({ name, target }) => `${name}->${target}`)
    : ["No missing package-script TypeScript targets found."];

  const conflicts = [
    finding(
      "beta-score-validator-can-pass-while-score-ignores-formal-evidence",
      "beta score",
      "P1",
      "Beta score validators overlap without enforcing formal artifact ingestion",
      "Phase-one triage proves the evidence artifacts exist, but the public beta score validator still allows the old boolean/string path.",
      [
        "scripts/agent/validate-public-beta-score.ts",
        "scripts/agent/validate-phase-one-score-ui-triage.ts",
        "scripts/agent/score-public-beta-readiness.ts",
      ],
      [
        `scoreValidatorMentionsEvidenceCap=${scoreValidator.includes("readinessStatusReason") || scoreValidator.includes("evidenceCap")}`,
        `phaseOneTriageMentionsProviderArtifact=${phaseOneTriage.includes("provider-smoke-evidence.generated.json")}`,
        `scoreRunnerHasTargetedFalse=${scoreRunner.includes("hasTargetedBehaviorEvidence: false")}`,
      ],
      "validator_replacement_candidate",
      "Move the phase-one evidence-ingestion assertions into the canonical beta score validator when the score fix lands.",
      buildUsageEvidence(root, trackedFiles, "scripts/agent/validate-public-beta-score.ts", 6),
    ),
    finding(
      "codebase-junk-cleanup-validator-is-too-permissive",
      "repo cleanup",
      "P2",
      "Codebase junk cleanup validation only proves labels exist",
      "The existing junk cleanup validator checks for report fields and label strings, so it can pass while orphan/deprecated candidates stay at zero.",
      [
        "scripts/agent/scan-codebase-junk.ts",
        "scripts/agent/validate-codebase-junk-cleanup.ts",
        "agent/state/codebase-junk-cleanup.generated.json",
      ],
      [
        `codebaseJunkValidatorStringChecks=${(codebaseJunkValidator.match(/requireIncludes/g) ?? []).length}`,
        "scan-codebase-junk relies on naming/package-script checks and does not inspect cross-lane conflicts.",
      ],
      "validator_replacement_candidate",
      "Use this spring-cleaning report as the stricter cleanup inventory before any removal/refactor pass.",
      buildUsageEvidence(root, trackedFiles, "scripts/agent/validate-codebase-junk-cleanup.ts", 5),
    ),
    finding(
      "launch-readiness-validator-still-overlaps-final-score-truth",
      "launch readiness",
      "P1",
      "Launch readiness validator overlaps score truth and can preserve stale report authority",
      "Launch readiness remains useful, but it should not be the source for provider smoke scoring or final beta readiness truth.",
      [
        "scripts/agent/validate-launch-readiness-final.ts",
        "scripts/agent/score-public-beta-readiness.ts",
        "agent/state/final-launch-readiness-report.generated.json",
      ],
      [
        `launchValidatorMentionsFinalReport=${launchReadinessValidator.includes("final-launch-readiness-report.generated.json")}`,
        `scoreRunnerReadsFinalLaunchReport=${scoreRunner.includes("final-launch-readiness-report.generated.json")}`,
      ],
      "validator_replacement_candidate",
      "Keep launch readiness as evidence, but remove it from score provider-smoke authority in the dedicated score evidence fix.",
      buildUsageEvidence(root, trackedFiles, "scripts/agent/validate-launch-readiness-final.ts", 5),
    ),
    finding(
      "release-note-validator-is-string-heavy-but-currently-owned",
      "release notes",
      "P3",
      "Release-note validator is string-heavy but has a clear package script and doctrine",
      "The release-note lane uses string-contract validation, but it is currently the intended Beta badge guardrail and should not be replaced in this pass.",
      [
        "scripts/agent/validate-public-beta-changelog.ts",
        "docs/agent-truth/public-beta-release-notes.md",
        "package.json",
      ],
      [
        `releaseValidatorRequireIncludes=${(releaseValidator.match(/includes/g) ?? []).length}`,
        `packageHasCheckReleaseNotes=${Boolean(scripts["check:release-notes"])}`,
      ],
      "keep_current_authority",
      "Leave release-note validation intact and update only the required public beta badge artifacts.",
      buildUsageEvidence(root, trackedFiles, "scripts/agent/validate-public-beta-changelog.ts", 5),
    ),
    finding(
      "admin-analytics-validators-can-pass-with-panel-source-drift",
      "admin analytics",
      "P1",
      "Admin analytics validators can pass while panel display truth drifts",
      "Admin analytics has many targeted validators, but raw logs, cached summaries, and live cards still need a single display-truth inventory.",
      [
        "scripts/check-admin-analytics-overview.ts",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/api/admin/analytics/overview/route.ts",
      ],
      [
        `adminAnalyticsOverviewLoaded=${adminAnalyticsOverview.length > 0}`,
        "Admin analytics panels mix rawEvents, cached summaries, fallback labels, and live source labels.",
      ],
      "needs_human_review",
      "Create a panel-by-panel display truth map before consolidating admin analytics validators.",
      buildUsageEvidence(root, trackedFiles, "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx", 5),
    ),
    finding(
      "creator-dashboard-validator-does-not-lock-source-sample-metadata",
      "creator dashboard",
      "P1",
      "Creator dashboard validators do not yet require source samples for live stats",
      "Creator projection/settings validators exist, but the settings hub can still render live based on object presence rather than source/sample metadata.",
      [
        "scripts/agent/validate-creator-dashboard-projection-lock.ts",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/app/api/creator/settings/route.ts",
      ],
      [
        `creatorProjectionValidatorLoaded=${creatorProjectionValidator.length > 0}`,
        "CreatorDashboardSettingsHub uses stats ? \"live\" : \"unavailable\".",
      ],
      "validator_replacement_candidate",
      "Add a source/sample metadata contract to creator settings/dashboard validators before changing UI behavior.",
      buildUsageEvidence(root, trackedFiles, "src/components/Creators/CreatorDashboardSettingsHub.tsx", 5),
    ),
    finding(
      "package-script-target-scan-baseline",
      "package scripts",
      missingScriptTargets.length > 0 ? "P1" : "P3",
      missingScriptTargets.length > 0
        ? "Some package scripts point at missing TypeScript targets"
        : "Package script target scan found no missing TypeScript validator targets",
      "The spring-cleaning lane checks package script ownership before calling validators cleanup-worthy.",
      ["package.json"],
      packageScriptEvidence,
      missingScriptTargets.length > 0 ? "needs_human_review" : "keep_current_authority",
      missingScriptTargets.length > 0
        ? "Repair or remove missing package-script targets before classifying their validators."
        : "Keep using package script ownership as static evidence for validator inventory.",
      ["package.json"],
    ),
  ];

  return conflicts;
}

function buildLegacyLaneCandidates(root: string, trackedFiles: string[]) {
  const scoreRunner = readText(root, "scripts/agent/score-public-beta-readiness.ts");
  const adminMetricsTest = readText(root, "tests/unit/admin-user-metrics.spec.ts");
  const watchTimeRollup = readText(root, "src/lib/server/watch-time-rollup.ts");
  const oldLogicCleanupReport = readJson(root, "agent/state/creator-lane-old-logic-cleanup.generated.json");
  const junkReport = readJson(root, "agent/state/codebase-junk-cleanup.generated.json");

  return [
    finding(
      "provider-smoke-final-report-string-parser-legacy-lane",
      "public beta score",
      "P1",
      "Provider smoke final-report string parser is a legacy lane",
      "The score runner still reads final launch readiness report text to infer provider smoke, which conflicts with formal provider/runtime artifacts.",
      [
        "scripts/agent/score-public-beta-readiness.ts",
        "agent/state/final-launch-readiness-report.generated.json",
        "agent/state/provider-smoke-evidence.generated.json",
      ],
      [
        `hasProviderSmokeEvidenceFunction=${scoreRunner.includes("function hasProviderSmokeEvidence")}`,
        `readsFinalLaunchReport=${scoreRunner.includes("final-launch-readiness-report.generated.json")}`,
      ],
      "legacy_lane_candidate",
      "Replace the string parser with schema-backed provider/runtime evidence artifact readers.",
      buildUsageEvidence(root, trackedFiles, "agent/state/final-launch-readiness-report.generated.json", 6),
    ),
    finding(
      "watch-time-admin-metrics-legacy-duration-test",
      "watch time",
      "P1",
      "Admin metrics test still encodes legacy duration as watch time",
      "A unit test can make watchSecondsTotal/page duration appear canonical even though the rollup marks diagnostic legacy sources separately.",
      [
        "tests/unit/admin-user-metrics.spec.ts",
        "src/lib/server/admin-user-metrics-snapshot.ts",
        "src/lib/server/watch-time-rollup.ts",
      ],
      [
        `adminMetricsTestUsesWatchSecondsTotal=${adminMetricsTest.includes("watchSecondsTotal")}`,
        `watchRollupUsesCanonicalSource=${watchTimeRollup.includes("watch_session_rollup")}`,
      ],
      "legacy_lane_candidate",
      "Update the test contract so diagnostic duration is labeled separately from canonical watch-session rollup output.",
      buildUsageEvidence(root, trackedFiles, "src/lib/server/admin-user-metrics-snapshot.ts", 5),
    ),
    finding(
      "creator-lane-old-logic-cleanup-report-needs-owner-before-runtime-refactor",
      "creator dashboard",
      "P2",
      "Creator old-logic cleanup is report-only until source ownership is proven",
      "Creator cleanup reports exist, but this pass does not delete or refactor creator runtime code without static import/API evidence.",
      [
        "agent/state/creator-lane-old-logic-cleanup.generated.json",
        "agent/state/creator-lane-legacy-truth-inventory.generated.json",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
      ],
      [
        `oldLogicReportKey=${String(oldLogicCleanupReport.reportKey ?? oldLogicCleanupReport.status ?? "unknown")}`,
        "Creator dashboard fake-live and self-loop risks are inventoried separately from runtime cleanup.",
      ],
      "legacy_lane_candidate",
      "Use creator cleanup reports only as evidence; require component/API usage checks before edits.",
      buildUsageEvidence(root, trackedFiles, "agent/state/creator-lane-old-logic-cleanup.generated.json", 5),
    ),
    finding(
      "codebase-junk-cleanup-zero-orphan-baseline-is-not-cleanup-truth",
      "repo cleanup",
      "P2",
      "Codebase junk cleanup baseline is too shallow for spring cleaning",
      "The junk report classifies files but can still show no orphan candidates because it relies on filename/package-script heuristics.",
      [
        "scripts/agent/scan-codebase-junk.ts",
        "agent/state/codebase-junk-cleanup.generated.json",
      ],
      [
        `junkReportOrphanCandidates=${Array.isArray(junkReport.orphanCandidates) ? junkReport.orphanCandidates.length : "unknown"}`,
        "Spring-cleaning inventory uses lane-level conflicts, UI/API source checks, and generated-report owner checks instead.",
      ],
      "validator_replacement_candidate",
      "Keep codebase-junk as a low-level classifier and make this report the cleanup rewire inventory.",
      buildUsageEvidence(root, trackedFiles, "scripts/agent/scan-codebase-junk.ts", 5),
    ),
  ];
}

function buildFakeAuthorityRisks(root: string, trackedFiles: string[], inventory: GeneratedReportInventoryItem[]) {
  const scoreRunner = readText(root, "scripts/agent/score-public-beta-readiness.ts");
  const controlTower = readText(root, "src/lib/admin-debug-control-tower.ts");
  const adminMetrics = readText(root, "src/lib/server/admin-user-metrics-snapshot.ts");
  const creatorSettingsHub = readText(root, "src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const adminAnalyticsState = readText(root, "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
  const staleAuthorityReports = inventory.filter((item) => item.action === "stale_authority_risk");

  return [
    finding(
      "public-beta-score-ui-aggregate-score-drift",
      "public beta score UI",
      "P1",
      "Admin Debug can show an aggregate score instead of the canonical public beta score",
      "The Control Tower averages generated report scores, which can look like the canonical public beta score while beta readiness has its own score/cap reasons.",
      [
        "src/lib/admin-debug-control-tower.ts",
        "agent/state/public-beta-score.generated.json",
      ],
      [
        `controlTowerAveragesScores=${hasAll(controlTower, ["scoreValues", "average"])}`,
        `controlTowerMentionsPublicBetaScore=${controlTower.includes("public-beta-score.generated.json")}`,
      ],
      "needs_human_review",
      "Make Admin Debug show the canonical public beta score and separate it from the control-tower aggregate.",
      buildUsageEvidence(root, trackedFiles, "agent/state/public-beta-score.generated.json", 6),
    ),
    finding(
      "watch-seconds-total-can-look-canonical",
      "watch time",
      "P1",
      "watchSecondsTotal/page duration can still look canonical",
      "Admin metrics code and tests still expose watchSecondsTotal-style inputs near canonical watch rollup output.",
      [
        "src/lib/server/admin-user-metrics-snapshot.ts",
        "tests/unit/admin-user-metrics.spec.ts",
        "src/lib/server/watch-time-rollup.ts",
      ],
      [
        `adminMetricsMentionsWatchSecondsTotal=${adminMetrics.includes("watchSecondsTotal")}`,
        "Canonical watch time is watch-session rollup, not page-duration fallback.",
      ],
      "legacy_lane_candidate",
      "Split diagnostic page-duration fields from canonical watch-session rollup fields in tests and display contracts.",
      buildUsageEvidence(root, trackedFiles, "src/lib/server/admin-user-metrics-snapshot.ts", 5),
    ),
    finding(
      "creator-dashboard-stats-object-presence-live-risk",
      "creator dashboard",
      "P0",
      "Creator dashboard stats can render live from object presence",
      "CreatorDashboardSettingsHub uses object presence to mark stats live, but the API does not prove source samples/freshness in that state.",
      [
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/app/api/creator/settings/route.ts",
      ],
      [
        `statsPresenceLive=${creatorSettingsHub.includes("stats ? \"live\" : \"unavailable\"")}`,
        "Route payload does not expose a sourceFreshness/sourceSamples contract for the hub state.",
      ],
      "needs_human_review",
      "Add explicit creator stats source metadata before any UI can call the data live.",
      buildUsageEvidence(root, trackedFiles, "src/components/Creators/CreatorDashboardSettingsHub.tsx", 6),
    ),
    finding(
      "admin-debug-generated-reports-can-look-live-while-stale",
      "admin debug",
      "P1",
      "Admin Debug generated reports can look live while stale",
      "Generated reports are local snapshots; Control Tower cards need a stronger current-head/freshness display contract when reports are stale or source commits differ.",
      [
        "src/lib/admin-debug-control-tower.ts",
        "agent/state/*.generated.json",
      ],
      [
        `staleAuthorityReports=${staleAuthorityReports.length}`,
        `controlTowerUsesGeneratedAt=${controlTower.includes("generatedAt")}`,
        `controlTowerUsesCurrentHead=${controlTower.includes("currentHead")}`,
      ],
      "needs_human_review",
      "Add currentHead/sourceCommit mismatch handling and grouped stale caps for generated-report cards.",
      staleAuthorityReports.slice(0, 6).map((item) => `${item.path}:${item.freshness}`),
    ),
    finding(
      "raw-analytics-logs-can-appear-as-display-truth",
      "admin analytics",
      "P1",
      "Raw analytics logs can appear as display truth",
      "Admin analytics state includes raw events alongside summarized display cards, so stale/fallback labels need panel-level ownership.",
      [
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/admin/analytics/AdminAnalyticsDashboard.tsx",
      ],
      [
        `rawEventsPresent=${adminAnalyticsState.includes("rawEvents")}`,
        `liveInteractionEventsPresent=${adminAnalyticsState.includes("liveInteractionEvents")}`,
      ],
      "needs_human_review",
      "Inventory each analytics panel as raw, cached, live, fallback, or unavailable before removing redundant cards.",
      buildUsageEvidence(root, trackedFiles, "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx", 6),
    ),
    finding(
      "provider-smoke-operator-report-can-look-like-pass",
      "provider smoke",
      "P1",
      "Operator-reported provider smoke can look like passing smoke",
      "The score runner infers provider smoke from final launch text, while provider evidence can track PayPal operator reports that must not pass formal provider smoke.",
      [
        "scripts/agent/score-public-beta-readiness.ts",
        "agent/state/provider-smoke-evidence.generated.json",
      ],
      [
        `scoreReadsFinalLaunchText=${scoreRunner.includes("final-launch-readiness-report.generated.json")}`,
        "Provider smoke evidence has a formal missing/operator-reported status that should remain non-passing.",
      ],
      "validator_replacement_candidate",
      "Wire provider-smoke-evidence.generated.json directly into the beta score and keep operator reports tracked-not-passing.",
      buildUsageEvidence(root, trackedFiles, "agent/state/provider-smoke-evidence.generated.json", 6),
    ),
    finding(
      "generated-reports-over-24h-authority-risk",
      "generated reports",
      staleAuthorityReports.length > 0 ? "P1" : "P3",
      staleAuthorityReports.length > 0
        ? "Generated reports older than 24 hours are consumed by score/debug/readiness"
        : "Generated report authority consumers are currently fresh",
      "Generated reports become stale after 24 hours unless an explicit contract says otherwise.",
      ["agent/state/*.generated.json"],
      staleAuthorityReports.length > 0
        ? staleAuthorityReports.slice(0, 8).map((item) => `${item.path} ageHours=${item.ageHours}`)
        : ["No stale generated report consumed by score/debug/readiness was found."],
      staleAuthorityReports.length > 0 ? "stale_doc_candidate" : "keep_current_authority",
      staleAuthorityReports.length > 0
        ? "Refresh or demote stale consumed reports before using them as readiness/Admin Debug truth."
        : "Keep current freshness checks and rerun this inventory after score evidence wiring.",
      staleAuthorityReports.slice(0, 6).map((item) => item.path),
    ),
  ];
}

function uiFinding(
  findingKey: string,
  lane: string,
  severity: Severity,
  title: string,
  description: string,
  files: string[],
  evidence: string[],
  cleanupType: CleanupType,
  recommendedAction: string,
  routeOrComponent: string,
  expectedApiOrSource: string,
  actualApiOrSource: string,
  sourceMetadataPresent: boolean,
  staleUnavailableHandling: boolean,
  brokenOrSelfLoopLinks: boolean,
  usageEvidence: string[] = [],
): DisconnectedUiSurfaceFinding {
  return {
    ...finding(
      findingKey,
      lane,
      severity,
      title,
      description,
      files,
      evidence,
      cleanupType,
      recommendedAction,
      usageEvidence,
    ),
    routeOrComponent,
    expectedApiOrSource,
    actualApiOrSource,
    sourceMetadataPresent,
    staleUnavailableHandling,
    brokenOrSelfLoopLinks,
  };
}

function buildDisconnectedUiSurfaces(root: string, trackedFiles: string[]) {
  const creatorHub = readText(root, "src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const creatorRoute = readText(root, "src/app/api/creator/settings/route.ts");
  const broadcastManager = readText(root, "src/components/Creators/CreatorBroadcastManager.tsx");
  const controlTower = readText(root, "src/lib/admin-debug-control-tower.ts");
  const adminAnalyticsState = readText(root, "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
  const releaseNotesDrawer = readText(root, "src/components/BetaReleaseNotesDrawer.tsx");
  const dashboardFiles = trackedFiles.filter((file) =>
    file.startsWith("src/app/dashboard") || file.startsWith("src/components/Dashboard"),
  );
  const dashboardHrefEvidence = dashboardFiles.flatMap((file) => {
    const source = readText(root, file);
    const matches = Array.from(source.matchAll(/href:\s*["']([^"']+)["']|href=["']([^"']+)["']/gu), (match) => match[1] ?? match[2]);
    const duplicateRoutes = matches.filter((route, index) => matches.indexOf(route) !== index);
    return duplicateRoutes.map((route) => `${file}:${route}`);
  });

  return [
    uiFinding(
      "creator-dashboard-settings-hub-fake-live-risk",
      "creator dashboard",
      "P0",
      "CreatorDashboardSettingsHub can mark stats live without source samples",
      "The component marks stats live from object presence and also contains creator dashboard self-loop links.",
      [
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/app/api/creator/settings/route.ts",
      ],
      [
        `statsPresenceLive=${creatorHub.includes("stats ? \"live\" : \"unavailable\"")}`,
        `repeatedDashboardCreatorLinks=${(creatorHub.match(/\/dashboard\/creator/g) ?? []).length}`,
        `routeHasSourceFreshness=${creatorRoute.includes("sourceFreshness")}`,
      ],
      "needs_human_review",
      "Add source/sample metadata and replace self-loop links with usable settings, broadcast, profile, or analytics destinations.",
      "CreatorDashboardSettingsHub",
      "Creator settings API with source freshness/sample metadata",
      "/api/creator/settings stats object presence",
      creatorRoute.includes("sourceFreshness"),
      creatorHub.includes("unavailable"),
      (creatorHub.match(/\/dashboard\/creator/g) ?? []).length > 1,
      buildUsageEvidence(root, trackedFiles, "src/components/Creators/CreatorDashboardSettingsHub.tsx", 8),
    ),
    uiFinding(
      "creator-broadcast-manager-needs-source-and-empty-state-inventory",
      "creator dashboard",
      "P2",
      "CreatorBroadcastManager needs a source/empty-state connection inventory",
      "Broadcast management is a creator surface with async state; this pass records it for cleanup mapping without changing runtime behavior.",
      ["src/components/Creators/CreatorBroadcastManager.tsx", "src/app/api/creator/broadcasts/route.ts"],
      [
        `broadcastManagerLoaded=${broadcastManager.length > 0}`,
        `broadcastManagerMentionsFetch=${/fetch\(/u.test(broadcastManager)}`,
      ],
      "needs_human_review",
      "Verify the expected creator broadcast API, source metadata, and unavailable handling before any UI cleanup.",
      "CreatorBroadcastManager",
      "Creator broadcast API with typed loading/error/empty states",
      broadcastManager.includes("/api/creator/broadcasts") ? "/api/creator/broadcasts" : "component-local async source",
      /source|fresh|sample/i.test(broadcastManager),
      /empty|unavailable|error|failed/i.test(broadcastManager),
      false,
      buildUsageEvidence(root, trackedFiles, "src/components/Creators/CreatorBroadcastManager.tsx", 6),
    ),
    uiFinding(
      "admin-debug-control-tower-score-and-stale-report-drift",
      "admin debug",
      "P1",
      "Admin Debug Control Tower is connected but score/stale-report semantics drift",
      "Control Tower consumes generated reports and averages scores, but public beta score and stale generated-report caps need explicit display separation.",
      ["src/lib/admin-debug-control-tower.ts", "agent/state/public-beta-score.generated.json"],
      [
        `controlTowerAveragesScores=${hasAll(controlTower, ["scoreValues", "average"])}`,
        `controlTowerReadsPublicBeta=${controlTower.includes("public-beta-score.generated.json")}`,
      ],
      "needs_human_review",
      "Separate canonical beta score cards from aggregate control-tower score and expose stale/currentHead metadata.",
      "Admin Debug Control Tower",
      "Canonical generated report card with score-specific source metadata",
      "Generated report registry and averaged score model",
      controlTower.includes("generatedAt"),
      controlTower.includes("stale") || controlTower.includes("ageHours"),
      false,
      buildUsageEvidence(root, trackedFiles, "src/lib/admin-debug-control-tower.ts", 8),
    ),
    uiFinding(
      "admin-analytics-panels-need-display-truth-map",
      "admin analytics",
      "P1",
      "Admin Analytics panels need a display-truth map before clutter cleanup",
      "Admin Analytics mixes raw events, cached summaries, fallback labels, and live pulse panels; validator coverage does not yet prove each panel source.",
      [
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/admin/analytics/AdminAnalyticsDashboard.tsx",
      ],
      [
        `rawEvents=${adminAnalyticsState.includes("rawEvents")}`,
        `fallback=${/fallback/i.test(adminAnalyticsState)}`,
        `stale=${/stale/i.test(adminAnalyticsState)}`,
      ],
      "needs_human_review",
      "Inventory panel source labels before merging or deleting redundant analytics cards.",
      "Admin Analytics panels",
      "Panel-level source contracts: live/cached/stale/fallback/failed",
      "Mixed hook state from raw events and summaries",
      /source|fresh|cached/i.test(adminAnalyticsState),
      /stale|fallback|failed/i.test(adminAnalyticsState),
      false,
      buildUsageEvidence(root, trackedFiles, "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx", 8),
    ),
    uiFinding(
      "beta-release-notes-drawer-is-current-but-needs-owner-in-cleanup-map",
      "release notes",
      "P3",
      "Beta Release Notes drawer is a current owned lane",
      "The release notes drawer is not a deletion candidate; this inventory records it because Beta badge updates are required for accepted patches.",
      ["src/components/BetaReleaseNotesDrawer.tsx", "src/lib/release-notes/public-release-notes.ts"],
      [
        `drawerLoaded=${releaseNotesDrawer.length > 0}`,
        `drawerMentionsReleaseNotes=${/release/i.test(releaseNotesDrawer)}`,
      ],
      "keep_current_authority",
      "Keep the drawer wired to the public release-note contract and do not fold it into cleanup.",
      "Beta Release Notes drawer",
      "Public release notes contract",
      "Bundled public release notes",
      releaseNotesDrawer.includes("release"),
      /empty|fallback|unavailable/i.test(releaseNotesDrawer),
      false,
      buildUsageEvidence(root, trackedFiles, "src/components/BetaReleaseNotesDrawer.tsx", 6),
    ),
    uiFinding(
      "dashboard-route-link-inventory-needed",
      "dashboard links",
      dashboardHrefEvidence.length > 0 ? "P1" : "P3",
      dashboardHrefEvidence.length > 0
        ? "Dashboard surfaces contain repeated routes that need destination review"
        : "Dashboard route link scan did not find duplicate href evidence",
      "Repeated hrefs and self-loop destinations can make valid users hit unusable dashboard paths; this pass inventories them without changing navigation.",
      dashboardFiles.slice(0, 12),
      dashboardHrefEvidence.length > 0 ? dashboardHrefEvidence.slice(0, 12) : ["No repeated href evidence found by static scan."],
      dashboardHrefEvidence.length > 0 ? "needs_human_review" : "keep_current_authority",
      dashboardHrefEvidence.length > 0
        ? "Replace repeated/self-loop destinations only after route ownership is mapped."
        : "Keep route scan as a cleanup guardrail.",
      "dashboard/profile, dashboard/creator, dashboard/settings links",
      "Distinct profile, creator, settings, analytics, and broadcast routes",
      "Static hrefs in dashboard components",
      false,
      false,
      dashboardHrefEvidence.length > 0,
      dashboardHrefEvidence.slice(0, 8),
    ),
  ];
}

function buildCleanupCandidates(
  root: string,
  trackedFiles: string[],
  inventory: GeneratedReportInventoryItem[],
  doctrineConflicts: InventoryFinding[],
  validatorConflicts: InventoryFinding[],
  legacyLaneCandidates: InventoryFinding[],
) {
  const staleReportCandidates = inventory
    .filter((item) => item.action === "archive_candidate" || item.action === "needs_owner" || item.action === "stale_authority_risk")
    .slice(0, 20)
    .map((item) =>
      finding(
        `generated-report-${item.action}-${basename(item.path).replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "")}`,
        "generated reports",
        item.action === "stale_authority_risk" ? "P1" : item.action === "needs_owner" ? "P2" : "P3",
        `${item.path} is ${item.action.replaceAll("_", " ")}`,
        "Generated reports are evidence snapshots; this candidate is inventory-only and must not be deleted without owner/consumer confirmation.",
        [item.path, ...unique([item.ownerScript ?? "", item.ownerDoc ?? ""])],
        [
          `freshness=${item.freshness}`,
          `ageHours=${item.ageHours}`,
          `consumedByScore=${item.consumedByScore}`,
          `consumedByAdminDebug=${item.consumedByAdminDebug}`,
          `consumedByLaunchReadiness=${item.consumedByLaunchReadiness}`,
        ],
        item.action === "stale_authority_risk"
          ? "stale_doc_candidate"
          : item.action === "needs_owner"
            ? "needs_human_review"
            : "archive_candidate",
        "Confirm owner script, owner doc, and score/Admin Debug/launch consumers before any archive action.",
        item.usageEvidence,
      ),
    );

  const doctrineCleanup = doctrineConflicts
    .filter((item) => item.cleanupType !== "keep_current_authority")
    .map((item) => ({
      ...item,
      findingKey: `cleanup-${item.findingKey}`,
    }));

  const validatorCleanup = validatorConflicts
    .filter((item) => item.cleanupType !== "keep_current_authority")
    .map((item) => ({
      ...item,
      findingKey: `cleanup-${item.findingKey}`,
    }));

  const legacyCleanup = legacyLaneCandidates.map((item) => ({
    ...item,
    findingKey: `cleanup-${item.findingKey}`,
  }));

  const docsWithManyLaneNames = [
    {
      key: "analytics-truth-docs-merge-candidate",
      lane: "analytics truth",
      files: trackedFiles.filter((file) =>
        file.startsWith("docs/agent-truth/")
        && /analytics|tracking|telemetry/u.test(file)
        && file.endsWith(".md"),
      ).slice(0, 18),
    },
    {
      key: "launch-readiness-docs-merge-candidate",
      lane: "launch readiness",
      files: trackedFiles.filter((file) =>
        file.startsWith("docs/agent-truth/")
        && /launch|readiness/u.test(file)
        && file.endsWith(".md"),
      ).slice(0, 18),
    },
  ].map((group) =>
    finding(
      group.key,
      group.lane,
      "P2",
      `${group.lane} docs need merge/owner review`,
      "Multiple docs describe the same lane. This is a merge candidate only; no file is unused without separate import/reference proof.",
      group.files,
      [`docCount=${group.files.length}`],
      "merge_candidate",
      "Pick one canonical surface doc and demote older docs to evidence or archive candidates after reference checks.",
      group.files,
    ),
  );

  return [
    ...staleReportCandidates,
    ...doctrineCleanup,
    ...validatorCleanup,
    ...legacyCleanup,
    ...docsWithManyLaneNames,
  ];
}

function buildRecommendedSections() {
  return [
    {
      sectionKey: "generated-report-snapshot-map",
      title: "Generated Report Snapshot Map",
      purpose: "Track generated report age, owner script, owner doc, and score/Admin Debug/launch readiness consumers before cleanup.",
      sourceFindings: ["generated-reports-over-24h-authority-risk"],
      recommendedOwner: "agent tooling",
    },
    {
      sectionKey: "score-evidence-contract",
      title: "Score Evidence Contract",
      purpose: "Keep score artifact ingestion separate from cleanup while proving stale boolean/string scoring lanes.",
      sourceFindings: [
        "public-beta-score-doctrine-still-allows-boolean-evidence-lane",
        "provider-smoke-final-report-string-parser-legacy-lane",
      ],
      recommendedOwner: "public beta score",
    },
    {
      sectionKey: "ui-source-metadata-map",
      title: "UI Source Metadata Map",
      purpose: "Map UI lanes that render live/healthy from object presence, cached summaries, or generated reports.",
      sourceFindings: [
        "creator-dashboard-settings-hub-fake-live-risk",
        "admin-debug-control-tower-score-and-stale-report-drift",
        "admin-analytics-panels-need-display-truth-map",
      ],
      recommendedOwner: "admin and creator UI truth",
    },
    {
      sectionKey: "validator-replacement-map",
      title: "Validator Replacement Map",
      purpose: "Identify string-heavy or overlapping validators before replacing them with schema/source-backed checks.",
      sourceFindings: [
        "beta-score-validator-can-pass-while-score-ignores-formal-evidence",
        "codebase-junk-cleanup-validator-is-too-permissive",
      ],
      recommendedOwner: "agent validators",
    },
  ];
}

function buildRecommendedFixOrder() {
  return [
    {
      stepKey: "phase-one-score-evidence-ingestion",
      severity: "P1" as const,
      title: "Wire formal beta score evidence artifacts",
      targetFiles: [
        "scripts/agent/score-public-beta-readiness.ts",
        "src/lib/agent-score/core.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "tests/unit/public-beta-score.spec.ts",
      ],
      validators: [
        "npm run check:phase-one-score-ui-triage",
        "npm run check:beta-score",
      ],
      rationale: "This removes the stale boolean/string score path before cleanup decisions depend on score truth.",
    },
    {
      stepKey: "creator-dashboard-source-sample-contract",
      severity: "P0" as const,
      title: "Add source/sample metadata for creator dashboard live stats",
      targetFiles: [
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/app/api/creator/settings/route.ts",
      ],
      validators: [
        "npm run check:settings-creator-dashboard-split",
        "npm run check:creator-dashboard-projection-lock",
      ],
      rationale: "This prevents live/healthy creator UI states without source proof.",
    },
    {
      stepKey: "admin-debug-canonical-score-connection",
      severity: "P1" as const,
      title: "Separate canonical public beta score from Control Tower aggregate",
      targetFiles: [
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/admin-debug-summary-cards.ts",
      ],
      validators: [
        "npm run check:admin-debug-control-tower",
        "npm run check:debug-control-tower-cutover",
      ],
      rationale: "This prevents Admin Debug score drift and makes stale generated report state visible.",
    },
    {
      stepKey: "watch-time-test-contract-lock",
      severity: "P1" as const,
      title: "Lock watch-session rollup as canonical watch time in tests",
      targetFiles: [
        "src/lib/server/watch-time-rollup.ts",
        "src/lib/server/admin-user-metrics-snapshot.ts",
        "tests/unit/admin-user-metrics.spec.ts",
      ],
      validators: [
        "npm run check:watch-time-rollup-truth",
        "npm run check:admin-user-metrics-snapshot",
      ],
      rationale: "This prevents page-duration diagnostics from reappearing as canonical watch time.",
    },
    {
      stepKey: "generated-report-owner-and-staleness-cleanup",
      severity: "P2" as const,
      title: "Assign owners and staleness actions to stale generated reports",
      targetFiles: [
        "agent/state/*.generated.json",
        "docs/agent-truth/*.md",
        "scripts/agent/*.ts",
      ],
      validators: [
        "npm run check:generated-report-authority",
        "npm run check:repo-spring-cleaning-rewire",
      ],
      rationale: "This makes archive/merge decisions evidence-backed instead of filename-driven.",
    },
    {
      stepKey: "validator-string-check-consolidation",
      severity: "P2" as const,
      title: "Replace string-heavy validator overlaps with schema/source-backed checks",
      targetFiles: [
        "scripts/agent/*.ts",
        "scripts/check-*.ts",
        "package.json",
      ],
      validators: [
        "npm run check:repo-spring-cleaning-rewire",
      ],
      rationale: "This reduces validators that pass while UI/runtime lanes remain disconnected.",
    },
  ];
}

function allFindings(report: Omit<RepoSpringCleaningRewireReport, "summary">) {
  return [
    ...report.doctrineConflicts,
    ...report.validatorConflicts,
    ...report.legacyLaneCandidates,
    ...report.fakeAuthorityRisks,
    ...report.disconnectedUiSurfaces,
    ...report.cleanupCandidates,
  ];
}

function countSeverity(findings: InventoryFinding[], severity: Severity) {
  return findings.filter((item) => item.severity === severity).length;
}

function buildSummary(report: Omit<RepoSpringCleaningRewireReport, "summary">): RepoSpringCleaningRewireReport["summary"] {
  const findings = allFindings(report);
  return {
    generatedReportsScanned: report.generatedReportInventory.length,
    staleGeneratedReports: report.generatedReportInventory.filter((item) => item.freshness === "stale").length,
    duplicateDoctrineGroups: report.doctrineConflicts.filter((item) =>
      item.cleanupType === "merge_candidate" || item.cleanupType === "stale_doc_candidate",
    ).length,
    conflictingValidatorGroups: report.validatorConflicts.filter((item) =>
      item.cleanupType !== "keep_current_authority",
    ).length,
    legacyLanes: report.legacyLaneCandidates.length,
    fakeAuthorityRisks: report.fakeAuthorityRisks.length,
    disconnectedUiSurfaces: report.disconnectedUiSurfaces.length,
    cleanupCandidates: report.cleanupCandidates.length,
    p0Count: countSeverity(findings, "P0"),
    p1Count: countSeverity(findings, "P1"),
    p2Count: countSeverity(findings, "P2"),
    p3Count: countSeverity(findings, "P3"),
  };
}

export function buildRepoSpringCleaningRewireReport(options: {
  root?: string;
  now?: Date;
} = {}): RepoSpringCleaningRewireReport {
  const root = options.root ?? process.cwd();
  const now = options.now ?? new Date();
  const trackedFiles = listTrackedFiles(root);
  const currentHead = readCurrentHead(root);
  const generatedReportInventory = buildGeneratedReportInventory(root, now, trackedFiles);
  const doctrineConflicts = buildDoctrineConflicts(root, trackedFiles);
  const validatorConflicts = buildValidatorConflicts(root, trackedFiles);
  const legacyLaneCandidates = buildLegacyLaneCandidates(root, trackedFiles);
  const fakeAuthorityRisks = buildFakeAuthorityRisks(root, trackedFiles, generatedReportInventory);
  const disconnectedUiSurfaces = buildDisconnectedUiSurfaces(root, trackedFiles);
  const reportWithoutSummary = {
    generatedAtUtc: now.toISOString(),
    reportKey: "repo-spring-cleaning-rewire" as const,
    currentHead,
    generatedReportInventory,
    doctrineConflicts,
    validatorConflicts,
    legacyLaneCandidates,
    fakeAuthorityRisks,
    disconnectedUiSurfaces,
    cleanupCandidates: buildCleanupCandidates(
      root,
      trackedFiles,
      generatedReportInventory,
      doctrineConflicts,
      validatorConflicts,
      legacyLaneCandidates,
    ),
    recommendedSections: buildRecommendedSections(),
    recommendedFixOrder: buildRecommendedFixOrder(),
  };

  return {
    ...reportWithoutSummary,
    summary: buildSummary(reportWithoutSummary),
  };
}

function validateFinding(kind: string, findingItem: InventoryFinding, failures: string[]) {
  if (!findingItem.findingKey) failures.push(`${kind} finding is missing findingKey.`);
  if (!findingItem.lane) failures.push(`${findingItem.findingKey} is missing lane.`);
  if (!findingItem.title) failures.push(`${findingItem.findingKey} is missing title.`);
  if (!findingItem.description) failures.push(`${findingItem.findingKey} is missing description.`);
  if (!Array.isArray(findingItem.files) || findingItem.files.length === 0) {
    failures.push(`${findingItem.findingKey} must list files.`);
  }
  if (!Array.isArray(findingItem.evidence) || findingItem.evidence.length === 0) {
    failures.push(`${findingItem.findingKey} must list static evidence.`);
  }
  if (!findingItem.recommendedAction) failures.push(`${findingItem.findingKey} is missing recommendedAction.`);
}

export function validateRepoSpringCleaningRewireReport(report: RepoSpringCleaningRewireReport) {
  const failures: string[] = [];
  if (report.reportKey !== "repo-spring-cleaning-rewire") failures.push("reportKey must be repo-spring-cleaning-rewire.");
  if (!report.generatedAtUtc) failures.push("generatedAtUtc is required.");
  if (!report.currentHead) failures.push("currentHead is required.");
  if (!Array.isArray(report.generatedReportInventory) || report.generatedReportInventory.length === 0) {
    failures.push("generatedReportInventory must contain agent/state generated reports.");
  }

  for (const item of report.generatedReportInventory) {
    if (!item.path.startsWith("agent/state/") || !item.path.endsWith(".generated.json")) {
      failures.push(`Invalid generated report path: ${item.path}`);
    }
    if (!item.action) failures.push(`${item.path} is missing action.`);
    if (!Array.isArray(item.usageEvidence) || item.usageEvidence.length === 0) {
      failures.push(`${item.path} is missing usageEvidence.`);
    }
  }

  const requiredFindingKeys = [
    "public-beta-score-doctrine-still-allows-boolean-evidence-lane",
    "beta-score-validator-can-pass-while-score-ignores-formal-evidence",
    "provider-smoke-final-report-string-parser-legacy-lane",
    "creator-dashboard-stats-object-presence-live-risk",
    "admin-debug-generated-reports-can-look-live-while-stale",
    "watch-time-admin-metrics-legacy-duration-test",
    "creator-dashboard-settings-hub-fake-live-risk",
    "admin-debug-control-tower-score-and-stale-report-drift",
    "codebase-junk-cleanup-validator-is-too-permissive",
  ];

  const findings = allFindings(report);
  const findingKeys = new Set(findings.map((item) => item.findingKey));
  for (const key of requiredFindingKeys) {
    if (!findingKeys.has(key) && !findingKeys.has(`cleanup-${key}`)) {
      failures.push(`Missing required finding: ${key}`);
    }
  }

  for (const group of [
    ["doctrineConflicts", report.doctrineConflicts],
    ["validatorConflicts", report.validatorConflicts],
    ["legacyLaneCandidates", report.legacyLaneCandidates],
    ["fakeAuthorityRisks", report.fakeAuthorityRisks],
    ["disconnectedUiSurfaces", report.disconnectedUiSurfaces],
    ["cleanupCandidates", report.cleanupCandidates],
  ] as const) {
    for (const item of group[1]) validateFinding(group[0], item, failures);
  }

  const summary = buildSummary({
    generatedAtUtc: report.generatedAtUtc,
    reportKey: report.reportKey,
    currentHead: report.currentHead,
    generatedReportInventory: report.generatedReportInventory,
    doctrineConflicts: report.doctrineConflicts,
    validatorConflicts: report.validatorConflicts,
    legacyLaneCandidates: report.legacyLaneCandidates,
    fakeAuthorityRisks: report.fakeAuthorityRisks,
    disconnectedUiSurfaces: report.disconnectedUiSurfaces,
    cleanupCandidates: report.cleanupCandidates,
    recommendedSections: report.recommendedSections,
    recommendedFixOrder: report.recommendedFixOrder,
  });

  for (const [key, value] of Object.entries(summary)) {
    if (report.summary[key as keyof typeof summary] !== value) {
      failures.push(`summary.${key} must be ${value}.`);
    }
  }

  if (!report.fakeAuthorityRisks.some((item) => item.severity === "P0" || item.severity === "P1")) {
    failures.push("fakeAuthorityRisks must include P0/P1 risks.");
  }
  if (!report.disconnectedUiSurfaces.some((item) => item.brokenOrSelfLoopLinks || !item.sourceMetadataPresent)) {
    failures.push("disconnectedUiSurfaces must include missing metadata or self-loop evidence.");
  }
  if (!report.recommendedFixOrder.some((item) => item.stepKey === "phase-one-score-evidence-ingestion")) {
    failures.push("recommendedFixOrder must include phase-one-score-evidence-ingestion.");
  }

  return failures;
}

function validateRepoFiles(root: string, report: RepoSpringCleaningRewireReport) {
  const failures = validateRepoSpringCleaningRewireReport(report);
  const packageJson = readText(root, "package.json");
  const thisScript = readText(root, "scripts/agent/validate-repo-spring-cleaning-rewire.ts");
  const doc = readText(root, DOC_PATH);

  if (!packageJson.includes("\"check:repo-spring-cleaning-rewire\"")) {
    failures.push("package.json must include check:repo-spring-cleaning-rewire.");
  }
  if (!doc.includes("Repo Spring Cleaning Rewire")) {
    failures.push(`${DOC_PATH} must document the spring-cleaning inventory.`);
  }
  for (const expected of [
    "generatedReportInventory",
    "doctrineConflicts",
    "validatorConflicts",
    "fakeAuthorityRisks",
    "disconnectedUiSurfaces",
    "cleanupCandidates",
  ]) {
    if (!doc.includes(expected)) failures.push(`${DOC_PATH} must document ${expected}.`);
  }
  for (const forbiddenPattern of [
    /execFileSync\(\s*["']firebase/u,
    /execFileSync\(\s*["']gcloud/u,
    /execFileSync\(\s*["']bq/u,
    /execFileSync\(\s*["']npx["']\s*,\s*\[[^\]]*["']playwright/u,
    /execFileSync\(\s*["']npm["']\s*,\s*\[[^\]]*["']run["'][^\]]*["']check["']/u,
  ]) {
    if (forbiddenPattern.test(thisScript)) {
      failures.push(`Validator must not call forbidden provider/browser/full-check command: ${forbiddenPattern.source}`);
    }
  }

  return failures;
}

function writeReport(root: string, report: RepoSpringCleaningRewireReport) {
  const fullPath = repoPath(root, REPORT_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const root = process.cwd();
  const report = buildRepoSpringCleaningRewireReport({ root });
  writeReport(root, report);
  const failures = validateRepoFiles(root, report);

  if (failures.length > 0) {
    console.error("Repo spring-cleaning rewire validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Repo spring-cleaning rewire validation passed: reports=${report.summary.generatedReportsScanned}, stale=${report.summary.staleGeneratedReports}, cleanupCandidates=${report.summary.cleanupCandidates}, P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}, P3=${report.summary.p3Count}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
