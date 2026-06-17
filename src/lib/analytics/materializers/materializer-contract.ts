export const MATERIALIZER_FRESHNESS_STATES = [
  "live",
  "refreshing",
  "stale",
  "diagnostic_fallback",
  "unavailable",
] as const;

export type MaterializerFreshnessState = (typeof MATERIALIZER_FRESHNESS_STATES)[number];

export type MaterializerIssueSeverity = "info" | "warn" | "fail";

export interface MaterializerIssue {
  code: string;
  severity: MaterializerIssueSeverity;
  message: string;
}

export interface MaterializerSourceBreakdown {
  runtimeFacts: string[];
  metricFacts: string[];
  diagnostics?: string[];
  notes?: string[];
}

export interface CanonicalMaterializerEnvelope {
  generatedAt: string;
  freshnessState: MaterializerFreshnessState;
  sourceBreakdown: MaterializerSourceBreakdown;
  issues: MaterializerIssue[];
}
