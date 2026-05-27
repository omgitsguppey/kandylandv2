export interface Route4xxScoreCostImpactEntry {
  impactId:
    | "expected_classified_4xx"
    | "suspicious_grouped_4xx"
    | "retry_storm_unclassified_4xx"
    | "stale_client_deeplink_4xx"
    | "route_param_resource_recovered_4xx"
    | "bot_crawler_noise"
    | "admin_panel_hydration_4xx";
  runtimeScoreImpact: "none" | "freshness_until_fixed" | "cost_and_runtime_until_classified" | "evidence_only";
  costImpact: "low_grouped" | "medium_until_fixed" | "high_until_fixed";
  userJourneyImpact: "none" | "degraded_until_recovered" | "blocked_until_fixed";
  evidenceImpact: "none" | "security_debug_only" | "blocks_clean_runtime_evidence" | "admin_panel_evidence";
  requiredClassification: string;
}

export const ROUTE_4XX_SCORE_COST_IMPACT: readonly Route4xxScoreCostImpactEntry[] = [
  {
    impactId: "expected_classified_4xx",
    runtimeScoreImpact: "none",
    costImpact: "low_grouped",
    userJourneyImpact: "none",
    evidenceImpact: "none",
    requiredClassification: "Expected validation/auth/permission/not-found 4xx with safe copy, non-retry policy, owner, and hourly rollup.",
  },
  {
    impactId: "suspicious_grouped_4xx",
    runtimeScoreImpact: "evidence_only",
    costImpact: "low_grouped",
    userJourneyImpact: "none",
    evidenceImpact: "security_debug_only",
    requiredClassification: "Scanner/probe traffic grouped by bot/security class, not user journey.",
  },
  {
    impactId: "retry_storm_unclassified_4xx",
    runtimeScoreImpact: "cost_and_runtime_until_classified",
    costImpact: "high_until_fixed",
    userJourneyImpact: "blocked_until_fixed",
    evidenceImpact: "blocks_clean_runtime_evidence",
    requiredClassification: "Any repeated unclassified 4xx must block clean runtime evidence until grouped or fixed.",
  },
  {
    impactId: "stale_client_deeplink_4xx",
    runtimeScoreImpact: "freshness_until_fixed",
    costImpact: "medium_until_fixed",
    userJourneyImpact: "degraded_until_recovered",
    evidenceImpact: "blocks_clean_runtime_evidence",
    requiredClassification: "Stale client, PWA, notification, or saved-link 4xx must clear stale state and show recovery.",
  },
  {
    impactId: "route_param_resource_recovered_4xx",
    runtimeScoreImpact: "none",
    costImpact: "low_grouped",
    userJourneyImpact: "none",
    evidenceImpact: "none",
    requiredClassification: "Invalid param or unavailable resource with explicit non-retry recovery copy.",
  },
  {
    impactId: "bot_crawler_noise",
    runtimeScoreImpact: "none",
    costImpact: "low_grouped",
    userJourneyImpact: "none",
    evidenceImpact: "security_debug_only",
    requiredClassification: "Bot/crawler/static noise sampled and excluded from product journey.",
  },
  {
    impactId: "admin_panel_hydration_4xx",
    runtimeScoreImpact: "evidence_only",
    costImpact: "medium_until_fixed",
    userJourneyImpact: "degraded_until_recovered",
    evidenceImpact: "admin_panel_evidence",
    requiredClassification: "Admin hydration 4xx connects to panel diagnostics instead of raw debug spam.",
  },
];

export function validateRoute4xxScoreCostImpact(entries = ROUTE_4XX_SCORE_COST_IMPACT) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (entry.impactId === "expected_classified_4xx" && entry.runtimeScoreImpact !== "none") {
      failures.push("Expected classified 4xx penalizes runtime score.");
    }
    if (entry.impactId === "retry_storm_unclassified_4xx" && entry.costImpact !== "high_until_fixed") {
      failures.push("Retry storm does not affect cost risk.");
    }
    if (entry.impactId === "bot_crawler_noise" && entry.userJourneyImpact !== "none") {
      failures.push("Bot noise affects user journey.");
    }
    if (entry.impactId === "admin_panel_hydration_4xx" && entry.evidenceImpact !== "admin_panel_evidence") {
      failures.push("Admin panel hydration 4xx does not connect to panel diagnostics.");
    }
    if (!entry.requiredClassification) failures.push(`${entry.impactId} lacks classification rule.`);
  }
  return failures;
}

export function buildRoute4xxScoreCostImpactReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateRoute4xxScoreCostImpact();
  return {
    reportKey: "route-4xx-score-cost-impact",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    impactClassesAudited: ROUTE_4XX_SCORE_COST_IMPACT.length,
    expectedRuntimePenaltyBlocked: ROUTE_4XX_SCORE_COST_IMPACT.some((entry) => entry.impactId === "expected_classified_4xx" && entry.runtimeScoreImpact === "none"),
    retryStormCostImpact: "high_until_fixed",
    validationFailures,
  };
}
