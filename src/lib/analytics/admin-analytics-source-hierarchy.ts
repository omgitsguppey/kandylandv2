export type AdminAnalyticsConsumerId =
  | "debug_data_validation"
  | "admin_analytics_overview"
  | "admin_analytics_charts"
  | "admin_analytics_insight_cards"
  | "admin_analytics_source_health"
  | "public_beta_score_evidence";

export type AdminAnalyticsSourceHierarchyConsumer = {
  consumerId: AdminAnalyticsConsumerId;
  sourceUsed:
    | "admin_analytics_canonical_snapshot"
    | "historical_snapshot"
    | "ga4_external_evidence"
    | "legacy_support_rollups"
    | "live_realtime_pulse"
    | "local_fallback_empty_state";
  sourceHealthRequired: boolean;
  chartReadinessRequired: boolean;
  sourceAgreementRequired: boolean;
  fallbackAllowed: boolean;
  emptyStateAllowed: boolean;
  blockerReason: string | null;
  nextAction: string;
};

export type AdminAnalyticsSourceHierarchy = {
  status: "aligned" | "blocked" | "consumer_source_mismatch" | "source_agreement_failed";
  sourceOrder: string[];
  consumers: AdminAnalyticsSourceHierarchyConsumer[];
  consumerSourceMismatches: AdminAnalyticsConsumerId[];
  blockedAnalyticsConsumers: AdminAnalyticsConsumerId[];
  nextAction: string;
};

export function buildAdminAnalyticsSourceHierarchy(input: {
  sourceAgreementState: "pass" | "review" | "failed" | "not_enough_sources" | "fail";
  chartReadinessState: "ready" | "partial" | "source_disagreement" | "gap_detected" | "unavailable" | "blocked";
  analyticsTabHasData: boolean;
  debugHasData: boolean;
  sourceUsedByAnalyticsTab?: AdminAnalyticsSourceHierarchyConsumer["sourceUsed"];
  failedSources?: string[];
}): AdminAnalyticsSourceHierarchy {
  const sourceAgreementFailed = input.sourceAgreementState === "failed" || input.sourceAgreementState === "fail";
  const chartBlocked = input.chartReadinessState !== "ready";
  const analyticsSource = input.sourceUsedByAnalyticsTab ?? (input.analyticsTabHasData ? "admin_analytics_canonical_snapshot" : "local_fallback_empty_state");
  const chartBlocker = sourceAgreementFailed
    ? "source_agreement_failed"
    : chartBlocked
      ? `chart_readiness_${input.chartReadinessState}`
      : null;
  const mismatch =
    input.debugHasData &&
    !input.analyticsTabHasData &&
    analyticsSource === "local_fallback_empty_state" &&
    chartBlocker === null;

  const consumers: AdminAnalyticsSourceHierarchyConsumer[] = [
    {
      consumerId: "debug_data_validation",
      sourceUsed: "historical_snapshot",
      sourceHealthRequired: true,
      chartReadinessRequired: false,
      sourceAgreementRequired: true,
      fallbackAllowed: false,
      emptyStateAllowed: false,
      blockerReason: sourceAgreementFailed ? "source_agreement_failed" : null,
      nextAction: sourceAgreementFailed ? "Review source agreement details in Debug before promoting charts." : "No action required.",
    },
    {
      consumerId: "admin_analytics_overview",
      sourceUsed: analyticsSource,
      sourceHealthRequired: true,
      chartReadinessRequired: true,
      sourceAgreementRequired: true,
      fallbackAllowed: true,
      emptyStateAllowed: true,
      blockerReason: chartBlocker ?? (mismatch ? "consumer_source_mismatch" : null),
      nextAction: chartBlocker
        ? "Show source mismatch details instead of generic empty charts."
        : mismatch
          ? "Connect the Analytics tab to the same canonical source health summary as Debug."
          : "No action required.",
    },
    {
      consumerId: "admin_analytics_charts",
      sourceUsed: analyticsSource,
      sourceHealthRequired: true,
      chartReadinessRequired: true,
      sourceAgreementRequired: true,
      fallbackAllowed: true,
      emptyStateAllowed: true,
      blockerReason: chartBlocker ?? (mismatch ? "consumer_source_mismatch" : null),
      nextAction: chartBlocker
        ? "Keep charts held until source agreement and chart readiness are clear."
        : mismatch
          ? "Wire chart empty state to the Debug source hierarchy reason."
          : "No action required.",
    },
    {
      consumerId: "admin_analytics_insight_cards",
      sourceUsed: analyticsSource,
      sourceHealthRequired: true,
      chartReadinessRequired: false,
      sourceAgreementRequired: true,
      fallbackAllowed: true,
      emptyStateAllowed: true,
      blockerReason: sourceAgreementFailed ? "source_agreement_failed" : mismatch ? "consumer_source_mismatch" : null,
      nextAction: sourceAgreementFailed ? "Label insight cards as source mismatch instead of clean." : "No action required.",
    },
    {
      consumerId: "admin_analytics_source_health",
      sourceUsed: "historical_snapshot",
      sourceHealthRequired: true,
      chartReadinessRequired: true,
      sourceAgreementRequired: true,
      fallbackAllowed: false,
      emptyStateAllowed: false,
      blockerReason: chartBlocker,
      nextAction: chartBlocker ? "Keep chart readiness and source agreement as separate health dimensions." : "No action required.",
    },
    {
      consumerId: "public_beta_score_evidence",
      sourceUsed: "historical_snapshot",
      sourceHealthRequired: true,
      chartReadinessRequired: false,
      sourceAgreementRequired: true,
      fallbackAllowed: false,
      emptyStateAllowed: false,
      blockerReason: sourceAgreementFailed ? "source_agreement_failed" : null,
      nextAction: sourceAgreementFailed ? "Score source agreement as blocked until mismatched evidence is repaired." : "No action required.",
    },
  ];
  const consumerSourceMismatches = mismatch
    ? consumers
      .filter((consumer) => consumer.sourceUsed === "local_fallback_empty_state")
      .map((consumer) => consumer.consumerId)
    : [];
  const blockedAnalyticsConsumers = consumers
    .filter((consumer) => Boolean(consumer.blockerReason))
    .map((consumer) => consumer.consumerId);

  return {
    status: sourceAgreementFailed
      ? "source_agreement_failed"
      : consumerSourceMismatches.length > 0
        ? "consumer_source_mismatch"
        : blockedAnalyticsConsumers.length > 0
          ? "blocked"
          : "aligned",
    sourceOrder: [
      "Admin Analytics canonical snapshot / source truth",
      "Historical snapshot",
      "GA4 external evidence",
      "Legacy support rollups",
      "Live/realtime pulse",
      "Local fallback/empty states",
    ],
    consumers,
    consumerSourceMismatches,
    blockedAnalyticsConsumers,
    nextAction: sourceAgreementFailed
      ? "Review source details in Debug and restore first-party/materialized coverage before promoting charts."
      : mismatch
        ? "Align the Analytics tab with the Debug source hierarchy and keep fallback empty states reasoned."
        : "No action required.",
  };
}
