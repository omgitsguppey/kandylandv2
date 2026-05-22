import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";

export const LEGACY_EVENT_RECOVERY_DOMAINS = [
  "page_session",
  "wallet_payment_lifecycle",
  "drop_open_unwrap",
  "creator_profile_view",
  "fan_pass_subscription",
  "broadcasts",
  "notifications",
  "behavior_signals",
  "identity_links",
  "legacy_unknown",
] as const;

export type LegacyEventRecoveryDomain = (typeof LEGACY_EVENT_RECOVERY_DOMAINS)[number];

export type LegacyEventRecoveryConsentAssumption =
  | "explicit"
  | "inferred_minimal"
  | "unknown_necessary_only";

export type LegacyEventRecoveryDuplicateRisk = "low" | "medium" | "high";

export type LegacyEventRecoveryAction =
  | "normalize_candidate"
  | "link_candidate"
  | "archive_only"
  | "ignore"
  | "needs_manual_review";

export type LegacyEventRecoverySourceRecord = {
  legacyEventId: string;
  rawEventName?: string | null;
  eventName?: string | null;
  eventType?: string | null;
  occurredAt: string | number | Date;
  source: string;
  legacySystem?: string | null;
  userId?: string | null;
  guestId?: string | null;
  anonymousId?: string | null;
  visitorId?: string | null;
  sessionId?: string | null;
  linkId?: string | null;
  consentMode?: ConsentMode | string | null;
  identityVerified?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

export type LegacyEventRecoveryCandidate = {
  legacyEventId: string;
  occurredAt: string;
  domain: LegacyEventRecoveryDomain;
  action: LegacyEventRecoveryAction;
  identityConfidence: IdentityConfidence;
  consentAssumption: LegacyEventRecoveryConsentAssumption;
  duplicateRisk: LegacyEventRecoveryDuplicateRisk;
  normalizedEnvelopeCandidate: CanonicalEventEnvelope;
  dryRunOnly: true;
  canMutateProduction: false;
  manualReviewReason: string | null;
  boundaryReason: string | null;
};

export type LegacyEventRecoveryCountSummary = {
  inputRecords: number;
  candidateCount: number;
  confidenceCounts: Record<IdentityConfidence, number>;
  actionCounts: Record<LegacyEventRecoveryAction, number>;
  domainCounts: Record<LegacyEventRecoveryDomain, number>;
  duplicateRiskCounts: Record<LegacyEventRecoveryDuplicateRisk, number>;
};

export type MarchFirstEventRecoveryDryRun = {
  mode: "dry_run_only";
  recoveryStartDate: "2026-03-01";
  readsProduction: false;
  liveBackfill: false;
  mutationsAllowed: false;
  rawRecordsIncluded: false;
  candidates: LegacyEventRecoveryCandidate[];
  summary: LegacyEventRecoveryCountSummary;
  mutationPrevention: {
    productionMutationBlocked: true;
    exportedMutationFunctions: [];
    blockedReason: "dry_run_only_no_live_backfill";
  };
  debugPanel: {
    lane: "Legacy recovery";
    showCountsByConfidenceAndAction: true;
    rawDumpsCollapsed: true;
    duplicateLegacyWidgetsConsolidated: true;
  };
};
