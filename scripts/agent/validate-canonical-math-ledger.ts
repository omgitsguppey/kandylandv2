import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import {
  BOUNCE_THRESHOLDS,
  COST_WEIGHTING_RULES,
  DEDUPE_WINDOWS,
  FORMULA_COMPARISON_ARTIFACTS,
  IDENTITY_CONFIDENCE_WEIGHTS,
  LEGACY_CONFIDENCE_MAXIMUMS,
  NON_EVENT_SCORE_RULES,
  PROVEN_ZERO_RULES,
  SCORE_DIMENSION_WEIGHTS,
  SESSION_THRESHOLDS,
  SOURCE_OF_FUNDS_RULES,
  WATCH_TIME_THRESHOLDS,
  calculateWeightedBetaHealthScore,
} from "@/lib/math/canonical-math-ledger";
import {
  FORMULA_AUTHORITY_MAP,
  REQUIRED_FORMULA_OWNER_IDS,
  getFormulaAuthority,
} from "@/lib/math/math-authority-map";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/canonical-math-ledger.generated.json";
const DOC_PATH = "docs/agent-truth/canonical-math-ledger.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type JsonRecord = Record<string, unknown>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, {
      cwd: ROOT,
      encoding: "utf8",
      shell: process.platform === "win32" && command === "git",
    }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/gumdrop-ledger-math.generated.json") return "companion_gumdrop_math_artifact_expected";
  if (normalized === "docs/agent-truth/gumdrop-ledger-math.md") return "companion_gumdrop_math_artifact_expected";
  if (normalized === "src/lib/math/canonical-math-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/math-authority-map.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-canonical-math-ledger.ts") return "failed_validator_to_repair";
  if (normalized === "scripts/agent/validate-gumdrop-ledger-math.ts") return "companion_gumdrop_math_validator_expected";
  if (normalized === "tests/unit/canonical-math-ledger.spec.ts") return "current_generated_artifact_to_commit";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === SCORE_PATH || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/paypal/iu.test(normalized)) return "protected_manual_review_paypal_callback_or_provider_payment";
  if (/gumdrops-packages|pricing/iu.test(normalized)) return "protected_manual_review_pricing_package_values";
  if (/gumdrop-ledger|source-of-funds/iu.test(normalized)) return "canonical_owner_gumdrop_source_of_funds_ledger";
  if (/gumdrop-economics|purchase.*deliver|purchase-deliver/iu.test(normalized)) return "canonical_owner_purchase_delivery_economy";
  if (/platform-economy|treasury/iu.test(normalized)) return "canonical_owner_platform_economy_treasury_reconciliation";
  if (/unlock|entitlement|locked-content|locked_content/iu.test(normalized)) return "canonical_owner_unlock_spend_and_entitlement";
  if (/reward|daily-task|task-reward|grant/iu.test(normalized)) return "canonical_owner_reward_grants";
  if (/creator.*accrual|creator.*revenue|creator-monetization|creator.*payout/iu.test(normalized)) return "canonical_owner_creator_accruals";
  if (/wallet|payment|api\/admin\/balance/iu.test(normalized)) return "protected_manual_review_wallet_payment_truth";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/math|metric|analytics|score/iu.test(normalized)) return "real_source_change_needs_review";
  return "unrelated_dirty_outside_canonical_math_ledger";
}

function classifyOpenPr(pr: JsonRecord) {
  const title = String(pr.title ?? "");
  const number = Number(pr.number ?? 0);
  if (/dependency|deps|npm|knip|syncpack|puppeteer/i.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/i.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/i.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/i.test(title)) return "accessibility_patch_external_review_required";
  if (/doctrine|banned-pattern|drift/i.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries|file risk/i.test(title)) return "architecture_refactor_external_review_required";
  if (/onboarding|friction|rescue signals/i.test(title)) return "onboarding_telemetry_external_review_required";
  return number > 0 ? "open_pr_external_review_required" : "not_applicable";
}

function listOpenPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") {
    return [];
  }
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
    "number,title,url,mergeStateStatus,isDraft",
  ]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JsonRecord[];
    return parsed.map((pr) => ({ ...pr, classification: classifyOpenPr(pr) }));
  } catch {
    return [{ number: 0, title: "gh pr list parse failed", classification: "external_pr_parse_failed_manual_review" }];
  }
}

function scoreSnapshot() {
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

function renderDoc(report: JsonRecord) {
  const failures = report.validationFailures as string[];
  const dirtyFiles = report.dirtyFiles as Array<{ path: string; classification: string }>;
  const dirtyFileCount = Number(report.dirtyFileCount ?? dirtyFiles.length);
  const dirtyFilesTruncated = Boolean(report.dirtyFilesTruncated);
  const dirtyClassificationCounts = report.dirtyClassificationCounts as Record<string, number> | undefined;
  const protectedManualReviewCount = Number(report.protectedManualReviewCount ?? 0);
  const prs = report.openPullRequests as Array<{ number: number; title: string; classification: string }>;
  const score = report.promptKnownScoreMath as JsonRecord;
  const hydration = report.personMetricsHydration as JsonRecord;

  return [
    "# Canonical Math Ledger",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Score Freeze",
    "",
    `- Weights: ${JSON.stringify(SCORE_DIMENSION_WEIGHTS)}`,
    `- Prompt known raw score: ${score.raw}`,
    `- Prompt known rounded score: ${score.rounded}`,
    "",
    "## Confidence Freeze",
    "",
    `- Identity confidence weights: ${JSON.stringify(IDENTITY_CONFIDENCE_WEIGHTS)}`,
    "- Legacy recovered data cannot exceed inferred without deterministic userId, sessionId, eventId, and source timestamp.",
    "- Unknown legacy remains archive-only/unknown unless deterministic evidence exists.",
    "",
    "## Proven Zero And Non-Events",
    "",
    "- Proven zero requires a bounded source window and successful source query or summary.",
    "- Missing data is not zero.",
    "- Non-events and future-only events do not reduce score.",
    "- Visible high-traffic events with no liveness source classify as source_missing or suspicious_idle.",
    "",
    "## Person Metrics Gap Math",
    "",
    `- Missing hydration gaps: ${hydration.missingHydrationCount}`,
    `- Debug lane gaps: ${hydration.debugLaneGaps}`,
    `- Evidence score reason: ${hydration.evidenceCompletenessReason}`,
    "",
    "## Formula Owners",
    "",
    ...FORMULA_AUTHORITY_MAP.map((entry) => `- ${entry.formulaOwnerId}: ${entry.formulaStatus} (${entry.primaryOwner})`),
    "",
    "## Formula Comparison",
    "",
    ...FORMULA_COMPARISON_ARTIFACTS.map((entry) => `- ${entry.formulaOwnerId}: ${entry.delta} Accuracy: ${entry.accuracyBenefit}`),
    "",
    "## Dirty Files",
    "",
    `- Count: ${dirtyFileCount}`,
    `- Drilldown truncated: ${dirtyFilesTruncated}`,
    `- Protected manual review count: ${protectedManualReviewCount}`,
    ...(dirtyClassificationCounts ? Object.entries(dirtyClassificationCounts).sort(([left], [right]) => left.localeCompare(right)).map(([classification, count]) => `- ${classification}: ${count}`) : []),
    ...(dirtyFiles.length ? dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PR Classification",
    "",
    ...(prs.length ? prs.map((pr) => `- #${pr.number} ${pr.title}: ${pr.classification}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const validationFailures: string[] = [];
  const scoreBefore = scoreSnapshot();
  const personMetricsSource = read("src/lib/analytics/person-metrics-hydration.ts");

  const promptKnownScoreMath = calculateWeightedBetaHealthScore({
    sourceHealth: 91.7,
    runtimeHealth: 84.2,
    evidenceCompleteness: 69.6,
    freshness: 75.63,
    costRisk: 42,
    regressionRisk: 86,
  });

  const scoreWeightTotal = Object.values(SCORE_DIMENSION_WEIGHTS).reduce((total, weight) => total + weight, 0);
  if (scoreWeightTotal !== 100) validationFailures.push(`Score weights sum to ${scoreWeightTotal}, expected 100.`);
  if (promptKnownScoreMath.raw.toFixed(4) !== "78.2690") validationFailures.push("Prompt known weighted beta score formula does not equal 78.2690.");
  if (promptKnownScoreMath.rounded !== 78.27) validationFailures.push("Prompt known rounded beta score formula does not equal 78.27.");
  if (IDENTITY_CONFIDENCE_WEIGHTS.exact !== 1 || IDENTITY_CONFIDENCE_WEIGHTS.unknown !== 0) validationFailures.push("Confidence weights are missing exact/unknown anchors.");
  if (LEGACY_CONFIDENCE_MAXIMUMS.recoveredWithDeterministicIdentity.maximumConfidence !== "inferred") validationFailures.push("Legacy recovered confidence can exceed inferred.");
  if (PROVEN_ZERO_RULES.missingDataIsZero) validationFailures.push("Missing data is incorrectly treated as zero.");
  if (!PROVEN_ZERO_RULES.requiredEvidence.includes("boundedSourceWindow") || !PROVEN_ZERO_RULES.requiredEvidence.includes("successfulSourceQueryOrSummary")) {
    validationFailures.push("Proven-zero rules are missing bounded source query/summary evidence.");
  }
  if (NON_EVENT_SCORE_RULES.nonEventReducesScore || NON_EVENT_SCORE_RULES.futureOnlyEventCountsAsFailure) {
    validationFailures.push("Non-event or future-only event can affect score.");
  }
  if (!NON_EVENT_SCORE_RULES.highTrafficNoLivenessClassifications.includes("source_missing")) {
    validationFailures.push("High traffic without liveness lacks source_missing classification.");
  }
  if (!SESSION_THRESHOLDS.activeRequiresForegroundVisibility || WATCH_TIME_THRESHOLDS.pageOpenTimeCountsAsWatchTime) {
    validationFailures.push("Session/watch thresholds do not preserve foreground/watch-time rules.");
  }
  if (!BOUNCE_THRESHOLDS.zeroDenominatorRule.includes("unavailable")) validationFailures.push("Bounce zero denominator rule is missing unavailable behavior.");
  if (DEDUPE_WINDOWS.eventIdPriority !== "canonical_event_id") validationFailures.push("Dedupe eventId priority is not canonical.");
  if (!COST_WEIGHTING_RULES.externalBillingProofRequiredForDollarClaims) validationFailures.push("Cost rules allow dollar claims without external billing proof.");
  if (SOURCE_OF_FUNDS_RULES.rewardGumDropsEligibleForFanPassRenewal) validationFailures.push("Reward GumDrops are incorrectly eligible for Fan Pass renewal.");

  for (const ownerId of REQUIRED_FORMULA_OWNER_IDS) {
    const authority = getFormulaAuthority(ownerId);
    if (!authority) validationFailures.push(`${ownerId} formula owner missing from authority map.`);
    if (authority && (!authority.canonicalFormula || !authority.sourceFiles.length || !authority.confidenceRule || !authority.zeroOrMissingRule)) {
      validationFailures.push(`${ownerId} formula authority is missing formula/source/confidence/zero behavior.`);
    }
  }
  if (FORMULA_AUTHORITY_MAP.length !== REQUIRED_FORMULA_OWNER_IDS.length) validationFailures.push("Formula authority map length does not match required owner list.");
  for (const comparison of FORMULA_COMPARISON_ARTIFACTS) {
    if (!comparison.accuracyBenefit || !comparison.userVisibleProductImpact || !comparison.migrationRisk || comparison.filesChanged.length === 0) {
      validationFailures.push(`${comparison.formulaOwnerId} formula comparison lacks accuracy/product/risk/file explanation.`);
    }
  }
  if (/gaps:\s*0/u.test(personMetricsSource)) validationFailures.push("person-metrics-hydration still hardcodes debugLane.gaps to zero.");
  if (/scoreImpact\(lowConfidenceMetrics\.length,\s*0\)/u.test(personMetricsSource)) validationFailures.push("person-metrics-hydration still passes fake zero gap count to scoreImpact.");

  const hydrationReport = hydratePersonMetrics({
    generatedAtUtc: generatedAtUtc,
    envelopes: [],
    legacyCandidates: [],
    provenZeroMetricIds: [],
  });
  if (hydrationReport.missingHydration.length === 0) validationFailures.push("Person metrics hydration empty source did not expose missing hydration gaps.");
  const personMetricGapCount = new Set([
    ...hydrationReport.missingHydration.map((gap) => gap.metricId),
    ...hydrationReport.userParityGaps.map((gap) => gap.metricId),
  ]).size;
  if (hydrationReport.debugLane.gaps !== personMetricGapCount) validationFailures.push("Person metrics debugLane.gaps does not equal the unique missingHydration and userParityGaps metric IDs.");
  if (!hydrationReport.scoreImpactByDimension.evidenceCompleteness.reason.includes(String(personMetricGapCount))) {
    validationFailures.push("Person metrics score impact reason does not include the real gap count.");
  }

  const allDirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const dirtyFiles = allDirtyFiles.slice(0, 80);
  const openPullRequests = listOpenPrs() as Array<{ number?: number; classification: string }>;
  const unclassifiedDirty = allDirtyFiles.filter((file) => file.classification === "unclassified_requires_owner");
  const unclassifiedPrs = openPullRequests.filter((pr) => pr.classification === "unclassified_requires_owner");
  const unsafeUnknownDirty = allDirtyFiles.filter((file) => file.classification === "unsafe_unknown");
  const unsafeUnknownPrs = openPullRequests.filter((pr) => pr.classification === "unsafe_unknown");
  if (unclassifiedDirty.length) validationFailures.push(`Dirty files unclassified: ${unclassifiedDirty.map((file) => file.path).join(", ")}`);
  if (unclassifiedPrs.length) validationFailures.push(`Open PRs unclassified: ${unclassifiedPrs.map((pr) => String(pr.number)).join(", ")}`);
  if (unsafeUnknownDirty.length) validationFailures.push(`Dirty files still unsafe_unknown: ${unsafeUnknownDirty.map((file) => file.path).join(", ")}`);
  if (unsafeUnknownPrs.length) validationFailures.push(`Open PRs still unsafe_unknown: ${unsafeUnknownPrs.map((pr) => String(pr.number)).join(", ")}`);
  const dirtyClassificationCounts = allDirtyFiles.reduce<Record<string, number>>((counts, file) => {
    counts[file.classification] = (counts[file.classification] ?? 0) + 1;
    return counts;
  }, {});
  const protectedManualReviewCount = allDirtyFiles.filter((file) => file.classification.startsWith("protected_manual_review_")).length;

  const report = {
    reportKey: "canonical-math-ledger",
    generatedAtUtc,
    currentHead,
    status: validationFailures.length ? "fail" : "pass",
    scoreBefore,
    scoreAfter: scoreSnapshot(),
    scoreDimensions: SCORE_DIMENSION_WEIGHTS,
    promptKnownScoreMath,
    confidenceWeights: IDENTITY_CONFIDENCE_WEIGHTS,
    legacyConfidenceMaximums: LEGACY_CONFIDENCE_MAXIMUMS,
    sessionThresholds: SESSION_THRESHOLDS,
    watchTimeThresholds: WATCH_TIME_THRESHOLDS,
    bounceThresholds: BOUNCE_THRESHOLDS,
    dedupeWindows: DEDUPE_WINDOWS,
    costWeightingRules: COST_WEIGHTING_RULES,
    sourceOfFundsRules: SOURCE_OF_FUNDS_RULES,
    provenZeroRules: PROVEN_ZERO_RULES,
    nonEventScoreRules: NON_EVENT_SCORE_RULES,
    formulaAuthorityMap: FORMULA_AUTHORITY_MAP,
    formulaComparisonArtifacts: FORMULA_COMPARISON_ARTIFACTS,
    personMetricsHydration: {
      missingHydrationCount: hydrationReport.missingHydration.length,
      debugLaneGaps: hydrationReport.debugLane.gaps,
      evidenceCompletenessReason: hydrationReport.scoreImpactByDimension.evidenceCompleteness.reason,
    },
    dirtyFiles,
    dirtyFileCount: allDirtyFiles.length,
    dirtyFilesTruncated: allDirtyFiles.length > dirtyFiles.length,
    dirtyClassificationCounts,
    protectedManualReviewCount,
    openPrEvidenceStatus: process.env.ALLOW_GH_PR_LIST === "1" ? "live_external_command_opted_in" : "not_queried_external_command_opt_in_required",
    openPullRequests,
    validationFailures,
    releaseNoteImpact: [
      "Created canonical math ledger for score, confidence, session, watch, dedupe, and legacy recovery formulas.",
      "Fixed person-metric hydration gap math to report real gaps.",
      "Documented how formula refinements improve tracking accuracy.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length) {
    console.error(`[canonical-math-ledger] failed: ${validationFailures.join("; ")}`);
    process.exit(1);
  }
  console.log(`[canonical-math-ledger] pass: ${FORMULA_AUTHORITY_MAP.length} formula owners, ${hydrationReport.missingHydration.length} hydration gaps reported.`);
}

main();
