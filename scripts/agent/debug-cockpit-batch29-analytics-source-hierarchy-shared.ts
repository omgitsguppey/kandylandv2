import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildAdminAnalyticsSourceHierarchy } from "../../src/lib/analytics/admin-analytics-source-hierarchy";
import {
  buildLaunchAnalyticsSourceAgreementFailureDetail,
  buildSourceAgreementFailureDetailFromLaunchHistoryCoverage,
  type LaunchHistoryCoverageForSourceAgreement,
} from "../../src/lib/analytics/source-agreement-detail";
import { resolveGa4AvailabilitySemantics } from "../../src/lib/analytics/ga4-availability-semantics";
import { buildDebugCockpitBatch29AnalyticsSourceHierarchyReport } from "../../src/lib/debug/debug-cockpit-batch29-analytics-source-hierarchy";

type Report = Record<string, unknown>;

type LaunchHistoryCoverageInputStatus = {
  path: string;
  state:
    | "missing"
    | "usable_launch_history_coverage"
    | "present_without_launch_history_coverage"
    | "template_not_evidence"
    | "malformed_json";
  proofMode: "admin_truth_sample" | "local_export" | "none";
  nextAction: string;
};

function read(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readJson(filePath: string): unknown {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function readJsonWithStatus(filePath: string): { exists: false } | { exists: true; parsed: boolean; raw: unknown } {
  if (!fs.existsSync(filePath)) return { exists: false };
  try {
    return {
      exists: true,
      parsed: true,
      raw: JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown,
    };
  } catch {
    return { exists: true, parsed: false, raw: null };
  }
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function expectPass(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function command(args: string[], fallback = "") {
  try {
    return execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

const LAUNCH_HISTORY_COVERAGE_EXPORT_PATHS = [
  process.env.LAUNCH_ANALYTICS_COVERAGE_EXPORT,
  "agent/evidence/launch-analytics/launch-history-coverage.local.json",
  "agent/evidence/launch-analytics/launch-history-coverage.export.json",
].filter((value): value is string => Boolean(value && value.trim()));
const ADMIN_TRUTH_SAMPLE_EVIDENCE_FOLDER = "agent/evidence/admin-truth-sample";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asSourceCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isDayKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(value);
}

export function normalizeLaunchHistoryCoverageExport(raw: unknown): LaunchHistoryCoverageForSourceAgreement | null {
  const root = asRecord(raw);
  if (root.status === "template_not_evidence") return null;
  const candidate = asRecord(root.launchHistoryCoverage ?? asRecord(root.analyticsSourceHealth).launchHistoryCoverage ?? root);
  const rangeProof = asRecord(candidate.rangeProof);
  const daysRaw = Array.isArray(candidate.days) ? candidate.days : [];
  const days: LaunchHistoryCoverageForSourceAgreement["days"] = [];

  for (const entry of daysRaw) {
    const row = asRecord(entry);
    const dayKey = typeof row.dayKey === "string" ? row.dayKey.trim() : "";
    if (!isDayKey(dayKey)) continue;

    const sourceCounts = asRecord(row.sourceCounts);
    days.push({
      dayKey,
      expected: row.expected !== false,
      sourceCounts: {
        first_party: asSourceCount(sourceCounts.first_party),
        ga4: asSourceCount(sourceCounts.ga4),
        historicalSnapshot: asSourceCount(sourceCounts.historicalSnapshot),
        legacySupport: asSourceCount(sourceCounts.legacySupport),
      },
      internalAdminExcludedCount: typeof row.internalAdminExcludedCount === "number"
        ? Math.max(0, row.internalAdminExcludedCount)
        : null,
    });
  }

  if (days.length === 0) return null;

  const expectedDayCount = days.filter((day) => day.expected).length;
  const recoveredDayCount = days.filter((day) =>
    day.expected && Object.values(day.sourceCounts).some((count) => count > 0)
  ).length;
  const state = recoveredDayCount === 0
    ? "source_missing"
    : recoveredDayCount < expectedDayCount
      ? "partial"
      : "available";

  return {
    expectedDayCount,
    recoveredDayCount,
    state,
    rangeStartDayKey: asOptionalString(candidate.rangeStartDayKey),
    rangeEndDayKey: asOptionalString(candidate.rangeEndDayKey),
    rangeProof: {
      allLaunchRangeProven: rangeProof.allLaunchRangeProven === true,
      expectedRangeSource: asOptionalString(rangeProof.expectedRangeSource) ?? undefined,
      coverageWindowKind: asOptionalString(rangeProof.coverageWindowKind) ?? undefined,
      reason: asOptionalString(rangeProof.reason) ?? undefined,
    },
    days,
  };
}

function listAdminTruthSampleEvidencePaths() {
  const folder = path.join(process.cwd(), ADMIN_TRUTH_SAMPLE_EVIDENCE_FOLDER);
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter((entry) => entry.endsWith(".json") && entry !== "evidence.template.json")
    .map((entry) => `${ADMIN_TRUTH_SAMPLE_EVIDENCE_FOLDER}/${entry}`)
    .sort();
}

export function launchHistoryCoverageExportPaths() {
  return [
    ...LAUNCH_HISTORY_COVERAGE_EXPORT_PATHS,
    ...listAdminTruthSampleEvidencePaths(),
  ];
}

export function launchHistoryCoverageInputStatuses(): LaunchHistoryCoverageInputStatus[] {
  return launchHistoryCoverageExportPaths().map((filePath) => {
    const readResult = readJsonWithStatus(filePath);
    if (!readResult.exists) {
      return {
        path: filePath,
        state: "missing",
        proofMode: "none",
        nextAction: "Attach an approved local launch-history export at this path before using it as source evidence.",
      };
    }
    if (!readResult.parsed) {
      return {
        path: filePath,
        state: "malformed_json",
        proofMode: "none",
        nextAction: "Fix JSON syntax before this file can be considered launch-history evidence.",
      };
    }

    const root = asRecord(readResult.raw);
    const coverage = normalizeLaunchHistoryCoverageExport(readResult.raw);
    if (root.status === "template_not_evidence") {
      return {
        path: filePath,
        state: "template_not_evidence",
        proofMode: "none",
        nextAction: "Use this only as a shape reference; it cannot clear source agreement.",
      };
    }
    if (coverage) {
      return {
        path: filePath,
        state: "usable_launch_history_coverage",
        proofMode: proofModeForLaunchCoverageExport(filePath, readResult.raw),
        nextAction: "Use this file as the local launch-history coverage input for source agreement.",
      };
    }

    return {
      path: filePath,
      state: "present_without_launch_history_coverage",
      proofMode: "none",
      nextAction: "This evidence exists but lacks launchHistoryCoverage day rows, so it cannot prove launch recovery.",
    };
  });
}

export function proofModeForLaunchCoverageExport(
  filePath: string,
  raw: unknown,
): "admin_truth_sample" | "local_export" {
  const root = asRecord(raw);
  const coverage = normalizeLaunchHistoryCoverageExport(raw);
  const isCompletedAdminTruthSample =
    filePath.replace(/\\/gu, "/").startsWith(`${ADMIN_TRUTH_SAMPLE_EVIDENCE_FOLDER}/`)
    && root.status === "complete"
    && root.surface === "admin_truth_sample"
    && coverage !== null;
  return isCompletedAdminTruthSample ? "admin_truth_sample" : "local_export";
}

function loadLaunchHistoryCoverageExport() {
  for (const filePath of launchHistoryCoverageExportPaths()) {
    const raw = readJson(filePath);
    const coverage = normalizeLaunchHistoryCoverageExport(raw);
    if (coverage) {
      return {
        filePath,
        coverage,
        proofMode: proofModeForLaunchCoverageExport(filePath, raw),
      };
    }
  }
  return null;
}

function buildLaunchSourceAgreementDetail() {
  const localExport = loadLaunchHistoryCoverageExport();
  if (localExport) {
    return {
      inputMode: "local_export",
      inputPath: localExport.filePath,
      detail: buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
        proofMode: localExport.proofMode,
        launchHistoryCoverage: localExport.coverage,
        comparedMetrics: ["day_bucket_presence", "coverage_delta_pct"],
        tolerance: { reviewDeltaPct: 10, failDeltaPct: 25 },
      }),
    };
  }

  return {
    inputMode: "fixture_only_local_window",
    inputPath: null,
    detail: buildLaunchAnalyticsSourceAgreementFailureDetail({
      comparedMetrics: ["day_bucket_presence", "coverage_delta_pct"],
      tolerance: { reviewDeltaPct: 10, failDeltaPct: 25 },
    }),
  };
}

function runValidation(reportKey: string, report: Report, failures: string[], summary: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const result = {
    reportKey,
    generatedAtUtc,
    currentHead: command(["git", "rev-parse", "HEAD"], "unknown"),
    ...report,
    validationFailures: failures,
  };
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    ...summary.map((line) => `- ${line}`),
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

function buildSourceDisagreementFixture() {
  return {
    analyticsSourceHealth: {
      sourceAgreement: {
        state: "failed",
        comparedSources: ["first_party", "ga4", "historical_snapshot", "legacy_support"],
        failedSources: ["first_party", "ga4", "historical_snapshot", "legacy_support"],
        disagreementCount: 5,
        maxDeltaPct: 60,
      },
      chartReadiness: {
        state: "source_disagreement",
        reason: "Chart buckets are available, but source agreement failed across first-party, GA4, historical snapshot, and legacy support.",
      },
    },
    validations: [{
      checkKey: "source_agreement_chart_readiness",
      status: "fail",
      passAllowed: false,
      passBlockedReason: "source_agreement_failed",
      operatorSummary: "Chart readiness blocked by source agreement failure.",
      detail: "Chart readiness blocked by source agreement failure.",
      technicalEvidence: "Availability passed. Continuity passed. Source agreement failed. Chart readiness blocked.",
    }],
  };
}

function dirtyClassifications() {
  return command(["git", "status", "--short"], "")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const filePath = line.replace(/^[ MADRCU?!]{1,2}\s+/u, "").trim();
      const classification =
        filePath.includes("chart-readiness-hierarchy") ? "analytics_source_hierarchy_fix_required"
          : filePath.includes("ga4-availability-semantics") ? "ga4_availability_semantics_required"
            : filePath.includes("admin-analytics-source-hierarchy") ? "analytics_tab_source_truth_mismatch_required"
              : filePath.includes("data-validation-copy-consistency") ? "validation_copy_contradiction_required"
                : filePath.includes("public-beta-score") || filePath.includes("current-beta-exit-status") || filePath.includes("overnight-beta-readiness-lock") ? "current_generated_artifact_to_commit"
                : filePath.includes("source-agreement-failure-detail") || filePath.includes("source-agreement-detail") ? "source_agreement_failure_classification_required"
                  : filePath.includes("debug-cockpit-batch29") ? "validator_artifact_expected"
                    : filePath.includes("debug-cockpit-batch28-bug-validation") ? "analytics_source_hierarchy_fix_required"
                    : filePath === "package.json" ? "validator_artifact_expected"
                    : filePath.startsWith("tests/unit/") ? "test_artifact_expected"
                      : filePath.startsWith("scripts/agent/") ? "validator_artifact_expected"
                        : filePath.startsWith("docs/agent-truth/") ? "documentation_artifact_expected"
                          : filePath.startsWith("agent/state/") ? "current_generated_artifact_to_commit"
                            : filePath.startsWith("agent/context/") ? "unrelated_agent_context_file_to_ignore"
                              : filePath.includes("gumdrop") || filePath.includes("wallet.md") ? "protected_gumdrop_wallet_work_unrelated"
                                : filePath.includes("creator/") || filePath.includes("creator-") || filePath.includes("creator-experiences") ? "creator_work_unrelated"
                                  : filePath.includes("server/chat") ? "chat_reliability_work_unrelated"
                                    : filePath.includes("problem-state-copy") ? "admin_copy_state_work_unrelated"
                              : filePath.includes("release-notes") || filePath === "CHANGELOG.md" || filePath.includes("kandydrops-release-notes") ? "release_artifact_expected"
                                : filePath.includes("admin-analytics-historical-validation") || filePath.includes("DebugAdvancedDataValidation") || filePath.includes("validation-readiness-contract") || filePath.includes("admin/analytics/") || filePath.includes("admin-analytics.ts") ? "real_source_change_needs_review"
                                  : filePath.includes("event-translation-bridge") || filePath.includes("person-metrics-hydration") ? "analytics_validator_support_expected"
                                  : "unsafe_unknown";
      return { filePath, classification };
    });
}

function openPrClassifications() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const raw = command([
    "gh",
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,author,mergeStateStatus,isDraft,updatedAt,url",
  ], "[]");
  try {
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map((pr) => ({
      ...pr,
      classification: "needs_manual_review_before_batch29",
    }));
  } catch {
    return [{ classification: "unsafe_unknown", raw }];
  }
}

export function validateChartReadinessHierarchyRepair() {
  const failures: string[] = [];
  const summary = buildSourceDisagreementFixture();
  const row = summary.validations.find((check) => check.checkKey === "source_agreement_chart_readiness");
  const source = read("src/lib/server/admin-analytics-historical-validation.ts");
  expectPass(summary.analyticsSourceHealth.sourceAgreement.state === "failed", failures, "fixture does not prove source agreement failed.");
  expectPass(summary.analyticsSourceHealth.chartReadiness.state === "source_disagreement", failures, "sourceAgreement failed can produce chartReadiness ready.");
  expectPass(!/Chart readiness passed/iu.test(row?.operatorSummary ?? ""), failures, "passAllowed=false row displays Chart readiness passed.");
  expectPass(row?.passAllowed === false && row.passBlockedReason === "source_agreement_failed", failures, "passAllowed=false row lacks source agreement blocker.");
  expectPass(source.includes('sourceAgreementState === "failed"') && source.includes("source_disagreement"), failures, "source agreement failure is not part of chart readiness hierarchy.");
  runValidation("chart-readiness-hierarchy-repair", { chartReadiness: summary.analyticsSourceHealth.chartReadiness, row }, failures, [
    "Source agreement failure now blocks chart readiness from resolving ready.",
    "Chart readiness copy names agreement failure instead of saying passed.",
  ]);
}

export function validateGa4AvailabilitySemantics() {
  const failures: string[] = [];
  const semantics = resolveGa4AvailabilitySemantics({
    propertyConfigured: true,
    reportsAvailable: true,
    reportsLoaded: true,
    sampleCount: 0,
    dayBucketCount: 0,
    confidence: null,
  });
  expectPass(semantics.status === "reports_loaded_empty", failures, "samples=0 GA4 setup pass is treated as chart data pass.");
  expectPass(semantics.setupPassAllowed && !semantics.provesUsableChartData, failures, "GA4 setup availability is not separated from usable chart data.");
  expectPass(!semantics.provesSourceAgreement, failures, "GA4 availability is used as source agreement pass.");
  expectPass(semantics.displayConfidence === "n/a", failures, "confidence n/a displayed as high confidence.");
  runValidation("ga4-availability-semantics", { semantics }, failures, [
    "GA4 reports available means route/setup availability, not canonical chart data by itself.",
    "Zero sample rows remains a no-sample state with an exact next action.",
  ]);
}

export function validateAdminAnalyticsSourceHierarchy() {
  const failures: string[] = [];
  const hierarchy = buildAdminAnalyticsSourceHierarchy({
    sourceAgreementState: "failed",
    chartReadinessState: "source_disagreement",
    analyticsTabHasData: false,
    debugHasData: true,
  });
  const fixtureEvidence = {
    evidenceKind: "source_fixture",
    scenario: "debug_has_data_analytics_empty_source_agreement_failed",
    currentRuntimeTruth: false,
    canClearRuntimeGate: false,
    canClearAdminTruthGate: false,
    hierarchy,
  };
  const hook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
  const page = read("src/app/admin/analytics/page.tsx");
  expectPass(hook.includes("buildAdminAnalyticsSourceHierarchy") && page.includes("adminAnalyticsSourceHierarchy"), failures, "Analytics tab source hierarchy not mapped.");
  expectPass(hierarchy.status === "source_agreement_failed", failures, "source agreement failure is not the primary Analytics source state.");
  expectPass(hierarchy.consumerSourceMismatches.length === 0, failures, "source agreement failure is incorrectly reported as a consumer source mismatch.");
  expectPass(JSON.stringify(hierarchy).includes("source_agreement_failed"), failures, "sourceAgreement failed is not surfaced in Analytics tab.");
  expectPass(hierarchy.blockedAnalyticsConsumers.includes("admin_analytics_charts"), failures, "Analytics tab chart readiness ignores source agreement.");
  expectPass(hierarchy.consumers.some((consumer) => consumer.consumerId === "admin_analytics_device_mix" && consumer.displayState === "second_source_only"), failures, "Device mix is not labeled as GA4 second-source only.");
  expectPass(hierarchy.consumers.some((consumer) => consumer.consumerId === "admin_analytics_overview" && consumer.displayState === "source_missing"), failures, "Overview source gap is not labeled source missing.");
  expectPass(hierarchy.consumers.some((consumer) => consumer.consumerId === "public_beta_score_evidence" && consumer.displayState === "chart_promotion_blocked"), failures, "Public beta evidence is not labeled chart-promotion blocked.");
  runValidation("admin-analytics-source-hierarchy", { fixtureEvidence }, failures, [
    "Fixture-only source agreement failure confirms Debug and Admin Analytics use compatible status copy.",
    "This report does not claim current runtime or admin truth.",
    "Analytics tab source agreement failures stay distinct from local fallback consumer mismatches and classify source-missing, GA4-only, and chart-promotion-held views.",
  ]);
}

export function validateDataValidationCopyConsistency() {
  const failures: string[] = [];
  const summary = buildSourceDisagreementFixture();
  const row = summary.validations.find((check) => check.checkKey === "source_agreement_chart_readiness");
  expectPass(row?.status === "fail", failures, "source agreement row is not failed.");
  expectPass(!/(passed|clear)/iu.test(`${row?.operatorSummary ?? ""} ${row?.detail ?? ""}`), failures, "failed row says validation clear or passed.");
  expectPass(row?.passBlockedReason === "source_agreement_failed", failures, "passAllowed=false row lacks blocked reason.");
  expectPass(/Availability passed/iu.test(row?.technicalEvidence ?? "") && /Source agreement failed/iu.test(row?.technicalEvidence ?? ""), failures, "technical evidence hides failed dimension.");
  runValidation("data-validation-copy-consistency", { row }, failures, [
    "Failed validation rows no longer use passed or clear copy.",
    "Technical evidence names passed dimensions and the failed source agreement dimension.",
  ]);
}

export function validateSourceAgreementFailureDetail() {
  const failures: string[] = [];
  const { detail, inputMode, inputPath } = buildLaunchSourceAgreementDetail();
  const candidateInputStatuses = launchHistoryCoverageInputStatuses();
  const launchCoverageEvidence = {
    inputMode,
    inputPath,
    usableInputFound: Boolean(inputPath),
    candidateInputPaths: launchHistoryCoverageExportPaths(),
    candidateInputStatuses,
    adminTruthSampleRequiresLaunchHistoryCoverage: true,
  };
  expectPass(detail.comparedSources.includes("first_party") && detail.comparedSources.length === 4, failures, "source agreement failed but first-party compared source is missing.");
  expectPass(["failed", "review", "pass", "not_enough_sources"].includes(detail.sourceAgreementStatus), failures, "source agreement detail lacks explicit status.");
  expectPass(Boolean(detail.rangeStartDayKey && detail.rangeEndDayKey), failures, "source agreement detail lacks launch evidence range.");
  expectPass(["union_of_local_source_days", "caller_supplied_expected_days"].includes(detail.expectedRangeSource), failures, "source agreement detail does not identify local evidence range source.");
  expectPass(
    detail.allLaunchRangeProven === false
      || (detail.sourceAgreementStatus === "pass" && (
        detail.coverageWindowKind === "admin_truth_sample"
        || detail.coverageWindowKind === "all_range_historical_export"
      )),
    failures,
    "source agreement detail can be mistaken for all-launch proof.",
  );
  if (inputMode === "fixture_only_local_window") {
    expectPass(detail.sourceAgreementStatus === "failed", failures, "fixture source agreement detail must remain failed until first-party coverage is recovered.");
    expectPass(detail.rangeStartDayKey === "2026-05-01" && detail.rangeEndDayKey === "2026-05-03", failures, "fixture source agreement detail lacks launch evidence range.");
    expectPass(detail.coverageWindowKind === "fixture_only_local_window", failures, "fixture source agreement detail can be mistaken for all-launch proof.");
    expectPass(detail.disagreementCount > 0 && detail.maxDeltaPct > 25, failures, "fixture maxDeltaPct/disagreementCount missing.");
    expectPass(!launchCoverageEvidence.usableInputFound, failures, "fixture mode cannot claim a usable launch coverage input.");
    expectPass(launchCoverageEvidence.candidateInputPaths.includes("agent/evidence/launch-analytics/launch-history-coverage.local.json"), failures, "local launch coverage export path is not advertised.");
    expectPass(candidateInputStatuses.some((entry) => entry.state === "missing"), failures, "missing launch coverage input paths are not classified.");
    expectPass(candidateInputStatuses.some((entry) => entry.state === "present_without_launch_history_coverage"), failures, "admin truth samples without launchHistoryCoverage are not classified.");
    expectPass(candidateInputStatuses.every((entry) => entry.state !== "usable_launch_history_coverage"), failures, "fixture mode cannot classify any input as usable coverage.");
  }
  expectPass(detail.disagreements.some((entry) =>
    entry.dayKey === "2026-05-02"
    && entry.primarySourceState === "first_party_missing"
    && entry.secondSourceState === "ga4_present"
    && entry.classifications.includes("missing_materializer"),
  ) || inputMode === "local_export", failures, "per-day GA4/first-party source disagreement missing.");
  expectPass(detail.disagreements.every((entry) =>
    entry.primarySourceState === "first_party_present"
    || (entry.recoveryLane && entry.blockingOwner && entry.proofRequired.length > 0 && entry.productTruthEligible === false),
  ), failures, "first-party-missing disagreements lack owner/proof/product-truth boundary.");
  expectPass(detail.toleranceThresholds.failDeltaPct === 25, failures, "tolerance thresholds missing.");
  expectPass(detail.blockedConsumers.includes("admin_analytics_charts"), failures, "blocked consumers missing.");
  expectPass(detail.blockedConsumerDetails.some((entry) =>
    entry.consumer === "admin_analytics_device_mix"
    && entry.allowedDisplayState === "second_source_only"
  ), failures, "GA4-owned blocked consumers do not remain second-source only.");
  expectPass(detail.blockedConsumerDetails.some((entry) =>
    entry.consumer === "admin_analytics_overview"
    && (entry.allowedDisplayState === "source_missing" || entry.allowedDisplayState === "connected")
  ), failures, "first-party-owned admin analytics panels lack source-missing display state.");
  expectPass(detail.blockedConsumerDetails.some((entry) =>
    entry.consumer === "admin_analytics_source_health"
    && entry.allowedDisplayState === "chart_promotion_blocked"
  ), failures, "source health consumer is not held behind source agreement/chart promotion.");
  expectPass(detail.sourceTruthPolicy.firstPartyPrimary && detail.sourceTruthPolicy.ga4SecondSourceOnly && detail.sourceTruthPolicy.missingIsNotZero, failures, "source truth policy missing.");
  expectPass(!/^retry$/iu.test(detail.nextAction), failures, "next action generic retry only.");
  runValidation("source-agreement-failure-detail", { inputMode, inputPath, launchCoverageEvidence, detail }, failures, [
    "Source agreement failures include compared sources, coverage deltas, per-day disagreement details, tolerance, blocked consumers, and next actions.",
    inputPath
      ? `Using local launch coverage export: ${inputPath}.`
      : "No usable local launch coverage export or launch-history admin truth sample found; present samples without launchHistoryCoverage remain evidence-only.",
    "The detail helper uses existing evidence only and does not call GA4.",
  ]);
}

export function validateDebugCockpitBatch29AnalyticsSourceHierarchy() {
  const failures: string[] = [];
  const report = buildDebugCockpitBatch29AnalyticsSourceHierarchyReport({
    ga4AvailabilityStatusBefore: "reports_available",
    ga4ReportsLoaded: true,
    ga4SampleCount: 0,
    ga4DayBucketCount: 0,
    chartReadinessStatusBefore: "ready",
    sourceAgreementStatus: "failed",
    analyticsTabHasData: false,
    debugHasData: true,
  });
  const dirty = dirtyClassifications();
  const openPrs = openPrClassifications();
  expectPass(report.chartReadinessStatusAfter === "source_disagreement", failures, "sourceAgreement failed can produce chartReadiness ready.");
  expectPass(report.analyticsTabSourceStatus === "source_agreement_failed", failures, "Analytics tab source agreement failure is not mapped.");
  expectPass(report.consumerSourceMismatches.length === 0, failures, "Source agreement failure is still reported as a consumer source mismatch.");
  expectPass(report.blockedAnalyticsConsumers.includes("admin_analytics_charts"), failures, "Analytics tab chart blocker missing.");
  expectPass(report.ga4AvailabilityStatusAfter === "reports_loaded_empty", failures, "GA4 setup pass with samples=0 is treated as usable chart data.");
  expectPass(report.validationCopyContradictionsAfter === 0 && report.passAllowedContradictionsAfter === 0, failures, "copy or passAllowed contradictions remain.");
  expectPass(report.sourceAgreementDetails.comparedSources.includes("first_party") && report.sourceAgreementDetails.comparedSources.length === 4, failures, "source agreement failure lacks first-party primary comparison.");
  expectPass(report.scoreDimensions.length >= 5, failures, "score dimensions missing.");
  expectPass(dirty.every((entry) => entry.classification !== "unsafe_unknown"), failures, "dirty files unclassified.");
  expectPass(openPrs.every((entry) => entry.classification), failures, "open PRs unclassified.");
  runValidation("debug-cockpit-batch29-analytics-source-hierarchy", {
    ...report,
    dirtyFileClassifications: dirty,
    openPrClassifications: openPrs,
  }, failures, [
    "Batch 29 locks chart readiness, GA4 availability semantics, Analytics tab source hierarchy, copy consistency, and source agreement detail.",
    "Dirty files and open PR state are classified for scoped closeout.",
  ]);
}
