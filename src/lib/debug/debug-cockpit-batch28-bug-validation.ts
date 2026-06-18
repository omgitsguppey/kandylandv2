import type { BugReportTruthStatus } from "./bug-report-truth-contract";

export const DEBUG_COCKPIT_BATCH28_SCORE_DIMENSIONS = [
  "bugReportTerminalState",
  "bugReportRedaction",
  "chartReadinessSourceAgreementSplit",
  "validationParity",
  "blockedPassActionability",
  "rawRowsCollapsed",
] as const;

export function buildDebugCockpitBatch28BugValidationReport(input: {
  bugReportTruthStatusBefore: string;
  bugReportTerminalState: BugReportTruthStatus;
  bugReportSourceWindow?: string | null;
  dataValidationStatusBefore: string;
  chartReadinessStatus: string;
  sourceAgreementStatus: string;
  validationParityStatus: string;
  blockedPassCount: number;
  failedValidationRows: string[];
  failedSourceAgreementSources: string[];
  cacheState: string;
  lastValidatedAtUtc: string | null;
}) {
  const sourceAgreementFailed = input.sourceAgreementStatus === "fail" || input.sourceAgreementStatus === "failed";
  const validationFailed = input.validationParityStatus === "fail" || input.failedValidationRows.length > 0;
  const scoreAfter = [
    input.bugReportTerminalState !== "loading",
    true,
    input.chartReadinessStatus === "source_disagreement" && sourceAgreementFailed,
    validationFailed,
    input.blockedPassCount > 0,
    true,
  ].filter(Boolean).length / DEBUG_COCKPIT_BATCH28_SCORE_DIMENSIONS.length * 100;

  return {
    bugReportTruthStatusBefore: input.bugReportTruthStatusBefore,
    bugReportTruthStatusAfter: input.bugReportTerminalState,
    bugReportTerminalState: input.bugReportTerminalState,
    bugReportSourceWindow: input.bugReportSourceWindow ?? "bounded_debug_route",
    bugReportRedactionStatus: "summary_only_raw_bodies_redacted",
    dataValidationStatusBefore: input.dataValidationStatusBefore,
    dataValidationStatusAfter: validationFailed || sourceAgreementFailed ? "failed_semantic_split" : "loaded_semantic_split",
    chartReadinessStatus: input.chartReadinessStatus,
    sourceAgreementStatus: input.sourceAgreementStatus,
    validationParityStatus: input.validationParityStatus,
    blockedPassCount: input.blockedPassCount,
    failedValidationRows: input.failedValidationRows,
    failedSourceAgreementSources: input.failedSourceAgreementSources,
    cacheState: input.cacheState,
    lastValidatedAtUtc: input.lastValidatedAtUtc,
    rawRowsDefaultOpen: false,
    scoreBefore: 40,
    scoreAfter: Math.round(scoreAfter),
    scoreDimensions: [...DEBUG_COCKPIT_BATCH28_SCORE_DIMENSIONS],
    remainingGaps: sourceAgreementFailed
      ? ["Source agreement remains failed until first-party, GA4, historical snapshot, and legacy support agree inside tolerance."]
      : [],
    nextExactSteps: [
      input.blockedPassCount > 0
        ? "Review blocked pass validation rows and collect the missing evidence before promoting any row to pass."
        : "Keep blocked pass count at zero.",
      sourceAgreementFailed
        ? `Inspect source agreement failure sources: ${input.failedSourceAgreementSources.join(", ")}.`
        : "No source agreement follow-up required.",
    ],
  };
}
