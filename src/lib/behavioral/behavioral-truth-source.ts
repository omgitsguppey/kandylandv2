import {
  computeBehavioralConfidence,
  type BehavioralConfidenceLabel,
  type BehavioralConfidenceResult,
} from "@/lib/behavioral/behavioral-confidence";

export type BehavioralTruthSource =
  | "materialized_rollup"
  | "event_facts"
  | "user_profile_fields"
  | "live_fallback"
  | "legacy_fallback"
  | "unavailable";

export type BehavioralFreshnessState = "live" | "stale" | "degraded" | "unavailable";

export type BehavioralTruthScope =
  | "admin_metrics"
  | "user_detail_behavior"
  | "recommendation_profile"
  | "strategic_analytics";

export const BEHAVIORAL_TRUTH_FRESHNESS_MS: Record<BehavioralTruthScope, number> = {
  admin_metrics: 5 * 60 * 1000,
  user_detail_behavior: 30 * 60 * 1000,
  recommendation_profile: 24 * 60 * 60 * 1000,
  strategic_analytics: 72 * 60 * 60 * 1000,
};

export type BehavioralTruthIssueLike = {
  code?: string;
  message: string;
  severity?: "info" | "warn" | "fail";
};

export type BehavioralTruthSummary = {
  source: BehavioralTruthSource;
  sourceLabel: string;
  availableSources: string[];
  availableSourceCount: number;
  agreeingSources: number;
  scope: BehavioralTruthScope;
  ageMs: number;
  maxFreshnessMs: number;
  freshnessState: BehavioralFreshnessState;
  confidenceScore: number;
  confidenceLabel: BehavioralConfidenceLabel;
  issueCount: number;
  issues: string[];
  sampleCount: number;
  requiredFieldsPresent: number;
  requiredFieldsTotal: number;
  breakdown: BehavioralConfidenceResult["breakdown"];
};

function getIssueCount(issues: Array<string | BehavioralTruthIssueLike>) {
  return issues.length;
}

function normalizeIssueMessages(issues: Array<string | BehavioralTruthIssueLike>) {
  return issues.map((issue) => typeof issue === "string" ? issue : issue.message);
}

function toSourceLabel(source: BehavioralTruthSource, input: {
  materializedLabel?: string;
  eventFactsLabel?: string;
  liveFallbackLabel?: string;
  legacyFallbackLabel?: string;
}) {
  if (source === "materialized_rollup") return input.materializedLabel ?? "materialized_rollup";
  if (source === "event_facts") return input.eventFactsLabel ?? "analytics_event_facts";
  if (source === "user_profile_fields") return "users";
  if (source === "live_fallback") return input.liveFallbackLabel ?? "live_fallback";
  if (source === "legacy_fallback") return input.legacyFallbackLabel ?? "legacy_fallback";
  return "unavailable";
}

export function resolveBehavioralTruthSource(input: {
  scope: BehavioralTruthScope;
  hasMaterializedRollup: boolean;
  hasEventFacts: boolean;
  hasUserProfileFields?: boolean;
  hasLiveFallback?: boolean;
  hasLegacyFallback?: boolean;
  rollupAgeMs?: number;
  materializedLabel?: string;
  eventFactsLabel?: string;
  liveFallbackLabel?: string;
  legacyFallbackLabel?: string;
}) {
  const maxFreshnessMs = BEHAVIORAL_TRUTH_FRESHNESS_MS[input.scope];
  const rollupAgeMs = Math.max(0, input.rollupAgeMs ?? Number.MAX_SAFE_INTEGER);
  const materializedFresh = input.hasMaterializedRollup && rollupAgeMs <= maxFreshnessMs;
  const source: BehavioralTruthSource = materializedFresh
    ? "materialized_rollup"
    : input.hasEventFacts
      ? "event_facts"
      : input.hasUserProfileFields
        ? "user_profile_fields"
        : input.hasLiveFallback
          ? "live_fallback"
          : input.hasLegacyFallback
            ? "legacy_fallback"
            : input.hasMaterializedRollup
              ? "materialized_rollup"
              : "unavailable";
  const availableSources = [
    input.hasMaterializedRollup ? "materialized_rollup" : null,
    input.hasEventFacts ? "event_facts" : null,
    input.hasUserProfileFields ? "user_profile_fields" : null,
    input.hasLiveFallback ? "live_fallback" : null,
    input.hasLegacyFallback ? "legacy_fallback" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    source,
    sourceLabel: toSourceLabel(source, input),
    availableSources,
    availableSourceCount: availableSources.length,
    maxFreshnessMs,
  };
}

export function buildBehavioralTruthSummary(input: {
  scope: BehavioralTruthScope;
  hasValue: boolean;
  ageMs: number;
  sampleCount: number;
  requiredFieldsPresent: number;
  requiredFieldsTotal: number;
  issues?: Array<string | BehavioralTruthIssueLike>;
  hasMaterializedRollup: boolean;
  hasEventFacts: boolean;
  hasUserProfileFields?: boolean;
  hasLiveFallback?: boolean;
  hasLegacyFallback?: boolean;
  materializedLabel?: string;
  eventFactsLabel?: string;
  liveFallbackLabel?: string;
  legacyFallbackLabel?: string;
}) : BehavioralTruthSummary {
  const issues = input.issues ?? [];
  const sourceResolution = resolveBehavioralTruthSource({
    scope: input.scope,
    hasMaterializedRollup: input.hasMaterializedRollup,
    hasEventFacts: input.hasEventFacts,
    hasUserProfileFields: input.hasUserProfileFields,
    hasLiveFallback: input.hasLiveFallback,
    hasLegacyFallback: input.hasLegacyFallback,
    rollupAgeMs: input.ageMs,
    materializedLabel: input.materializedLabel,
    eventFactsLabel: input.eventFactsLabel,
    liveFallbackLabel: input.liveFallbackLabel,
    legacyFallbackLabel: input.legacyFallbackLabel,
  });

  const issueCount = getIssueCount(issues);
  const agreeingSources = Math.max(
    0,
    sourceResolution.availableSourceCount === 0
      ? 0
      : sourceResolution.availableSourceCount - Math.min(issueCount, Math.max(0, sourceResolution.availableSourceCount - 1)),
  );
  const confidence = computeBehavioralConfidence({
    agreeingSources,
    availableSources: sourceResolution.availableSourceCount,
    ageMs: input.ageMs,
    maxFreshnessMs: sourceResolution.maxFreshnessMs,
    sampleCount: input.sampleCount,
    requiredFieldsPresent: input.requiredFieldsPresent,
    requiredFieldsTotal: input.requiredFieldsTotal,
    issueCount,
  });

  const freshnessState: BehavioralFreshnessState = !input.hasValue || sourceResolution.source === "unavailable"
    ? "unavailable"
    : sourceResolution.source === "live_fallback" || sourceResolution.source === "legacy_fallback"
      ? "degraded"
      : issueCount > 0
        ? "degraded"
        : input.ageMs > sourceResolution.maxFreshnessMs
          ? "stale"
          : confidence.score >= 50
            ? "live"
            : "degraded";

  return {
    source: sourceResolution.source,
    sourceLabel: sourceResolution.sourceLabel,
    availableSources: sourceResolution.availableSources,
    availableSourceCount: sourceResolution.availableSourceCount,
    agreeingSources,
    scope: input.scope,
    ageMs: Math.max(0, input.ageMs),
    maxFreshnessMs: sourceResolution.maxFreshnessMs,
    freshnessState,
    confidenceScore: confidence.score,
    confidenceLabel: confidence.label,
    issueCount,
    issues: normalizeIssueMessages(issues),
    sampleCount: Math.max(0, input.sampleCount),
    requiredFieldsPresent: Math.max(0, input.requiredFieldsPresent),
    requiredFieldsTotal: Math.max(1, input.requiredFieldsTotal),
    breakdown: confidence.breakdown,
  };
}
