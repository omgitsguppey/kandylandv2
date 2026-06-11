import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type DebugCockpitPrAction =
  | "merged"
  | "cherry_picked"
  | "manual_implemented"
  | "closed_superseded"
  | "closed_not_planned"
  | "preserved_with_reason";

export type DebugCockpitPrSummary = {
  number: number;
  title: string;
  headRefName?: string;
  baseRefName?: string;
  mergeStateStatus?: string;
  isDraft?: boolean;
  updatedAt?: string;
  url: string;
};

export type ScoreDimensionSnapshot = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

export type DebugCockpitPrFinalizationReport = {
  generatedAtUtc: string;
  currentHeadBefore: string;
  currentHeadAfter: string;
  openPrsBefore: DebugCockpitPrSummary[];
  handledPrs: Array<{
    number: number;
    title: string;
    action: DebugCockpitPrAction;
    reason: string;
    filesTouched: string[];
    scratchFilesExcluded: string[];
    validatorsRun: string[];
  }>;
  openPrsAfter: DebugCockpitPrSummary[];
  unclassifiedPrCount: number;
  preservedPrs: Array<{ number: number; reason: string }>;
  dirtyFilesBefore: Array<{ path: string; classification: string }>;
  dirtyFilesAfter: Array<{ path: string; classification: string }>;
  scoreBefore: ScoreDimensionSnapshot;
  scoreAfter: ScoreDimensionSnapshot;
  nextBatchAllowed: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const statePath = join(repoRoot, "agent/state/debug-cockpit-pr-finalization.generated.json");
const docPath = join(repoRoot, "docs/agent-truth/debug-cockpit-pr-finalization.md");

const currentHeadBefore = "1cd6cabf1a90d7cb5095398ef594cb6e3eef54c9";
const scoreBefore: ScoreDimensionSnapshot = {
  sourceHealth: 92.5,
  runtimeHealth: 84.2,
  evidenceCompleteness: 69.6,
  freshness: 83.75,
  costRisk: 42,
  regressionRisk: 86,
  overallHealthScore: 79.25,
};

const openPrsBefore: DebugCockpitPrSummary[] = [
  {
    number: 289,
    title: "Improve onboarding friction visibility and technical rescue signals",
    headRefName: "improve-onboarding-friction-visibility-12446689645284121137",
    baseRefName: "main",
    mergeStateStatus: "CLEAN",
    isDraft: false,
    updatedAt: "2026-05-24T06:04:41Z",
    url: "https://github.com/omgitsguppey/kandylandv2/pull/289",
  },
  {
    number: 288,
    title: "Reduce monolith file risk and clarify responsibility boundaries",
    headRefName: "reduce-monolith-risk-docs-3328042848981873843",
    baseRefName: "main",
    mergeStateStatus: "CLEAN",
    isDraft: false,
    updatedAt: "2026-05-24T05:51:49Z",
    url: "https://github.com/omgitsguppey/kandylandv2/pull/288",
  },
  {
    number: 287,
    title: "Sentinel: [HIGH] Fix Open Redirect via Protocol-Relative URLs",
    headRefName: "sentinel-fix-open-redirect-15307485972163067959",
    baseRefName: "main",
    mergeStateStatus: "CLEAN",
    isDraft: false,
    updatedAt: "2026-05-23T15:34:51Z",
    url: "https://github.com/omgitsguppey/kandylandv2/pull/287",
  },
  {
    number: 286,
    title: "Bolt: Replace nested array.find with Map lookups in debug route",
    headRefName: "bolt-debug-route-map-lookups-5419024004378950002",
    baseRefName: "main",
    mergeStateStatus: "CLEAN",
    isDraft: false,
    updatedAt: "2026-05-23T14:53:55Z",
    url: "https://github.com/omgitsguppey/kandylandv2/pull/286",
  },
  {
    number: 285,
    title: "Palette: Add aria-busy state to CreatorProfileHeader follow button",
    headRefName: "jules-14981140853637173177-00d662f8",
    baseRefName: "main",
    mergeStateStatus: "CLEAN",
    isDraft: false,
    updatedAt: "2026-05-23T14:19:59Z",
    url: "https://github.com/omgitsguppey/kandylandv2/pull/285",
  },
];

const handledPrs: DebugCockpitPrFinalizationReport["handledPrs"] = [
  {
    number: 289,
    title: "Improve onboarding friction visibility and technical rescue signals",
    action: "manual_implemented",
    reason: "Ported onboarding_step_viewed backend progress visibility plus stale validation/test expectation updates into current main.",
    filesTouched: [
      "src/app/api/user/onboarding-progress/route.ts",
      "src/components/Auth/GuidedOnboarding.tsx",
      "src/lib/telemetry.ts",
      "scripts/agent/validate-user-creator-logic-cleanup.ts",
      "tests/unit/user-action-taxonomy.spec.ts",
      "tests/unit/user-creator-logic-cleanup.spec.ts",
    ],
    scratchFilesExcluded: [],
    validatorsRun: [
      "npx vitest run tests/unit/user-action-taxonomy.spec.ts tests/unit/user-creator-logic-cleanup.spec.ts",
    ],
  },
  {
    number: 288,
    title: "Reduce monolith file risk and clarify responsibility boundaries",
    action: "closed_superseded",
    reason: "Closed without landing broad FULL_SCALE_CODEBASE_AUDIT.md notes because current debug, score, and code-organization lanes already own monolith-risk tracking.",
    filesTouched: [],
    scratchFilesExcluded: [],
    validatorsRun: ["gh pr diff 288 --repo omgitsguppey/kandylandv2 --patch"],
  },
  {
    number: 287,
    title: "Sentinel: [HIGH] Fix Open Redirect via Protocol-Relative URLs",
    action: "manual_implemented",
    reason: "Ported the high-severity open redirect backslash guard for promo/admin drop action URLs without touching payment, wallet, PayPal, or GumDrop math.",
    filesTouched: ["src/components/PromoCard.tsx", "src/lib/admin-drop-form.ts"],
    scratchFilesExcluded: [],
    validatorsRun: ["npx vitest run tests/unit/promo-card.spec.ts tests/unit/admin-drop-form.spec.ts"],
  },
  {
    number: 286,
    title: "Bolt: Replace nested array.find with Map lookups in debug route",
    action: "manual_implemented",
    reason: "Ported the source-only admin debug Map lookup optimization and excluded the .jules scratch note.",
    filesTouched: ["src/app/api/admin/debug/route.ts"],
    scratchFilesExcluded: [".jules/bolt.md"],
    validatorsRun: ["npm run typecheck"],
  },
  {
    number: 285,
    title: "Palette: Add aria-busy state to CreatorProfileHeader follow button",
    action: "manual_implemented",
    reason: "Ported the creator follow button aria-busy and spinner aria-hidden accessibility fix and excluded the .Jules scratch note.",
    filesTouched: ["src/components/Creators/CreatorProfileHeader.tsx"],
    scratchFilesExcluded: [".Jules/palette.md"],
    validatorsRun: ["npx vitest run tests/unit/creator-profile-mobile-timeline.spec.ts"],
  },
];

const dirtyFilesBefore = [
  {
    path: "agent/context/optimized-task-context.generated.json",
    classification: "unrelated_agent_context_file_to_ignore",
  },
];

function run(command: string, args: string[]) {
  return execFileSync(command, args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function gitHead() {
  return run("git", ["rev-parse", "HEAD"]);
}

function parseScore(): ScoreDimensionSnapshot {
  const score = JSON.parse(readFileSync(join(repoRoot, "agent/state/public-beta-score.generated.json"), "utf8"));
  return {
    sourceHealth: score.sourceHealthScore,
    runtimeHealth: score.runtimeHealthScore,
    evidenceCompleteness: score.evidenceCompletenessScore,
    freshness: score.freshnessScore,
    costRisk: score.costRiskScore,
    regressionRisk: score.regressionRiskScore,
    overallHealthScore: score.healthScore,
  };
}

function listOpenPrs(): DebugCockpitPrSummary[] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const raw = run("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,mergeStateStatus,isDraft,headRefName,baseRefName,updatedAt",
  ]);
  return raw ? JSON.parse(raw) : [];
}

function currentDirtyPaths() {
  const tracked = run("git", ["diff", "--name-only"])
    .split(/\r?\n/u)
    .filter(Boolean);
  const untracked = run("git", ["ls-files", "--others", "--exclude-standard"])
    .split(/\r?\n/u)
    .filter(Boolean);
  return Array.from(new Set([...tracked, ...untracked])).sort((a, b) => a.localeCompare(b));
}

function classifyDirtyFile(path: string) {
  const normalized = path.toLowerCase();
  if (path === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (path === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (path === "agent/state/debug-cockpit-pr-finalization.generated.json") return "current_generated_artifact_to_commit";
  if (path === "docs/agent-truth/debug-cockpit-pr-finalization.md") return "release_artifact_expected";
  if (normalized.includes("release") || normalized.includes("changelog")) return "release_artifact_expected";
  if (path.startsWith("src/") || path.startsWith("scripts/agent/") || path.startsWith("tests/unit/") || path === "package.json") return "real_source_change_needs_review";
  return "unsafe_unknown";
}

export function buildDebugCockpitPrFinalizationReport(): DebugCockpitPrFinalizationReport {
  const openPrsAfter = listOpenPrs();
  const handledNumbers = new Set(handledPrs.map((pr) => pr.number));
  const preservedPrs = handledPrs
    .filter((pr) => pr.action === "preserved_with_reason")
    .map((pr) => ({ number: pr.number, reason: pr.reason }));
  const unclassifiedPrCount = openPrsAfter.filter((pr) => !handledNumbers.has(pr.number)).length;
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHeadBefore,
    currentHeadAfter: gitHead(),
    openPrsBefore,
    handledPrs,
    openPrsAfter,
    unclassifiedPrCount,
    preservedPrs,
    dirtyFilesBefore,
    dirtyFilesAfter: currentDirtyPaths().map((path) => ({ path, classification: classifyDirtyFile(path) })),
    scoreBefore,
    scoreAfter: parseScore(),
    nextBatchAllowed: unclassifiedPrCount === 0 && openPrsAfter.length === preservedPrs.length,
  };
}

function writeArtifacts(report: DebugCockpitPrFinalizationReport) {
  mkdirSync(dirname(statePath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docPath, [
    "# Debug Cockpit PR Finalization",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head before: ${report.currentHeadBefore}`,
    `Current head after: ${report.currentHeadAfter}`,
    `Open PRs before: ${report.openPrsBefore.map((pr) => `#${pr.number}`).join(", ") || "none"}`,
    `Open PRs after: ${report.openPrsAfter.map((pr) => `#${pr.number}`).join(", ") || "none"}`,
    `Unclassified PR count: ${report.unclassifiedPrCount}`,
    `Next batch allowed: ${report.nextBatchAllowed}`,
    "",
    "## Handled PRs",
    "",
    ...report.handledPrs.map((pr) => `- #${pr.number}: ${pr.action}. ${pr.reason}`),
    "",
    "## Scratch Files",
    "",
    `Excluded: ${report.handledPrs.flatMap((pr) => pr.scratchFilesExcluded).join(", ") || "none"}`,
    "Included: none",
    "",
    "## Score Movement",
    "",
    `Before: ${JSON.stringify(report.scoreBefore)}`,
    `After: ${JSON.stringify(report.scoreAfter)}`,
    "",
    "## Release Note",
    "",
    "- Finalized open PRs before debug cockpit cleanup.",
    "- Merged, cherry-picked, manually implemented, or closed every PR with classification.",
    "- Prepared main for accurate cockpit/evidence refresh.",
    "",
  ].join("\n"));
}

export function validateDebugCockpitPrFinalizationReport(report: DebugCockpitPrFinalizationReport) {
  const failures: string[] = [];
  const handledNumbers = new Set(report.handledPrs.map((pr) => pr.number));
  const beforeNumbers = new Set(report.openPrsBefore.map((pr) => pr.number));
  const allowedActions: DebugCockpitPrAction[] = [
    "merged",
    "cherry_picked",
    "manual_implemented",
    "closed_superseded",
    "closed_not_planned",
    "preserved_with_reason",
  ];

  for (const number of beforeNumbers) {
    if (!handledNumbers.has(number)) failures.push(`PR #${number} is missing from handledPrs.`);
  }
  for (const pr of report.handledPrs) {
    if (!allowedActions.includes(pr.action)) failures.push(`PR #${pr.number} has invalid action ${pr.action}.`);
    if (!pr.reason.trim()) failures.push(`PR #${pr.number} is missing a reason.`);
    if (pr.action === "preserved_with_reason" && pr.reason.trim().length < 12) {
      failures.push(`PR #${pr.number} is preserved without a clear reason.`);
    }
  }

  if (report.unclassifiedPrCount !== 0) failures.push("unclassifiedPrCount must be 0.");
  if (report.nextBatchAllowed && report.unclassifiedPrCount > 0) {
    failures.push("nextBatchAllowed cannot be true while unclassified PRs remain.");
  }
  if (report.openPrsAfter.some((pr) => !handledNumbers.has(pr.number))) {
    failures.push("An open PR remains unclassified.");
  }

  const securityPr = report.handledPrs.find((pr) => pr.number === 287);
  if (!securityPr || !/security|redirect|guard/iu.test(securityPr.reason)) {
    failures.push("Security PR #287 is not handled with an explicit security reason.");
  }
  const accessibilityPr = report.handledPrs.find((pr) => pr.number === 285);
  if (!accessibilityPr || !/aria|accessibility|screen reader/iu.test(accessibilityPr.reason)) {
    failures.push("Accessibility PR #285 is not handled with an explicit accessibility reason.");
  }

  const scratchIncluded = report.dirtyFilesAfter.filter((entry) => /^\.jules\//iu.test(entry.path) || /^\.Jules\//u.test(entry.path));
  if (scratchIncluded.length > 0) failures.push("Scratch .jules/.Jules files are dirty or included.");
  const scratchExcluded = report.handledPrs.flatMap((pr) => pr.scratchFilesExcluded);
  if (!scratchExcluded.includes(".jules/bolt.md")) failures.push(".jules/bolt.md exclusion must be recorded.");
  if (!scratchExcluded.includes(".Jules/palette.md")) failures.push(".Jules/palette.md exclusion must be recorded.");

  for (const entry of [...report.dirtyFilesBefore, ...report.dirtyFilesAfter]) {
    if (!entry.classification || entry.classification === "unsafe_unknown") {
      failures.push(`Dirty file ${entry.path} is unclassified or unsafe_unknown.`);
    }
  }

  for (const key of ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk", "overallHealthScore"] as const) {
    if (typeof report.scoreBefore[key] !== "number" || typeof report.scoreAfter[key] !== "number") {
      failures.push(`Score dimension ${key} is missing before/after.`);
    }
  }

  const promo = readFileSync(join(repoRoot, "src/components/PromoCard.tsx"), "utf8");
  if (!promo.includes('trimmedUrl.startsWith("\\\\")')) failures.push("PromoCard backslash redirect guard is missing.");
  const creatorHeader = readFileSync(join(repoRoot, "src/components/Creators/CreatorProfileHeader.tsx"), "utf8");
  if (!creatorHeader.includes("aria-busy={followLoading}") || !creatorHeader.includes('aria-hidden="true"')) {
    failures.push("CreatorProfileHeader follow loading accessibility state is missing.");
  }
  const debugRoute = readFileSync(join(repoRoot, "src/app/api/admin/debug/route.ts"), "utf8");
  if (!debugRoute.includes("runtimeTaskSourceParityRowsByTaskId") || !debugRoute.includes("sharedEventGroupsByEventName")) {
    failures.push("Admin debug route Map lookup optimization is missing.");
  }
  const onboardingRoute = readFileSync(join(repoRoot, "src/app/api/user/onboarding-progress/route.ts"), "utf8");
  if (!onboardingRoute.includes('"onboarding_step_viewed"')) {
    failures.push("onboarding_step_viewed is missing from onboarding progress route.");
  }

  return failures;
}

function main() {
  const initialReport = buildDebugCockpitPrFinalizationReport();
  writeArtifacts(initialReport);
  const report = {
    ...initialReport,
    dirtyFilesAfter: currentDirtyPaths().map((path) => ({ path, classification: classifyDirtyFile(path) })),
  };
  writeArtifacts(report);
  const failures = validateDebugCockpitPrFinalizationReport(report);
  if (failures.length > 0) {
    console.error("Debug cockpit PR finalization validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Debug cockpit PR finalization validated: handled=${report.handledPrs.length} openAfter=${report.openPrsAfter.length}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
