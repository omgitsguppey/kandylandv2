export const MATERIALIZER_RUNTIME_FACT_COLLECTIONS = ["analytics_event_facts"] as const;

export const MATERIALIZER_METRIC_FACT_SOURCES = [
  "analytics_metric_facts",
  "transactions",
  "entitlements",
  "analytics_watch_sessions",
] as const;

export const MATERIALIZER_DIAGNOSTIC_FALLBACKS = [
  "legacy_page_duration",
  "deterministic-fallback",
] as const;

export interface MaterializerSourcePolicy {
  runtimeFacts: readonly string[];
  metricFacts: readonly string[];
  diagnostics: readonly string[];
  blockedTruthInputs: readonly string[];
}

export function buildCanonicalMaterializerSourcePolicy(
  overrides: Partial<MaterializerSourcePolicy> = {},
): MaterializerSourcePolicy {
  return {
    runtimeFacts: overrides.runtimeFacts ?? MATERIALIZER_RUNTIME_FACT_COLLECTIONS,
    metricFacts: overrides.metricFacts ?? MATERIALIZER_METRIC_FACT_SOURCES,
    diagnostics: overrides.diagnostics ?? MATERIALIZER_DIAGNOSTIC_FALLBACKS,
    blockedTruthInputs: overrides.blockedTruthInputs ?? [
      "raw_client_event_names",
      "legacy_page_duration_as_verified_watch_truth",
      "client_purchase_events_as_verified_purchase_truth",
      "client_unlock_events_as_verified_unlock_truth",
    ],
  };
}
