import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const STATE_PATH = "agent/state/final-math-normalization-lock.generated.json";
const DOC_PATH = "docs/agent-truth/final-math-normalization-lock.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

type FormulaKey =
  | "betaScore"
  | "confidence"
  | "legacyRecovery"
  | "globalUserCounting"
  | "watchTime"
  | "sessionBounce"
  | "gumdropLedger"
  | "creatorRevenue"
  | "costExport"
  | "metricDisplay";

type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "stale_generated_artifact_to_regenerate"
  | "unrelated_agent_context_file_to_ignore"
  | "unsafe_unknown";

type OpenPrClassification =
  | "onboarding_telemetry_external_review_required"
  | "doctrine_governance_external_review_required"
  | "architecture_refactor_external_review_required"
  | "dependency_update_external_review_required"
  | "security_patch_external_review_required"
  | "performance_patch_external_review_required"
  | "accessibility_patch_external_review_required"
  | "external_review_required";

type JsonRecord = Record<string, unknown>;

export type AccuracyImprovement = {
  area: FormulaKey;
  oldBehavior: string;
  newFormula: string;
  whyMoreAccurate: string;
  userVisibleImpact: string;
  adminVisibleImpact: string;
  scoreImpact: string[];
};

export type FinalMathNormalizationLockReport = {
  reportKey: "final-math-normalization-lock";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  legacyMutationPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  paymentRuntimeChanged: false;
  gumdropPricingMathChanged: false;
  scoreBefore: ScoreDimensions;
  scoreAfter: ScoreDimensions;
  scoreDimensions: readonly string[];
  formulasFinalized: Record<FormulaKey, "finalized" | "missing_owner" | "in_flight">;
  accuracyImprovements: AccuracyImprovement[];
  legacyRecoverySummary: {
    dryRunOnly: boolean;
    startDate: string;
    candidatesCanonicalized: number;
    archiveOnly: number;
    manualReview: number;
    exactPromotionsBlocked: boolean;
    duplicateRisk: Record<string, number>;
  };
  remainingUnknowns: string[];
  remainingFormalGates: string[];
  remainingCostReviews: string[];
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
  openPrs: Array<{ number: unknown; title: unknown; url: unknown; mergeStateStatus: unknown; isDraft: unknown; classification: OpenPrClassification }>;
  validationFailures: string[];
};

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function writeJson(path: string, value: unknown) {
  write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function scoreSnapshot(): ScoreDimensions {
  const score = readJson(SCORE_PATH);
  return {
    sourceHealth: typeof score.sourceHealthScore === "number" ? score.sourceHealthScore : 0,
    runtimeHealth: typeof score.runtimeHealthScore === "number" ? score.runtimeHealthScore : 0,
    evidenceCompleteness: typeof score.evidenceCompletenessScore === "number" ? score.evidenceCompletenessScore : 0,
    freshness: typeof score.freshnessScore === "number" ? score.freshnessScore : 0,
    costRisk: typeof score.costRiskScore === "number" ? score.costRiskScore : 0,
    regressionRisk: typeof score.regressionRiskScore === "number" ? score.regressionRiskScore : 0,
    overallHealthScore: typeof score.healthScore === "number" ? score.healthScore : 0,
  };
}

export function classifyFinalMathNormalizationDirtyFile(filePath: string): DirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === STATE_PATH || normalized === SCORE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/current-beta-exit-status.generated.json" || normalized === "agent/state/overnight-beta-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/current-beta-exit-status.md" || normalized === "docs/agent-truth/overnight-beta-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-final-math-normalization-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/final-math-normalization-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/^agent\/state\/(canonical-math-ledger|metric-canonicalization-legacy-recovery|global-user-counting-math|drop-watch-unlock-math|session-journey-duration-math|gumdrop-ledger-math|creator-revenue-entitlement-math|cost-export-sql-parity-math|metric-display-accuracy|person-metrics-hydration|global-user-dedupe-normalization|drop-watch-time-accuracy|session-bounce-calculation|user-journey-behavioral-intelligence|sql-database-parity-cost-lock)\.generated\.json$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^docs\/agent-truth\/(canonical-math-ledger|metric-canonicalization-legacy-recovery|global-user-counting-math|drop-watch-unlock-math|session-journey-duration-math|gumdrop-ledger-math|creator-revenue-entitlement-math|cost-export-sql-parity-math|metric-display-accuracy|person-metrics-hydration|global-user-dedupe-normalization|drop-watch-time-accuracy|session-bounce-calculation|user-journey-behavioral-intelligence|sql-database-parity-cost-lock)\.md$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^scripts\/agent\/validate-(canonical-math-ledger|metric-canonicalization-legacy-recovery|global-user-counting-math|drop-watch-unlock-math|session-journey-duration-math|gumdrop-ledger-math|creator-revenue-entitlement-math|cost-export-sql-parity-math|metric-display-accuracy|person-metrics-hydration|global-user-dedupe-normalization|drop-watch-time-accuracy|session-bounce-calculation|user-journey-behavioral-intelligence|sql-database-parity-cost-lock)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^tests\/unit\/(canonical-math-ledger|metric-canonicalization-legacy-recovery|global-user-counting-math|drop-watch-unlock-math|session-journey-duration-math|gumdrop-ledger-math|creator-revenue-entitlement-math|cost-export-sql-parity-math|metric-display-accuracy|person-metrics-hydration|global-user-dedupe-normalization|drop-watch-time-accuracy|session-bounce-calculation|user-journey-behavioral-intelligence|sql-database-parity-cost-lock)\.spec\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^src\/lib\/math\//u.test(normalized) || /^src\/lib\/analytics\//u.test(normalized) || /^src\/lib\/creator-monetization\//u.test(normalized) || /^src\/lib\/fan-pass\//u.test(normalized)) return "real_source_change_needs_review";
  if (/paypal|payment|payout|capture|provider|gumdrop.*pricing/iu.test(normalized)) return "unsafe_unknown";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  return "unsafe_unknown";
}

function classifyOpenPr(pr: JsonRecord): OpenPrClassification {
  const title = String(pr.title ?? "");
  if (/dependency|deps|npm|knip|syncpack|puppeteer/iu.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/iu.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/iu.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/iu.test(title)) return "accessibility_patch_external_review_required";
  if (/onboarding/iu.test(title)) return "onboarding_telemetry_external_review_required";
  if (/doctrine/iu.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries/iu.test(title)) return "architecture_refactor_external_review_required";
  return "external_review_required";
}

function listOpenPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as JsonRecord[];
  return parsed.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.url,
    mergeStateStatus: pr.mergeStateStatus,
    isDraft: pr.isDraft,
    classification: classifyOpenPr(pr),
  }));
}

function artifactStatus(path: string) {
  const report = readJson(path);
  return report.status === "pass" || report.reportKey ? "finalized" : "missing_owner";
}

function formulasFinalized(): Record<FormulaKey, "finalized" | "missing_owner" | "in_flight"> {
  return {
    betaScore: artifactStatus("agent/state/canonical-math-ledger.generated.json"),
    confidence: artifactStatus("agent/state/canonical-math-ledger.generated.json"),
    legacyRecovery: artifactStatus("agent/state/metric-canonicalization-legacy-recovery.generated.json"),
    globalUserCounting: artifactStatus("agent/state/global-user-counting-math.generated.json"),
    watchTime: artifactStatus("agent/state/drop-watch-unlock-math.generated.json"),
    sessionBounce: artifactStatus("agent/state/session-journey-duration-math.generated.json"),
    gumdropLedger: artifactStatus("agent/state/gumdrop-ledger-math.generated.json"),
    creatorRevenue: artifactStatus("agent/state/creator-revenue-entitlement-math.generated.json"),
    costExport: artifactStatus("agent/state/cost-export-sql-parity-math.generated.json"),
    metricDisplay: artifactStatus("agent/state/metric-display-accuracy.generated.json"),
  };
}

function legacyRecoverySummary(): FinalMathNormalizationLockReport["legacyRecoverySummary"] {
  const legacy = readJson("agent/state/metric-canonicalization-legacy-recovery.generated.json");
  const dryRun = legacy.dryRun as JsonRecord | undefined;
  const summary = dryRun?.summary as JsonRecord | undefined;
  const actionCounts = summary?.actionCounts as JsonRecord | undefined;
  const duplicateRiskCounts = summary?.duplicateRiskCounts as Record<string, number> | undefined;
  return {
    dryRunOnly: legacy.dryRunOnly === true && dryRun?.mutationsAllowed === false,
    startDate: String(legacy.recoveryStartDate ?? dryRun?.recoveryStartDate ?? "2026-03-01"),
    candidatesCanonicalized: typeof actionCounts?.normalize_candidate === "number" ? actionCounts.normalize_candidate : 0,
    archiveOnly: typeof actionCounts?.archive_only === "number" ? actionCounts.archive_only : 0,
    manualReview: typeof actionCounts?.needs_manual_review === "number" ? actionCounts.needs_manual_review : 0,
    exactPromotionsBlocked: Boolean(legacy.checks && typeof legacy.checks === "object" && (legacy.checks as JsonRecord).unknownLegacyCannotBecomeExact === true),
    duplicateRisk: duplicateRiskCounts ?? { low: 0, medium: 0, high: 0 },
  };
}

function accuracyImprovements(): AccuracyImprovement[] {
  return [
    {
      area: "betaScore",
      oldBehavior: "Score math could be read from scattered score artifacts without a final owner summary.",
      newFormula: "Weighted beta score uses source 25, runtime 20, evidence 20, freshness 15, cost 10, and regression 10.",
      whyMoreAccurate: "The final lock ties the score to explicit weights, dimensions, caps, and blocker classes instead of stale generated snapshots.",
      userVisibleImpact: "Beta status stays explainable and does not overstate readiness.",
      adminVisibleImpact: "Admin score review can trace each score dimension to a formula owner.",
      scoreImpact: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"],
    },
    {
      area: "confidence",
      oldBehavior: "Exact, linked, inferred, weak, and unknown confidence labels were easy to compare inconsistently.",
      newFormula: "Confidence weights are exact 1.0, linked 0.85, inferred 0.60, weak 0.35, and unknown 0.0.",
      whyMoreAccurate: "Every metric can now degrade precision using the same confidence scale before it reaches user, creator, or admin display.",
      userVisibleImpact: "Weak data is labeled estimated instead of exact.",
      adminVisibleImpact: "Debug can distinguish source confidence from display state.",
      scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    },
    {
      area: "legacyRecovery",
      oldBehavior: "Legacy aliases could be read as if they were current metrics unless every recovery path repeated the confidence cap.",
      newFormula: "Legacy recovery is dry-run only from 2026-03-01; unknown legacy stays archive-only and cannot become exact.",
      whyMoreAccurate: "Recovered history is mapped into candidates without mutating production or inflating exact user truth.",
      userVisibleImpact: "Old data does not silently inflate current user-facing metrics.",
      adminVisibleImpact: "Operators see canonicalization candidates, archive-only records, manual review, and duplicate risk separately.",
      scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    },
    {
      area: "globalUserCounting",
      oldBehavior: "Guest, signed-in, and linked-person actions risked divergent counting if dedupe rules were local.",
      newFormula: "Global metrics count each real action once per canonical dedupe key; linked person rollups suppress duplicate guest/signed-in actions.",
      whyMoreAccurate: "Counts now explain global, guest, signed-in, linked-person, creator-role, admin projection, and system-event behavior.",
      userVisibleImpact: "User activity totals are less likely to double count handoff events.",
      adminVisibleImpact: "Duplicate suppression is visible with scope and reason.",
      scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    },
    {
      area: "watchTime",
      oldBehavior: "Page duration and locked preview exposure could be confused with content watch time.",
      newFormula: "Watch time starts only on visible unlocked content or media playback, excludes hidden/idle/page preload, and caps static review exposure.",
      whyMoreAccurate: "Watch metrics now represent actual active content exposure rather than generic page-open time.",
      userVisibleImpact: "Drop completion and watch labels align better with consumed content.",
      adminVisibleImpact: "Debug separates exact runtime, estimated runtime, weak visibility, and unavailable watch sources.",
      scoreImpact: ["sourceHealth", "runtimeHealth", "evidenceCompleteness"],
    },
    {
      area: "sessionBounce",
      oldBehavior: "Unknown closeout and one-page sessions could be too easy to treat as bounce or active time.",
      newFormula: "Session active time excludes hidden/background/idle >30s; bounce requires one route, no meaningful interaction, activeMs <10000, and no conversion.",
      whyMoreAccurate: "Unknown closeout stays unknown and conversions prevent false bounce classification.",
      userVisibleImpact: "Engagement and activity labels avoid penalizing real conversions.",
      adminVisibleImpact: "Session debug shows active, idle, hidden, bounce, and handoff continuity buckets.",
      scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    },
    {
      area: "gumdropLedger",
      oldBehavior: "Paid, paid bonus, reward, task reward, admin grant, refund, adjustment, and legacy sources could drift in labels.",
      newFormula: "Ledger totals preserve source buckets and refund reversals without changing prices, packages, payment runtime, or GumDrop pricing math.",
      whyMoreAccurate: "Spend eligibility and wallet display can distinguish paid-source value from reward or legacy unknown value.",
      userVisibleImpact: "Wallet labels are source-aware without changing balances.",
      adminVisibleImpact: "Source-of-funds debug can catch paid-only violations and display mismatches.",
      scoreImpact: ["sourceHealth", "regressionRisk"],
    },
    {
      area: "creatorRevenue",
      oldBehavior: "Entitlement access and revenue truth could appear more exact than the source evidence allowed.",
      newFormula: "Entitlement is access truth; revenue confidence separates exact provider/payment artifacts, linked ledgers, inferred operator confirmation, weak legacy, and unknown.",
      whyMoreAccurate: "Creator metrics no longer mix confirmed, inferred, pending, reversed, and unknown legacy revenue.",
      userVisibleImpact: "Creator-facing revenue avoids exact-looking weak or refunded access states.",
      adminVisibleImpact: "Debug can find active entitlement, refund, cancellation, and paid-chat bypass mismatches.",
      scoreImpact: ["sourceHealth", "evidenceCompleteness"],
    },
    {
      area: "costExport",
      oldBehavior: "Cost readiness could remain generic owner review even when source guards existed.",
      newFormula: "Cost/export math separates source-guarded partial credit from external billing proof, batches export by watermark, and keeps SQL mirror manual.",
      whyMoreAccurate: "Cost risk improves only from source guards or real billing artifacts while preserving canonical metric facts.",
      userVisibleImpact: "Analytics accuracy is preserved while unnecessary reads, writes, and exports are bounded.",
      adminVisibleImpact: "Admin/debug reads compact summaries first and raw firehose only behind paged drilldown.",
      scoreImpact: ["costRisk", "freshness"],
    },
    {
      area: "metricDisplay",
      oldBehavior: "Missing or weak data could look like exact zero or exact revenue on user, creator, or admin surfaces.",
      newFormula: "Display shows zero only with provenZero, collecting for source-ready no-data, not connected for missing producers, estimated for weak/inferred confidence, and stale labels after one hour on admin/creator dashboards.",
      whyMoreAccurate: "The display layer now preserves source truth, freshness, confidence, and missing-data semantics instead of flattening everything into numbers.",
      userVisibleImpact: "Users and creators see collecting/estimated/not connected states instead of misleading zeros.",
      adminVisibleImpact: "Admin summaries can show technical confidence and freshness without leaking jargon to users.",
      scoreImpact: ["sourceHealth", "evidenceCompleteness", "freshness"],
    },
  ];
}

function normalizeScoreBefore(input?: number | ScoreDimensions): ScoreDimensions {
  if (typeof input === "number") {
    return {
      sourceHealth: input,
      runtimeHealth: input,
      evidenceCompleteness: input,
      freshness: input,
      costRisk: input,
      regressionRisk: input,
      overallHealthScore: input,
    };
  }
  return input ?? scoreSnapshot();
}

function sourceValidationFailures() {
  const failures: string[] = [];
  const packageJson = read("package.json");
  const requiredArtifacts = [
    "agent/state/canonical-math-ledger.generated.json",
    "agent/state/metric-canonicalization-legacy-recovery.generated.json",
    "agent/state/global-user-counting-math.generated.json",
    "agent/state/drop-watch-unlock-math.generated.json",
    "agent/state/session-journey-duration-math.generated.json",
    "agent/state/gumdrop-ledger-math.generated.json",
    "agent/state/creator-revenue-entitlement-math.generated.json",
    "agent/state/cost-export-sql-parity-math.generated.json",
    "agent/state/metric-display-accuracy.generated.json",
  ];
  for (const artifact of requiredArtifacts) {
    if (!existsSync(join(ROOT, artifact))) failures.push(`Expected math artifact missing: ${artifact}.`);
  }
  if (!packageJson.includes("\"check:final-math-normalization-lock\": \"tsx scripts/agent/validate-final-math-normalization-lock.ts\"")) {
    failures.push("package.json is missing check:final-math-normalization-lock.");
  }
  return failures;
}

function renderDoc(report: FinalMathNormalizationLockReport) {
  return [
    "# Final Math Normalization Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Score",
    "",
    `- Before: ${JSON.stringify(report.scoreBefore)}`,
    `- After: ${JSON.stringify(report.scoreAfter)}`,
    `- Dimensions: ${report.scoreDimensions.join(", ")}`,
    "",
    "## Formulas Finalized",
    "",
    ...Object.entries(report.formulasFinalized).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Accuracy Improvements",
    "",
    ...report.accuracyImprovements.map((entry) => `- ${entry.area}: ${entry.whyMoreAccurate}`),
    "",
    "## Legacy Recovery Summary",
    "",
    `- Dry run only: ${report.legacyRecoverySummary.dryRunOnly}`,
    `- Start date: ${report.legacyRecoverySummary.startDate}`,
    `- Candidates canonicalized: ${report.legacyRecoverySummary.candidatesCanonicalized}`,
    `- Archive only: ${report.legacyRecoverySummary.archiveOnly}`,
    `- Manual review: ${report.legacyRecoverySummary.manualReview}`,
    `- Exact promotions blocked: ${report.legacyRecoverySummary.exactPromotionsBlocked}`,
    `- Duplicate risk: ${JSON.stringify(report.legacyRecoverySummary.duplicateRisk)}`,
    "",
    "## Remaining Unknowns",
    "",
    ...report.remainingUnknowns.map((item) => `- ${item}`),
    "",
    "## Formal Gates",
    "",
    ...report.remainingFormalGates.map((item) => `- ${item}`),
    "",
    "## Cost Reviews",
    "",
    ...report.remainingCostReviews.map((item) => `- ${item}`),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((item) => `- ${item}`),
    "",
    "## Dirty Files",
    "",
    ...(report.dirtyFiles.length ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PRs",
    "",
    ...(report.openPrs.length ? report.openPrs.map((pr) => `- #${pr.number}: ${pr.classification}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

export function buildFinalMathNormalizationLockReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  openPrs?: FinalMathNormalizationLockReport["openPrs"];
  scoreBefore?: number | ScoreDimensions;
} = {}): FinalMathNormalizationLockReport {
  const scoreBefore = normalizeScoreBefore(input.scoreBefore);
  const report: FinalMathNormalizationLockReport = {
    reportKey: "final-math-normalization-lock",
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? run("git", ["rev-parse", "--short", "HEAD"]),
    status: "pass",
    productionReadsPerformed: false,
    legacyMutationPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    paymentRuntimeChanged: false,
    gumdropPricingMathChanged: false,
    scoreBefore,
    scoreAfter: scoreBefore,
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"],
    formulasFinalized: formulasFinalized(),
    accuracyImprovements: accuracyImprovements(),
    legacyRecoverySummary: legacyRecoverySummary(),
    remainingUnknowns: [
      "Unknown legacy data stays archive-only unless deterministic identity, event, route, and timestamp evidence exists.",
      "Runtime/provider/admin formal evidence remains outside source math normalization.",
      "Existing UI consumers should adopt metric display accuracy incrementally before visual redesign.",
    ],
    remainingFormalGates: [
      "Runtime/provider smoke remains formal evidence and is not cleared by source math locks.",
      "Admin production sample evidence remains a formal evidence lane.",
      "Visual/operator final review remains outside Codex source-only math proof.",
    ],
    remainingCostReviews: [
      "External billing review remains separate from source cost guards.",
      "Cloud Run/App Hosting, Cloud SQL/Data Connect, Gemini/Cloud Assist/Vertex, and route 4xx cost lanes retain external review requirements where no billing artifact exists.",
    ],
    nextExactSteps: [
      "Adopt metric display accuracy in remaining user, creator, and admin metric consumers before redesigning those surfaces.",
      "Use dry-run legacy canonicalization output for operator review; do not write recovered records without an explicit migration plan.",
      "Attach runtime/provider/admin formal evidence before clearing beta exit gates.",
      "Attach external billing proof before upgrading source-guarded cost lanes to full credit.",
    ],
    dirtyFiles: (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
      path,
      classification: classifyFinalMathNormalizationDirtyFile(path),
    })),
    openPrs: input.openPrs ?? listOpenPrs(),
    validationFailures: [],
  };
  report.validationFailures = validateFinalMathNormalizationLockReport(report);
  report.status = report.validationFailures.length ? "fail" : "pass";
  return report;
}

export function validateFinalMathNormalizationLockReport(report: FinalMathNormalizationLockReport) {
  const failures = [...sourceValidationFailures()];
  const formulaEntries = Object.entries(report.formulasFinalized) as Array<[FormulaKey, string]>;
  if (formulaEntries.length < 10) failures.push("Major formula owner list is incomplete.");
  for (const [formula, status] of formulaEntries) {
    if (status !== "finalized") failures.push(`${formula} lacks final owner.`);
    if (!report.accuracyImprovements.some((entry) => entry.area === formula && entry.whyMoreAccurate.trim().length > 20)) {
      failures.push(`${formula} lacks accuracy explanation.`);
    }
  }
  if (report.productionReadsPerformed) failures.push("Production reads were performed.");
  if (report.legacyMutationPerformed || !report.legacyRecoverySummary.dryRunOnly) failures.push("Legacy recovery can mutate production.");
  if (report.providerCallsPerformed) failures.push("Provider calls were performed.");
  if (report.deployPerformed) failures.push("Deploy was performed.");
  if (report.paymentRuntimeChanged) failures.push("Payment runtime changed.");
  if (report.gumdropPricingMathChanged) failures.push("GumDrop pricing math changed.");
  if (report.legacyRecoverySummary.startDate !== "2026-03-01") failures.push("Legacy recovery March 1 boundary missing.");
  if (!report.legacyRecoverySummary.exactPromotionsBlocked) failures.push("Unknown legacy can become exact.");
  if (!report.accuracyImprovements.find((entry) => entry.area === "watchTime")?.newFormula.includes("excludes hidden/idle/page preload")) failures.push("Watch/page-time rules regress.");
  if (!report.accuracyImprovements.find((entry) => entry.area === "sessionBounce")?.newFormula.includes("activeMs <10000")) failures.push("Session bounce rules regress.");
  if (!report.accuracyImprovements.find((entry) => entry.area === "gumdropLedger")?.newFormula.includes("preserve source buckets")) failures.push("GumDrop source-of-funds rules regress.");
  if (!report.accuracyImprovements.find((entry) => entry.area === "metricDisplay")?.newFormula.includes("zero only with provenZero")) failures.push("User-facing metric display can show fake zero.");
  for (const dimension of ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"]) {
    if (!report.scoreDimensions.includes(dimension)) failures.push(`Score dimension missing: ${dimension}.`);
  }
  if (!report.remainingUnknowns.length || !report.remainingFormalGates.length || !report.remainingCostReviews.length || !report.nextExactSteps.length) {
    failures.push("Remaining unknowns, formal gates, cost reviews, or next steps missing.");
  }
  for (const file of report.dirtyFiles) {
    if (file.classification === "unsafe_unknown") failures.push(`${file.path} is unclassified for final math normalization lock.`);
  }
  for (const pr of report.openPrs) {
    if (!pr.classification || pr.classification === "external_review_required") failures.push(`Open PR #${pr.number} is unclassified.`);
  }
  return [...new Set(failures)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const report = buildFinalMathNormalizationLockReport();
  writeJson(STATE_PATH, report);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length) {
    console.error("Final math normalization lock validation failed:");
    report.validationFailures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Final math normalization lock validation passed.");
}
