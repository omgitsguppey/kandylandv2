export type ValidationReadinessState = {
  chartReadiness: {
    state: "ready" | "partial" | "blocked" | "unavailable";
    missingDays: string[];
    recentGaps: string[];
  };
  sourceAgreement: {
    state: "pass" | "fail" | "review" | "unavailable";
    sources: string[];
    failedSources: string[];
    reason: string;
  };
  validationParity: {
    state: "pass" | "fail" | "stale" | "not_validated" | "loading";
    checkCount: number;
    failCount: number;
    warnCount: number;
    staleCount: number;
    blockedPassCount: number;
  };
  blockedPass: {
    rows: Array<{ checkKey: string; whyBlocked: string; nextAction: string }>;
  };
  nextAction: string;
};

type ValidationRow = {
  checkKey?: string;
  status?: string;
  passAllowed?: boolean;
  passBlockedReason?: string | null;
  freshnessState?: string;
};

export function buildValidationReadinessSummary(input: {
  chartReadiness: {
    availability: "pass" | "review" | "fail" | "unavailable";
    continuity: "none" | "info" | "review" | "error";
    missingDays: string[];
    recentGaps: string[];
  };
  sourceAgreement: {
    sources: string[];
    failedSources?: string[];
    reason?: string;
  };
  validations: ValidationRow[];
}): ValidationReadinessState {
  const failCount = input.validations.filter((row) => row.status === "fail" || row.status === "unavailable").length;
  const warnCount = input.validations.filter((row) => row.status === "warn" || row.status === "unknown").length;
  const staleCount = input.validations.filter((row) => row.status === "stale" || row.freshnessState === "stale").length;
  const blockedRows = input.validations
    .filter((row) => row.passAllowed === false)
    .map((row) => ({
      checkKey: row.checkKey || "unknown_check",
      whyBlocked: row.passBlockedReason || "Required evidence is missing or failed.",
      nextAction: /source_agreement/iu.test(row.checkKey || "")
        ? "Inspect failed source agreement rows before promoting analytics parity."
        : "Collect the missing evidence before allowing this row to pass.",
    }));
  const failedSources = input.sourceAgreement.failedSources ?? [];
  const chartState =
    input.chartReadiness.availability === "unavailable" ? "unavailable"
      : input.chartReadiness.continuity === "error" || input.chartReadiness.recentGaps.length > 0 ? "blocked"
        : input.chartReadiness.availability === "pass" && input.chartReadiness.continuity === "none" ? "ready"
          : "partial";
  const sourceAgreementState =
    failedSources.length > 0 ? "fail"
      : input.sourceAgreement.sources.length < 2 ? "unavailable"
        : input.sourceAgreement.reason ? "review"
          : "pass";
  const validationParityState =
    input.validations.length === 0 ? "not_validated"
      : failCount > 0 ? "fail"
        : staleCount > 0 ? "stale"
          : "pass";
  const nextAction = sourceAgreementState === "fail"
    ? `Review source agreement failures across ${failedSources.join(", ")} before trusting analytics parity.`
    : blockedRows.length > 0
      ? "Review blocked validation rows; blocked pass means not safe to promote to pass."
      : validationParityState === "fail"
        ? "Review failed validation rows before trusting analytics parity."
        : "No action required.";

  return {
    chartReadiness: {
      state: chartState,
      missingDays: input.chartReadiness.missingDays,
      recentGaps: input.chartReadiness.recentGaps,
    },
    sourceAgreement: {
      state: sourceAgreementState,
      sources: input.sourceAgreement.sources,
      failedSources,
      reason: input.sourceAgreement.reason ?? "",
    },
    validationParity: {
      state: validationParityState,
      checkCount: input.validations.length,
      failCount,
      warnCount,
      staleCount,
      blockedPassCount: blockedRows.length,
    },
    blockedPass: { rows: blockedRows },
    nextAction,
  };
}

export function buildDataValidationUiSemantics(input: {
  chartReadinessState: "ready" | "partial" | "blocked" | "unavailable";
  sourceAgreementState: "pass" | "fail" | "review" | "unavailable";
  validationParityState: "pass" | "fail" | "stale" | "not_validated" | "loading";
  blockedPassCount: number;
  routeLoadedSuccessfully: boolean;
  failedRows?: string[];
  cacheState?: "hit" | "miss" | "stale" | "unknown" | "not_loaded";
}) {
  const failedRows = input.failedRows ?? [];
  const sourceAgreementFailed = input.sourceAgreementState === "fail";
  const nextAction = sourceAgreementFailed
    ? `Source agreement failed in ${failedRows.join(", ") || "validation rows"}; inspect source agreement failures and blocked passes before trusting parity.`
    : input.blockedPassCount > 0
      ? "Blocked pass rows are not safe to promote to pass; collect the missing evidence listed in each row."
      : !input.routeLoadedSuccessfully
        ? "Retry the validation route or inspect admin analytics historical route errors."
        : input.validationParityState === "fail"
          ? "Review failed validation rows before trusting analytics parity."
          : "No action required.";

  return {
    summaryPills: [
      { label: "Chart readiness", state: input.chartReadinessState },
      { label: "Source agreement", state: input.sourceAgreementState },
      { label: "Validation parity", state: input.validationParityState },
      { label: "Blocked pass", state: input.blockedPassCount },
    ],
    rawRowsDefaultOpen: false,
    cacheMissIsFailure: false,
    nextAction,
  };
}
