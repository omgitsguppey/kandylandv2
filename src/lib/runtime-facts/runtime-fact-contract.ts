import type { AnalyticsActorType } from "@/lib/analytics/analytics-event-contract";

export const RUNTIME_FACT_CONTRACT_VERSION = "runtime_fact_v1";

export const RUNTIME_FACT_SOURCE_TRUTHS = [
  "client",
  "server",
  "canonical",
  "materialized",
  "legacy",
  "ga4_optional",
  "local_projection",
] as const;

export type RuntimeFactSourceTruth = (typeof RUNTIME_FACT_SOURCE_TRUTHS)[number];

export type RuntimeFactActor = {
  actorType: AnalyticsActorType;
  actorUserId: string;
  actorCreatorId: string;
  actorAdminId: string;
  anonymousVisitorId: string;
  sessionId: string;
  identityLinkId: string;
};

export type RuntimeFactTarget = {
  targetUserId: string;
  targetCreatorId: string;
  targetDropId: string;
  targetFileId: string;
  targetThreadId: string;
  transactionId: string;
};

export type RuntimeFact = {
  runtimeFactVersion: typeof RUNTIME_FACT_CONTRACT_VERSION;
  eventId: string;
  rawEventName: string;
  canonicalEventName: string;
  normalizedAction: string;
  metricFamily: string;
  actorLane: string;
  actor: RuntimeFactActor;
  target: RuntimeFactTarget;
  route: string;
  source_component: string;
  sourceTruth: RuntimeFactSourceTruth;
  confidence: number;
  timestampMs: number;
  performedAs: string;
  projectionMode: string;
  includeInUserBehavior: boolean;
  includeInAdminAnalytics: boolean;
  includeInGlobalEvents: boolean;
  adminExcludedCount: number;
  systemExcludedCount: number;
  metricEligible: boolean;
  metricExclusionReason: string;
  sourceCollection: "analytics_event_facts" | "analytics_guest_batches";
  issueCodes: string[];
};

export type RuntimeFactDiagnostic = {
  eventId: string;
  rawEventName: string;
  route: string;
  source_component: string;
  timestampMs: number;
  issueCode: "unknown_runtime_event" | "unsupported_runtime_event";
};

export type RuntimeFactNormalizationResult = {
  fact: RuntimeFact | null;
  diagnostic: RuntimeFactDiagnostic | null;
};
