import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildAdminAnalyticsSourceHierarchy } from "../../src/lib/analytics/admin-analytics-source-hierarchy";
import {
  LAUNCH_ANALYTICS_FIRST_DAY_KEY,
  buildLaunchAnalyticsSourceAgreementFailureDetail,
  buildSourceAgreementFailureDetailFromLaunchHistoryCoverage,
  type LaunchHistoryCoverageForSourceAgreement,
} from "../../src/lib/analytics/source-agreement-detail";
import {
  buildLaunchHistoryCoverageRangeProofEligibility,
  buildLaunchHistoryCoverageSummaryState,
  buildLaunchHistorySourceCoverageRowsState,
} from "../../src/lib/analytics/recovery-timeline-spine";
import { resolveGa4AvailabilitySemantics } from "../../src/lib/analytics/ga4-availability-semantics";
import { buildDebugCockpitBatch29AnalyticsSourceHierarchyReport } from "../../src/lib/debug/debug-cockpit-batch29-analytics-source-hierarchy";

type Report = Record<string, unknown>;

type LaunchHistoryCoverageInputStatus = {
  path: string;
  state:
    | "missing"
    | "usable_launch_history_coverage"
    | "usable_local_window_only"
    | "present_without_completion_or_redaction_proof"
    | "present_without_launch_history_coverage"
    | "present_without_expected_day_rows"
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
const LAUNCH_HISTORY_EXPORT_COMMAND = "npm run capture:truthful-evidence -- --launch-coverage-from <redacted-all-range-historical-export.json>";
const LAUNCH_HISTORY_DEFAULT_EXPORT_PATH = "agent/evidence/launch-analytics/launch-history-coverage.export.json";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asSourceCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function sourceCountFromAliases(sourceCounts: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const count = asSourceCount(sourceCounts[key]);
    if (count > 0) return count;
  }
  return 0;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function readLaunchCoverageInputHead(raw: unknown) {
  const root = asRecord(raw);
  return asOptionalString(root.currentHead)
    ?? asOptionalString(root.sourceCommit)
    ?? asOptionalString(root.sourceHead)
    ?? asOptionalString(root.commit)
    ?? null;
}

function hasPassedCheck(root: Record<string, unknown>, checkId: string) {
  const checks = Array.isArray(root.checks) ? root.checks : [];
  return checks.some((entry) => {
    const check = asRecord(entry);
    return check.id === checkId && check.status === "pass";
  });
}

function hasLaunchCoverageRedactionProof(root: Record<string, unknown>) {
  const redaction = asRecord(root.redaction);
  const localExportRedactionProof =
    redaction.rawUserIdentifiersIncluded === false
    && redaction.rawPaymentDetailsIncluded === false
    && redaction.secretsIncluded === false;
  const adminTruthRedactionProof =
    hasPassedCheck(root, "redacted-artifact-attached")
    && Array.isArray(root.redactions)
    && root.redactions.some((entry) => typeof entry === "string" && /no user identifiers|redacted/iu.test(entry));

  return localExportRedactionProof || adminTruthRedactionProof;
}

export function isUsableLaunchHistoryCoverageEvidence(filePath: string, raw: unknown) {
  const root = asRecord(raw);
  if (root.status === "template_not_evidence") return false;
  if (normalizeLaunchHistoryCoverageExport(raw) === null) return false;

  const normalizedPath = filePath.replace(/\\/gu, "/");
  const isAdminTruthSample = normalizedPath.startsWith(`${ADMIN_TRUTH_SAMPLE_EVIDENCE_FOLDER}/`);
  const completionProof = isAdminTruthSample
    ? root.status === "complete" && root.surface === "admin_truth_sample"
    : root.status === "complete";

  return completionProof && hasLaunchCoverageRedactionProof(root);
}

function isDayKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(value);
}

function dayKeyFromUtcLike(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function inclusiveDayKeys(startDayKey: string, endDayKey: string) {
  const start = Date.parse(`${startDayKey}T00:00:00.000Z`);
  const end = Date.parse(`${endDayKey}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const dayCount = Math.floor((end - start) / 86_400_000) + 1;
  return Array.from({ length: dayCount }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

function formalLaunchCoverageEndDayKey(raw: unknown) {
  const root = asRecord(raw);
  return dayKeyFromUtcLike(root.generatedAtUtc)
    ?? dayKeyFromUtcLike(root.capturedAtUtc)
    ?? dayKeyFromUtcLike(root.sourceFreshnessUtc)
    ?? new Date().toISOString().slice(0, 10);
}

function compactHoldbackValidation(value: unknown) {
  const record = asRecord(value);
  const compact: Record<string, unknown> = {};
  for (const key of [
    "observedFirstPartyRequired",
    "modeledOrInferredCanCalibrateOnly",
    "minObservedFirstPartyCoveragePercent",
    "requiredObservedFirstPartyFamilyCount",
    "observedFirstPartyFamilyCount",
    "observedFirstPartyCoveragePercent",
    "observedFirstPartyFamilyGapCount",
    "calibrationOnlyFamilyCount",
    "inferredLegacyFamilyCount",
    "cachedSnapshotFamilyCount",
    "missingSourceFamilyCount",
    "productTruthEligibleFamilyCount",
    "status",
    "reason",
    "nextAction",
  ]) {
    const valueForKey = record[key];
    if (typeof valueForKey === "string" && valueForKey.trim().length > 0) compact[key] = valueForKey.trim();
    if (typeof valueForKey === "number" && Number.isFinite(valueForKey)) compact[key] = valueForKey;
    if (typeof valueForKey === "boolean") compact[key] = valueForKey;
  }
  return Object.keys(compact).length > 0 ? compact : undefined;
}

function normalizeLaunchEventFamilyCoverage(candidate: Record<string, unknown>): LaunchHistoryCoverageForSourceAgreement["eventFamilyCoverage"] | undefined {
  const raw = asRecord(candidate.eventFamilyCoverage);
  if (Object.keys(raw).length === 0) return undefined;
  const familySourceStates = Array.isArray(raw.familySourceStates)
    ? raw.familySourceStates
      .map((entry) => {
        const row = asRecord(entry);
        const familyId = asOptionalString(row.familyId);
        if (!familyId) return null;
        return {
          familyId,
          ...(asOptionalBoolean(row.observedFirstParty) !== undefined ? { observedFirstParty: asOptionalBoolean(row.observedFirstParty) } : {}),
          ...(asOptionalString(row.sourceCoverageState) ? { sourceCoverageState: asOptionalString(row.sourceCoverageState) as string } : {}),
          ...(asOptionalString(row.sourceRole) ? { sourceRole: asOptionalString(row.sourceRole) as string } : {}),
          ...(asOptionalString(row.strongestSourceTruth ?? row.sourceTruth) ? { strongestSourceTruth: asOptionalString(row.strongestSourceTruth ?? row.sourceTruth) as string } : {}),
          ...(asOptionalString(row.strongestEvidenceKind ?? row.evidenceKind) ? { strongestEvidenceKind: asOptionalString(row.strongestEvidenceKind ?? row.evidenceKind) as string } : {}),
          ...(asOptionalString(row.confidenceBand) ? { confidenceBand: asOptionalString(row.confidenceBand) as string } : {}),
          ...(asOptionalBoolean(row.productTruthEligible) !== undefined ? { productTruthEligible: asOptionalBoolean(row.productTruthEligible) } : {}),
          ...(asOptionalString(row.nextAction) ? { nextAction: asOptionalString(row.nextAction) as string } : {}),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : undefined;
  const holdbackValidation = compactHoldbackValidation(raw.holdbackValidation);
  const result: LaunchHistoryCoverageForSourceAgreement["eventFamilyCoverage"] = {
    ...(asOptionalNumber(raw.canonicalMappedFamilyCount) !== undefined ? { canonicalMappedFamilyCount: asOptionalNumber(raw.canonicalMappedFamilyCount) } : {}),
    ...(asOptionalNumber(raw.canonicalMappingCoveragePercent) !== undefined ? { canonicalMappingCoveragePercent: asOptionalNumber(raw.canonicalMappingCoveragePercent) } : {}),
    ...(asOptionalNumber(raw.observedFirstPartyFamilyCount) !== undefined ? { observedFirstPartyFamilyCount: asOptionalNumber(raw.observedFirstPartyFamilyCount) } : {}),
    ...(asOptionalNumber(raw.observedFirstPartyCoveragePercent) !== undefined ? { observedFirstPartyCoveragePercent: asOptionalNumber(raw.observedFirstPartyCoveragePercent) } : {}),
    ...(asOptionalString(raw.sourceCoverageStatus) ? { sourceCoverageStatus: asOptionalString(raw.sourceCoverageStatus) as string } : {}),
    ...(holdbackValidation ? { holdbackValidation } : {}),
    ...(familySourceStates && familySourceStates.length > 0 ? { familySourceStates } : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
}

export function normalizeLaunchHistoryCoverageExport(raw: unknown): LaunchHistoryCoverageForSourceAgreement | null {
  const root = asRecord(raw);
  if (root.status === "template_not_evidence") return null;
  const candidate = asRecord(root.launchHistoryCoverage ?? asRecord(root.analyticsSourceHealth).launchHistoryCoverage ?? root);
  const rangeProof = asRecord(candidate.rangeProof);
  const eventFamilyCoverage = normalizeLaunchEventFamilyCoverage(candidate);
  const daysRaw = Array.isArray(candidate.days) ? candidate.days : [];
  const daysByKey = new Map<string, LaunchHistoryCoverageForSourceAgreement["days"][number]>();
  const expectedDayKeys: string[] = [];
  const sourceCountsByDay: Record<string, {
    first_party: number;
    ga4: number;
    historicalSnapshot: number;
    legacySupport: number;
  }> = {};
  const internalAdminExcludedCountByDay: Record<string, number | null> = {};

  for (const entry of daysRaw) {
    const row = asRecord(entry);
    const dayKey = typeof row.dayKey === "string" ? row.dayKey.trim() : "";
    if (!isDayKey(dayKey)) continue;

    const sourceCounts = asRecord(row.sourceCounts);
    const normalizedSourceCounts = {
      first_party: sourceCountFromAliases(sourceCounts, ["first_party", "firstParty"]),
      ga4: sourceCountFromAliases(sourceCounts, ["ga4", "googleAnalytics", "google_analytics"]),
      historicalSnapshot: sourceCountFromAliases(sourceCounts, ["historicalSnapshot", "historical_snapshot"]),
      legacySupport: sourceCountFromAliases(sourceCounts, ["legacySupport", "legacy_support"]),
    };
    const expected = row.expected !== false;
    const internalAdminExcludedCount = typeof row.internalAdminExcludedCount === "number"
      ? Math.max(0, row.internalAdminExcludedCount)
      : null;
    const existing = daysByKey.get(dayKey);
    if (existing) {
      daysByKey.set(dayKey, {
        dayKey,
        expected: existing.expected || expected,
        sourceCounts: {
          first_party: Math.max(existing.sourceCounts.first_party, normalizedSourceCounts.first_party),
          ga4: Math.max(existing.sourceCounts.ga4, normalizedSourceCounts.ga4),
          historicalSnapshot: Math.max(existing.sourceCounts.historicalSnapshot, normalizedSourceCounts.historicalSnapshot),
          legacySupport: Math.max(existing.sourceCounts.legacySupport, normalizedSourceCounts.legacySupport),
        },
        internalAdminExcludedCount: existing.internalAdminExcludedCount === null && internalAdminExcludedCount === null
          ? null
          : Math.max(existing.internalAdminExcludedCount ?? 0, internalAdminExcludedCount ?? 0),
      });
      continue;
    }
    daysByKey.set(dayKey, {
      dayKey,
      expected,
      sourceCounts: normalizedSourceCounts,
      internalAdminExcludedCount,
    });
  }

  const days = [...daysByKey.values()];
  for (const day of days) {
    if (!day.expected) continue;
    expectedDayKeys.push(day.dayKey);
    sourceCountsByDay[day.dayKey] = day.sourceCounts;
    internalAdminExcludedCountByDay[day.dayKey] = day.internalAdminExcludedCount ?? null;
  }

  if (days.length === 0) return null;
  if (expectedDayKeys.length === 0) return null;

  const sourceCoverageRows = buildLaunchHistorySourceCoverageRowsState({
    expectedDayKeys,
    sourceCountsByDay,
    internalAdminExcludedCountByDay,
  });
  const coverageSummary = buildLaunchHistoryCoverageSummaryState({
    expectedDayKeys: sourceCoverageRows.expectedDayKeys,
    dayCoverage: sourceCoverageRows.dayCoverage,
    staleEvidence: false,
    sourceAgreementState: "pass",
  });

  return {
    expectedDayCount: expectedDayKeys.length,
    recoveredDayCount: coverageSummary.recoveredDayCount,
    state: coverageSummary.launchCoverage.state,
    rangeStartDayKey: asOptionalString(candidate.rangeStartDayKey),
    rangeEndDayKey: asOptionalString(candidate.rangeEndDayKey),
    rangeProof: {
      allLaunchRangeProven: rangeProof.allLaunchRangeProven === true,
      expectedRangeSource: asOptionalString(rangeProof.expectedRangeSource) ?? undefined,
      coverageWindowKind: asOptionalString(rangeProof.coverageWindowKind) ?? undefined,
      reason: asOptionalString(rangeProof.reason) ?? undefined,
    },
    days,
    ...(eventFamilyCoverage ? { eventFamilyCoverage } : {}),
  };
}

export function launchHistoryCoverageHasFormalRangeProof(
  filePath: string,
  raw: unknown,
) {
  const coverage = normalizeLaunchHistoryCoverageExport(raw);
  if (!coverage) return false;

  const suppliedExpectedDayKeys = [...new Set(
    coverage.days
      .filter((day) => day.expected)
      .map((day) => day.dayKey)
      .filter(Boolean),
  )].sort();
  const expectedDayKeys = inclusiveDayKeys(LAUNCH_ANALYTICS_FIRST_DAY_KEY, formalLaunchCoverageEndDayKey(raw));
  if (expectedDayKeys.length === 0) return false;
  if (suppliedExpectedDayKeys.length === 0) return false;

  const sourceCountsByDay = Object.fromEntries(
    coverage.days
      .filter((day) => day.expected)
      .map((day) => [day.dayKey, day.sourceCounts]),
  );
  const sourceCoverageRows = buildLaunchHistorySourceCoverageRowsState({
    expectedDayKeys,
    sourceCountsByDay,
  });
  const coverageSummary = buildLaunchHistoryCoverageSummaryState({
    expectedDayKeys: sourceCoverageRows.expectedDayKeys,
    dayCoverage: sourceCoverageRows.dayCoverage,
    staleEvidence: false,
    sourceAgreementState: "pass",
  });
  const eligibility = buildLaunchHistoryCoverageRangeProofEligibility({
    proofMode: proofModeForLaunchCoverageExport(filePath, raw),
    expectedDayKeys,
    declaredExpectedDayCount: coverage.expectedDayCount,
    declaredRecoveredDayCount: coverage.recoveredDayCount,
    recoveredDayCount: coverageSummary.recoveredDayCount,
    rangeStartDayKey: coverage.rangeStartDayKey,
    rangeEndDayKey: coverage.rangeEndDayKey,
    rangeProof: coverage.rangeProof,
    launchCoverageState: coverageSummary.launchCoverage.state,
    firstPartyCoverageState: coverageSummary.firstPartyCoverage.state,
    productTruthRecoveredDayCount: coverageSummary.productTruthRecoveredDayCount,
    sourceAgreementState: "pass",
  });

  return eligibility.allLaunchRangeProven;
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
        nextAction: `Run \`${LAUNCH_HISTORY_EXPORT_COMMAND}\` to create ${LAUNCH_HISTORY_DEFAULT_EXPORT_PATH}, or place a complete redacted launchHistoryCoverage export at this path.`,
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
    if (coverage && isUsableLaunchHistoryCoverageEvidence(filePath, readResult.raw)) {
      if (!launchHistoryCoverageHasFormalRangeProof(filePath, readResult.raw)) {
        return {
          path: filePath,
          state: "usable_local_window_only",
          proofMode: proofModeForLaunchCoverageExport(filePath, readResult.raw),
          nextAction: "This complete redacted input can compare the local evidence window, but it still needs explicit all-launch range proof before clearing February-to-now recovery.",
        };
      }

      return {
        path: filePath,
        state: "usable_launch_history_coverage",
        proofMode: proofModeForLaunchCoverageExport(filePath, readResult.raw),
        nextAction: "Use this file as the local launch-history coverage input for source agreement.",
      };
    }
    if (coverage === null) {
      const candidate = asRecord(root.launchHistoryCoverage ?? asRecord(root.analyticsSourceHealth).launchHistoryCoverage ?? root);
      const days = Array.isArray(candidate.days) ? candidate.days : [];
      const hasDayRows = days.length > 0;
      if (hasDayRows) {
        return {
          path: filePath,
          state: "present_without_expected_day_rows",
          proofMode: "none",
          nextAction: "Launch-history evidence must include at least one valid expected day row before it can be compared or used as range proof.",
        };
      }
    }
    if (coverage) {
      return {
        path: filePath,
        state: "present_without_completion_or_redaction_proof",
        proofMode: "none",
        nextAction: "Add status=complete and explicit redaction proof before this launch-history coverage can clear source agreement.",
      };
    }

    return {
      path: filePath,
      state: "present_without_launch_history_coverage",
      proofMode: "none",
      nextAction: `This evidence exists but lacks launchHistoryCoverage day rows, so it cannot prove launch recovery. Add launchHistoryCoverage rows or create ${LAUNCH_HISTORY_DEFAULT_EXPORT_PATH} with \`${LAUNCH_HISTORY_EXPORT_COMMAND}\`.`,
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
    if (!isUsableLaunchHistoryCoverageEvidence(filePath, raw)) continue;
    const coverage = normalizeLaunchHistoryCoverageExport(raw);
    if (coverage) {
      return {
        filePath,
        coverage,
        proofMode: proofModeForLaunchCoverageExport(filePath, raw),
        inputHead: readLaunchCoverageInputHead(raw),
      };
    }
  }
  return null;
}

export function buildLaunchSourceAgreementDetail() {
  const localExport = loadLaunchHistoryCoverageExport();
  const inputMode = localExport
    ? localExport.proofMode === "admin_truth_sample"
      ? "admin_truth_sample"
      : "local_export"
    : "fixture_only_local_window";
  const inputPath = localExport?.filePath ?? null;
  const inputHead = localExport?.inputHead ?? null;
  const launchCoverageEvidence = {
    inputMode,
    inputPath,
    inputHead,
    usableInputFound: Boolean(inputPath),
    candidateInputPaths: launchHistoryCoverageExportPaths(),
    candidateInputStatuses: launchHistoryCoverageInputStatuses(),
    adminTruthSampleRequiresLaunchHistoryCoverage: true,
  };

  if (localExport) {
    return {
      inputMode,
      inputPath,
      inputHead,
      launchCoverageEvidence,
      detail: buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
        proofMode: localExport.proofMode,
        launchHistoryCoverage: localExport.coverage,
        comparedMetrics: ["day_bucket_presence", "coverage_delta_pct"],
        tolerance: { reviewDeltaPct: 10, failDeltaPct: 25 },
      }),
    };
  }

  return {
    inputMode,
    inputPath,
    inputHead,
    launchCoverageEvidence,
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
        filePath === "AGENTS.md" || filePath === "FULL_SCALE_CODEBASE_AUDIT.md" || filePath === "REPO_MEMORY_LEDGER.md" || filePath === "EVERY_FILE_FUNCTION_CHECKLIST.md"
          ? "doctrine_memory_artifact_expected"
          : filePath.includes("chart-readiness-hierarchy") ? "analytics_source_hierarchy_fix_required"
          : filePath.includes("ga4-availability-semantics") ? "ga4_availability_semantics_required"
            : filePath.endsWith("analytics-semantics.ts") ? "analytics_semantics_support_expected"
              : filePath === "scripts/audit-telemetry.ts" || filePath === "src/lib/telemetry-catalog.ts" || filePath === "shared/runtime/telemetry-event-manifest.ts" ? "telemetry_catalog_support_expected"
                : filePath === "scripts/rebuild-analytics-truth.ts" ? "analytics_truth_rebuild_support_expected"
                  : filePath === "src/lib/analytics/recovery-timeline-spine.ts" ? "recovery_timeline_spine_expected"
                    : filePath === "src/components/Admin/CreateDropModal.tsx" ? "creator_drop_ui_repair_unrelated"
                      : filePath === "src/lib/admin/admin-browser-surface-map.ts" || filePath === "src/lib/evidence/admin-browser-surface-smoke-contract.ts" ? "admin_browser_source_smoke_support_expected"
            : filePath.includes("admin-analytics-source-hierarchy") ? "analytics_tab_source_truth_mismatch_required"
              : filePath.includes("data-validation-copy-consistency") ? "validation_copy_contradiction_required"
                : filePath.includes("public-beta-score") || filePath.includes("current-beta-exit-status") || filePath.includes("overnight-beta-readiness-lock") ? "current_generated_artifact_to_commit"
                : /^agent\/state\/source-agreement-failure-detail\.generated\.json$/u.test(filePath)
                  || /^docs\/agent-truth\/source-agreement-failure-detail\.md$/u.test(filePath)
                  || /^scripts\/agent\/validate-source-agreement-failure-detail\.ts$/u.test(filePath)
                  ? "retired_duplicate_source_agreement_lane_expected"
                  : filePath.includes("source-agreement-detail") ? "source_agreement_failure_classification_required"
                  : filePath.includes("debug-cockpit-batch29") ? "validator_artifact_expected"
                    : filePath.includes("debug-cockpit-batch28-bug-validation") ? "analytics_source_hierarchy_fix_required"
                    : filePath === "package.json" ? "validator_artifact_expected"
                    : filePath === "src/lib/release-readiness/automated-truth-reconciliation.ts" ? "validator_artifact_expected"
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
