export type AnalyticsSourceAgreementStatus = {
  chartStatus: "chart_ready" | "chart_partial" | "chart_blocked" | "chart_unavailable";
  agreementStatus: "source_agreement_pass" | "source_agreement_failed" | "source_agreement_review" | "source_agreement_unavailable";
  failedSources: string[];
  comparedSources: string[];
  comparedMetrics: string[];
  tolerance: string;
  confidence: number | null;
  nextAction: string;
};

export function buildAnalyticsSourceAgreementStatus(input: {
  availability: "pass" | "review" | "fail" | "unavailable";
  continuity: "none" | "info" | "review" | "error";
  chartReadiness: "ready" | "partial" | "blocked" | "gap_detected" | "unavailable";
  sourceAgreement: "pass" | "review" | "failed" | "fail" | "not_enough_sources" | "unavailable";
  comparedSources: string[];
  failedSources?: string[];
  comparedMetrics?: string[];
  tolerance?: string;
  confidence?: number | null;
}): AnalyticsSourceAgreementStatus {
  const chartStatus = input.chartReadiness === "ready" && input.availability === "pass" && input.continuity === "none"
    ? "chart_ready"
    : input.chartReadiness === "unavailable" || input.availability === "unavailable"
      ? "chart_unavailable"
      : input.chartReadiness === "blocked" || input.chartReadiness === "gap_detected" || input.continuity === "error"
        ? "chart_blocked"
        : "chart_partial";
  const agreementStatus = input.sourceAgreement === "failed" || input.sourceAgreement === "fail"
    ? "source_agreement_failed"
    : input.sourceAgreement === "review" || input.sourceAgreement === "not_enough_sources"
      ? "source_agreement_review"
      : input.sourceAgreement === "unavailable"
        ? "source_agreement_unavailable"
        : "source_agreement_pass";
  const failedSources = input.failedSources ?? (agreementStatus === "source_agreement_failed" ? input.comparedSources : []);
  const nextAction = agreementStatus === "source_agreement_failed"
    ? `Review source agreement failures across ${failedSources.join(", ") || "compared sources"}; chart availability does not clear parity failure.`
    : chartStatus === "chart_blocked"
      ? "Inspect missing days or recent gaps before trusting the chart range."
      : agreementStatus === "source_agreement_review"
        ? "Collect enough matching source evidence before promoting source agreement to pass."
        : "No action required.";

  return {
    chartStatus,
    agreementStatus,
    failedSources,
    comparedSources: input.comparedSources,
    comparedMetrics: input.comparedMetrics ?? ["day_bucket_presence"],
    tolerance: input.tolerance ?? "10% day coverage delta review, 25% fail",
    confidence: input.confidence ?? null,
    nextAction,
  };
}
