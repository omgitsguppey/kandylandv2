import type { EventIdentityEnvelope } from "@/lib/analytics/identity-handoff-contract";
import type { SessionMeasurementCheckpoint } from "@/lib/analytics/session-metrics-contract";
import type { AnalyticsActorType } from "@/lib/analytics/analytics-event-contract";
import { CONSENT_MODE_VALUES, type ConsentMode } from "@/lib/privacy/consent-tracking-contract";

export const RUNTIME_FACT_CONTRACT_VERSION = "runtime_fact_v1";

export const RUNTIME_FACT_REQUEST_CONSENT_ADMISSION_VERSION = "runtime_fact_request_consent_v1";

/** Minted only from a request admitted by the server; older facts intentionally omit it. */
export type RuntimeFactRequestConsentAdmission = {
  version: typeof RUNTIME_FACT_REQUEST_CONSENT_ADMISSION_VERSION;
  consentMode: ConsentMode;
};

export function readRuntimeFactRequestConsentAdmission(value: unknown): RuntimeFactRequestConsentAdmission | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== RUNTIME_FACT_REQUEST_CONSENT_ADMISSION_VERSION
    || !CONSENT_MODE_VALUES.some(mode => mode === record.consentMode)) return null;
  return { version: RUNTIME_FACT_REQUEST_CONSENT_ADMISSION_VERSION, consentMode: record.consentMode as ConsentMode };
}

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
  requestConsentAdmission?: RuntimeFactRequestConsentAdmission;
  sessionMeasurement?: SessionMeasurementCheckpoint;
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
  issueCode: "unknown_runtime_event" | "unsupported_runtime_event" | "unverified_actor_authority";
};

export type RuntimeFactNormalizationResult = {
  /** Identified normalization owns the envelope and parameters consumed by sibling writers. */
  identityEnvelope?: EventIdentityEnvelope;
  params?: Record<string, unknown>;
  fact: RuntimeFact | null;
  diagnostic: RuntimeFactDiagnostic | null;
};
