import {
  createCanonicalAnalyticsEvent,
  type AnalyticsActorType,
  type AnalyticsObjectType,
  type CanonicalAnalyticsEvent,
} from "@/lib/analytics/analytics-event-contract";
import type { LegacyRecoveredEventRecord, LegacyRecoveryConfidenceLabel } from "@/lib/analytics/legacy-recovery-contract";
import type { GumdropLedgerSourceBucket } from "@/lib/math/gumdrop-ledger-math";

export const RECOVERY_TIMELINE_SPINE_VERSION = "2026.06.recovery-timeline-spine.1";

export const RECOVERY_TIMELINE_SOURCE_PRECEDENCE = [
  "first_party_event_fact",
  "transaction_ledger",
  "gumdrop_ledger",
  "unlock_record",
  "reward_record",
  "behavioral_timeline_fact",
  "legacy_analytics",
  "ga4_evidence",
  "unknown_legacy",
] as const;

export type RecoveryTimelineSource = typeof RECOVERY_TIMELINE_SOURCE_PRECEDENCE[number];

export type RecoveryTimelineClassification =
  | "canonical"
  | "corroborating_evidence"
  | "weak_match"
  | "unknown_legacy"
  | "duplicate_candidate"
  | "rejected";

export type RecoveryProductDomain =
  | "wallet_payment"
  | "gumdrop_economy"
  | "drop_unlock"
  | "daily_rewards"
  | "telemetry_behavior"
  | "identity_handoff"
  | "support_recovery"
  | "admin_debug"
  | "unknown";

export type RecoveryActorScope =
  | "global"
  | "guest"
  | "signed_in_user"
  | "linked_person"
  | "creator_role"
  | "admin_operator"
  | "system"
  | "unknown";

export type RecoveryTruthEligibility =
  | "product_truth_eligible"
  | "evidence_only"
  | "manual_review_required"
  | "ledger_corroboration_required"
  | "not_eligible"
  | "rejected";

export type RecoveryConfidence = LegacyRecoveryConfidenceLabel | "canonical" | "ledger_confirmed";

export type RecoveryCorroboration = {
  transactionId?: string | null;
  gumdropLedgerId?: string | null;
  unlockId?: string | null;
  rewardEventId?: string | null;
  eventFactId?: string | null;
  sourceCount: number;
  treasuryLedgerCorroborated: boolean;
};

export type RecoveryTimelineEntry = {
  timelineId: string;
  source: RecoveryTimelineSource;
  sourceRecordId: string | null;
  timestamp: string;
  eventName: string;
  actor: {
    actorType: RecoveryActorScope;
    userId?: string | null;
    anonymousVisitorId?: string | null;
    sessionId?: string | null;
    identityLinkId?: string | null;
  };
  identityConfidence: RecoveryConfidence;
  eventConfidence: RecoveryConfidence;
  productDomain: RecoveryProductDomain;
  classification: RecoveryTimelineClassification;
  recoveryEligibility: RecoveryTruthEligibility;
  missingVsZeroState: "source_present" | "source_missing" | "bridge_missing" | "materializer_missing" | "permission_blocked" | "proven_zero_not_applicable";
  corroboration: RecoveryCorroboration;
  evidenceLabels: Array<"source_truth" | "corroborating_evidence" | "ga4_evidence_only" | "legacy_directional_only" | "manual_review">;
  notes: string[];
};

export type RecoveryTimelineValidationResult = {
  ok: boolean;
  findings: string[];
};

export type AnalyticsEventFactRecoveryInput = {
  eventId: string;
  eventName: string;
  timestamp: number;
  userId?: string | null;
  anonymousVisitorId?: string | null;
  sessionId?: string | null;
  pagePath?: string | null;
  dropId?: string | null;
  sourceSurface?: string | null;
};

export type EventFactTimelineGapClassification =
  | "first_party_present"
  | "legacy_only"
  | "ga4_only"
  | "first_party_missing"
  | "identity_missing"
  | "timestamp_conflict"
  | "duplicate_candidate";

export type EventFactTimelineMatch = {
  matchingKey: string;
  firstPartyEventFactId: string | null;
  timelineId: string | null;
  eventName: string;
  gapClassification: EventFactTimelineGapClassification;
  duplicateCandidate: boolean;
  productTruthEligible: boolean;
  reason: string;
};

export type EventFactTimelineReconciliationReport = {
  reportKey: "analytics-event-facts-recovery-reconciliation";
  generatedAtUtc: string;
  matchingRules: {
    exactEventFactIdWins: true;
    sameActorSessionActionWindowMs: number;
    timestampConflictWindowMs: number;
    missingSourceIsNotZero: true;
  };
  summary: {
    firstPartyFactCount: number;
    timelineEntryCount: number;
    firstPartyPresent: number;
    legacyOnly: number;
    ga4Only: number;
    firstPartyMissing: number;
    identityMissing: number;
    timestampConflict: number;
    duplicateCandidate: number;
    productTruthEligible: number;
  };
  matches: EventFactTimelineMatch[];
  productTruthPolicy: {
    firstPartyEventFactsPrimary: true;
    legacyCanOnlyCorroborate: true;
    ga4CanOnlyCorroborate: true;
    duplicateEventsNotImported: true;
    missingWindowNotZero: true;
  };
};

export type TreasuryTimelineEventType =
  | "purchase"
  | "reward"
  | "unlock_spend"
  | "creator_accrual"
  | "admin_adjustment"
  | "refund_void";

export type TreasuryTimelineReconciliationStatus =
  | "ledger_confirmed"
  | "analytics_correlated"
  | "analytics_missing"
  | "analytics_only_not_ledger"
  | "ledger_missing_protected"
  | "duplicate_risk"
  | "source_bucket_mismatch";

export type TreasuryLedgerRecoveryInput = {
  ledgerId: string;
  transactionId?: string | null;
  eventType: TreasuryTimelineEventType;
  eventName: string;
  occurredAt: string;
  actor: {
    userId?: string | null;
    anonymousVisitorId?: string | null;
    sessionId?: string | null;
  };
  amountGd: number;
  sourceBucket: GumdropLedgerSourceBucket;
  direction: "credit" | "debit" | "reversal" | "accrual";
  sourceTruth: "server_transaction" | "gumdrop_ledger" | "reward_ledger" | "unlock_record" | "creator_ledger" | "admin_adjustment";
};

export type TreasuryTimelineEvidenceInput = {
  entry: RecoveryTimelineEntry;
  expectedSourceBucket?: GumdropLedgerSourceBucket | null;
};

export type TreasuryTimelineReconciliationFinding = {
  findingId: string;
  status: TreasuryTimelineReconciliationStatus;
  eventType: TreasuryTimelineEventType;
  ledgerId: string | null;
  timelineId: string | null;
  eventName: string;
  sourceBucket: GumdropLedgerSourceBucket | null;
  evidenceSourceBucket: GumdropLedgerSourceBucket | null;
  productTruthAllowed: boolean;
  reason: string;
  nextAction: string;
};

export type TreasuryTimelineReconciliationReport = {
  reportKey: "treasury-recovery-timeline-reconciliation";
  generatedAtUtc: string;
  status: "pass" | "review";
  eventMap: Array<{
    eventType: TreasuryTimelineEventType;
    ledgerOwner: RecoveryTimelineSource;
    analyticsEvidenceEvents: string[];
    productTruthRule: string;
  }>;
  summary: Record<TreasuryTimelineReconciliationStatus, number> & {
    ledgerEventCount: number;
    timelineEvidenceCount: number;
    productTruthEligibleCount: number;
  };
  findings: TreasuryTimelineReconciliationFinding[];
  productTruthPolicy: {
    treasuryLedgersPrimary: true;
    analyticsCanOnlyCorroborate: true;
    ga4CanCreditOrDebitGumdrops: false;
    legacyCanCreditOrDebitGumdrops: false;
    sourceBucketsMustMatch: true;
    noBalanceMutation: true;
    missingAnalyticsIsNotMissingMoney: true;
  };
};

export type GumdropRecoveryQueueEvidenceKind =
  | "treasury_ledger"
  | "first_party_event_fact"
  | "ga4_evidence"
  | "legacy_analytics"
  | "debug_evidence"
  | "manual_operator_evidence";

export type GumdropRecoveryQueueLedgerCorroboration =
  | "ledger_present"
  | "ledger_missing"
  | "source_bucket_mismatch"
  | "duplicate_risk"
  | "not_required_non_money";

export type GumdropRecoveryAllowedAction =
  | "manual_review_only"
  | "attach_evidence_to_existing_ledger"
  | "request_ledger_or_server_proof"
  | "reject_analytics_only_balance_recovery";

export type GumdropRecoveryQueueItem = {
  recoveryId: string;
  actor: {
    actorScope: RecoveryActorScope;
    userId?: string | null;
    anonymousVisitorId?: string | null;
    sessionId?: string | null;
    identityLinkId?: string | null;
  };
  timeWindow: {
    startUtc: string;
    endUtc: string;
    basis: "ledger_occurred_at" | "timeline_timestamp" | "unknown";
  };
  suspectedAction: TreasuryTimelineEventType;
  eventName: string;
  amountGd: number | null;
  sourceBucket: GumdropLedgerSourceBucket | null;
  evidenceSources: Array<{
    evidenceId: string;
    kind: GumdropRecoveryQueueEvidenceKind;
    source: RecoveryTimelineSource | "operator";
    productTruthAllowed: boolean;
    note: string;
  }>;
  confidence: "high" | "medium" | "low" | "unknown";
  ledgerCorroboration: {
    status: GumdropRecoveryQueueLedgerCorroboration;
    ledgerId: string | null;
    sourceBucket: GumdropLedgerSourceBucket | null;
    serverProofRequiredForMoneyAction: true;
  };
  requiredHumanProof: string[];
  allowedRecoveryAction: GumdropRecoveryAllowedAction;
  forbiddenAction: string;
};

export type GumdropRecoveryQueueReport = {
  reportKey: "gumdrop-recovery-queue";
  generatedAtUtc: string;
  status: "pass" | "review";
  summary: {
    queueItemCount: number;
    ledgerProofRequiredCount: number;
    analyticsOnlyRejectedCount: number;
    duplicateRiskCount: number;
    sourceBucketMismatchCount: number;
    moneyAffectingRecoveryAllowedCount: 0;
  };
  schema: {
    requiredFields: Array<keyof GumdropRecoveryQueueItem>;
    moneyTruthRule: "ledger_or_server_proof_required_before_balance_recovery";
    analyticsOnlyRecoveryAllowed: false;
  };
  items: GumdropRecoveryQueueItem[];
  productTruthPolicy: {
    dryRunOnly: true;
    creditsOrDebitsUsers: false;
    backfillsTransactions: false;
    analyticsOnlyCanChangeBalance: false;
    requiresLedgerOrServerProofBeforeMoneyAction: true;
    exposesPii: false;
  };
};

export const TREASURY_TIMELINE_EVENT_MAP: TreasuryTimelineReconciliationReport["eventMap"] = [
  {
    eventType: "purchase",
    ledgerOwner: "transaction_ledger",
    analyticsEvidenceEvents: ["gumdrops_purchase_completed", "checkout_completed", "purchase"],
    productTruthRule: "Only server transaction and GumDrop ledger records can credit paid_gd or paid_bonus_gd.",
  },
  {
    eventType: "reward",
    ledgerOwner: "reward_record",
    analyticsEvidenceEvents: ["daily_reward_claimed", "task_reward_claimed", "onboarding_reward_claimed"],
    productTruthRule: "Reward analytics can corroborate; reward credits require reward ledger/source-of-funds truth.",
  },
  {
    eventType: "unlock_spend",
    ledgerOwner: "unlock_record",
    analyticsEvidenceEvents: ["drop_unwrapped", "unlock_content", "unlock_drop_success"],
    productTruthRule: "Unlock spend truth requires source-aware ledger split and entitlement/unlock record.",
  },
  {
    eventType: "creator_accrual",
    ledgerOwner: "gumdrop_ledger",
    analyticsEvidenceEvents: ["creator_experience_paid", "creator_revenue_accrued"],
    productTruthRule: "Creator accruals require creator ledger/entitlement truth; analytics is evidence only.",
  },
  {
    eventType: "admin_adjustment",
    ledgerOwner: "gumdrop_ledger",
    analyticsEvidenceEvents: ["admin_balance_adjusted", "admin_gumdrop_adjustment"],
    productTruthRule: "Admin adjustments require audited admin ledger rows and must not be inferred from telemetry.",
  },
  {
    eventType: "refund_void",
    ledgerOwner: "transaction_ledger",
    analyticsEvidenceEvents: ["payment_refund_evidence_seen", "refund"],
    productTruthRule: "Refund/void recovery requires provider/transaction reversal and original source bucket.",
  },
];

export type Ga4RecoveryEventMapping = {
  ga4EventName: string;
  canonicalEventName: string;
  confidence: Extract<LegacyRecoveryConfidenceLabel, "medium" | "directional" | "low" | "unknown">;
  objectType: AnalyticsObjectType | "unknown";
  productDomain: RecoveryProductDomain;
  commerceTruthRequiresLedger: boolean;
};

export const GA4_RECOVERY_EVENT_MAPPINGS: Ga4RecoveryEventMapping[] = [
  {
    ga4EventName: "page_view",
    canonicalEventName: "page_viewed",
    confidence: "medium",
    objectType: "page",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "screen_view",
    canonicalEventName: "page_viewed",
    confidence: "directional",
    objectType: "page",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "search",
    canonicalEventName: "search_submitted",
    confidence: "directional",
    objectType: "page",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "login",
    canonicalEventName: "auth_login_completed",
    confidence: "directional",
    objectType: "identity",
    productDomain: "identity_handoff",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "sign_up",
    canonicalEventName: "signup_completed",
    confidence: "directional",
    objectType: "identity",
    productDomain: "identity_handoff",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "purchase",
    canonicalEventName: "gumdrops_purchase_completed",
    confidence: "medium",
    objectType: "purchase",
    productDomain: "wallet_payment",
    commerceTruthRequiresLedger: true,
  },
  {
    ga4EventName: "refund",
    canonicalEventName: "payment_refund_evidence_seen",
    confidence: "low",
    objectType: "purchase",
    productDomain: "wallet_payment",
    commerceTruthRequiresLedger: true,
  },
  {
    ga4EventName: "unlock_drop_success",
    canonicalEventName: "drop_unwrapped",
    confidence: "low",
    objectType: "unlock",
    productDomain: "drop_unlock",
    commerceTruthRequiresLedger: true,
  },
];

export type Ga4RecoveryTimelineInput = {
  ga4EventName: string;
  ga4EventId?: string | null;
  occurredAt: string;
  importedAt?: string | null;
  userPseudoId?: string | null;
  sessionId?: string | null;
  pagePath?: string | null;
  objectId?: string | null;
  transactionId?: string | null;
  ledgerCorroborated?: boolean;
};

function readTimestamp(value: string | null | undefined) {
  if (!value) return new Date(0).toISOString();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(0).toISOString();
}

function stableTimelineId(source: RecoveryTimelineSource, sourceRecordId: string | null, eventName: string, timestamp: string) {
  return [
    "recovery",
    source,
    sourceRecordId ?? "unknown",
    eventName,
    timestamp,
  ].join(":");
}

function actorScopeFromEvent(event: Pick<CanonicalAnalyticsEvent, "actorType" | "identityLinkId">): RecoveryActorScope {
  if (event.identityLinkId) return "linked_person";
  if (event.actorType === "guest") return "guest";
  if (event.actorType === "user") return "signed_in_user";
  if (event.actorType === "creator") return "creator_role";
  if (event.actorType === "admin" || event.actorType === "owner_admin") return "admin_operator";
  if (event.actorType === "system") return "system";
  return "unknown";
}

function normalizeActorKey(input: {
  userId?: string | null;
  anonymousVisitorId?: string | null;
  sessionId?: string | null;
  actorType?: RecoveryActorScope | null;
}) {
  if (input.userId) return `user:${input.userId}`;
  if (input.anonymousVisitorId) return `guest:${input.anonymousVisitorId}`;
  if (input.sessionId) return `session:${input.sessionId}`;
  return `${input.actorType ?? "unknown"}:unknown`;
}

function timeBucket(timestampMs: number, windowMs: number) {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "unknown_time";
  return String(Math.floor(timestampMs / windowMs));
}

function factTimestampMs(fact: AnalyticsEventFactRecoveryInput) {
  return Number.isFinite(fact.timestamp) ? fact.timestamp : 0;
}

function entryTimestampMs(entry: RecoveryTimelineEntry) {
  const parsed = Date.parse(entry.timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function eventTypeFromTimelineEntry(entry: RecoveryTimelineEntry): TreasuryTimelineEventType | null {
  const text = `${entry.eventName} ${entry.productDomain} ${entry.corroboration.transactionId ?? ""} ${entry.corroboration.unlockId ?? ""}`.toLowerCase();
  if (/refund|void|reversal/u.test(text)) return "refund_void";
  if (/creator.*(paid|revenue|accrual)|creator_experience_paid/u.test(text)) return "creator_accrual";
  if (/admin.*(balance|adjust|gumdrop)|admin_gumdrop_adjustment/u.test(text)) return "admin_adjustment";
  if (/unlock|unwrap|drop_unwrapped/u.test(text)) return "unlock_spend";
  if (/reward|task|check.?in|onboarding/u.test(text)) return "reward";
  if (/purchase|checkout|payment|gumdrops_purchase_completed/u.test(text)) return "purchase";
  return null;
}

function treasuryLedgerMatchingKey(event: Pick<TreasuryLedgerRecoveryInput, "eventType" | "eventName" | "transactionId" | "ledgerId" | "actor" | "occurredAt">) {
  const timestampMs = Date.parse(event.occurredAt);
  return [
    event.eventType,
    event.eventName,
    event.transactionId ?? event.ledgerId,
    normalizeActorKey(event.actor),
    timeBucket(Number.isFinite(timestampMs) ? timestampMs : 0, 60_000),
  ].join("|");
}

function treasuryEvidenceMatchingKey(evidence: TreasuryTimelineEvidenceInput) {
  const entry = evidence.entry;
  const eventType = eventTypeFromTimelineEntry(entry) ?? "purchase";
  return [
    eventType,
    entry.eventName,
    entry.corroboration.transactionId
      ?? entry.corroboration.gumdropLedgerId
      ?? entry.corroboration.unlockId
      ?? entry.corroboration.rewardEventId
      ?? entry.sourceRecordId
      ?? entry.timelineId,
    normalizeActorKey(entry.actor),
    timeBucket(entryTimestampMs(entry), 60_000),
  ].join("|");
}

function treasuryFindingId(status: TreasuryTimelineReconciliationStatus, key: string) {
  return `treasury_timeline:${status}:${key.replace(/[^a-z0-9:_-]+/giu, "_").slice(0, 96)}`;
}

function emptyTreasurySummary(): TreasuryTimelineReconciliationReport["summary"] {
  return {
    ledger_confirmed: 0,
    analytics_correlated: 0,
    analytics_missing: 0,
    analytics_only_not_ledger: 0,
    ledger_missing_protected: 0,
    duplicate_risk: 0,
    source_bucket_mismatch: 0,
    ledgerEventCount: 0,
    timelineEvidenceCount: 0,
    productTruthEligibleCount: 0,
  };
}

function queueFindingKey(finding: Pick<TreasuryTimelineReconciliationFinding, "findingId" | "ledgerId" | "timelineId" | "status">) {
  return finding.ledgerId ?? finding.timelineId ?? finding.findingId ?? finding.status;
}

function queueTimeWindow(timestamp: string | null | undefined, basis: GumdropRecoveryQueueItem["timeWindow"]["basis"]) {
  const parsed = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return {
      startUtc: new Date(0).toISOString(),
      endUtc: new Date(0).toISOString(),
      basis: "unknown" as const,
    };
  }
  return {
    startUtc: new Date(parsed - 60_000).toISOString(),
    endUtc: new Date(parsed + 60_000).toISOString(),
    basis,
  };
}

function evidenceKindFromTimelineSource(source: RecoveryTimelineSource): GumdropRecoveryQueueEvidenceKind {
  if (source === "first_party_event_fact") return "first_party_event_fact";
  if (source === "ga4_evidence") return "ga4_evidence";
  if (source === "legacy_analytics" || source === "unknown_legacy") return "legacy_analytics";
  return "debug_evidence";
}

function queueConfidenceFromFinding(status: TreasuryTimelineReconciliationStatus): GumdropRecoveryQueueItem["confidence"] {
  if (status === "analytics_correlated" || status === "analytics_missing") return "high";
  if (status === "source_bucket_mismatch" || status === "duplicate_risk") return "medium";
  if (status === "ledger_missing_protected") return "low";
  return "unknown";
}

function requiredProofForFinding(finding: TreasuryTimelineReconciliationFinding) {
  if (finding.status === "source_bucket_mismatch") {
    return [
      "redacted treasury ledger row with source bucket",
      "server source-of-funds calculation or unlock spend split",
      "operator confirmation that analytics bucket mapping is diagnostic only",
    ];
  }
  if (finding.status === "duplicate_risk") {
    return [
      "idempotency receipt or unique ledger event id",
      "redacted duplicate event window",
      "operator confirmation before any aggregate repair",
    ];
  }
  if (finding.status === "ledger_missing_protected") {
    return [
      "server transaction id, GumDrop ledger id, unlock id, reward id, or creator ledger id",
      "source bucket proof from server truth",
      "manual operator approval after ledger proof is attached",
    ];
  }
  if (finding.status === "analytics_missing") {
    return [
      "no money proof needed because ledger already exists",
      "emitter/materializer evidence only if analytics repair is requested",
    ];
  }
  return ["redacted supporting evidence and owner review"];
}

function allowedActionForFinding(finding: TreasuryTimelineReconciliationFinding): GumdropRecoveryAllowedAction {
  if (finding.status === "analytics_correlated" || finding.status === "analytics_missing") return "attach_evidence_to_existing_ledger";
  if (finding.status === "ledger_missing_protected") return "reject_analytics_only_balance_recovery";
  if (finding.status === "analytics_only_not_ledger") return "reject_analytics_only_balance_recovery";
  return "manual_review_only";
}

function ledgerCorroborationForFinding(finding: TreasuryTimelineReconciliationFinding): GumdropRecoveryQueueItem["ledgerCorroboration"]["status"] {
  if (finding.status === "source_bucket_mismatch") return "source_bucket_mismatch";
  if (finding.status === "duplicate_risk") return "duplicate_risk";
  if (finding.ledgerId) return "ledger_present";
  if (finding.status === "analytics_only_not_ledger") return "not_required_non_money";
  return "ledger_missing";
}

function factMatchingKey(fact: AnalyticsEventFactRecoveryInput, windowMs: number) {
  return [
    fact.eventName,
    normalizeActorKey(fact),
    fact.sessionId ?? "no_session",
    fact.dropId ?? fact.pagePath ?? "no_object",
    timeBucket(factTimestampMs(fact), windowMs),
  ].join("|");
}

function entryMatchingKey(entry: RecoveryTimelineEntry, windowMs: number) {
  return [
    entry.eventName,
    normalizeActorKey(entry.actor),
    entry.actor.sessionId ?? "no_session",
    entry.corroboration.unlockId ?? entry.corroboration.transactionId ?? "no_object",
    timeBucket(entryTimestampMs(entry), windowMs),
  ].join("|");
}

function hasIdentity(entry: RecoveryTimelineEntry) {
  return Boolean(entry.actor.userId || entry.actor.anonymousVisitorId || entry.actor.sessionId || entry.actor.identityLinkId);
}

function classifySourceOnlyGap(entry: RecoveryTimelineEntry): EventFactTimelineGapClassification {
  if (!hasIdentity(entry)) return "identity_missing";
  if (entry.source === "ga4_evidence") return "ga4_only";
  if (entry.source === "legacy_analytics" || entry.source === "unknown_legacy") return "legacy_only";
  return "first_party_missing";
}

function reconciliationReason(classification: EventFactTimelineGapClassification) {
  if (classification === "first_party_present") return "First-party analytics_event_facts row is present and remains primary truth.";
  if (classification === "duplicate_candidate") return "Same actor/session/action/time window appears more than once; do not import duplicates.";
  if (classification === "timestamp_conflict") return "Event names and identity align but timestamps are outside the accepted duplicate window.";
  if (classification === "identity_missing") return "Timeline evidence lacks actor/session identity and cannot hydrate user metrics.";
  if (classification === "ga4_only") return "GA4 evidence can corroborate volume but cannot replace first-party event facts.";
  if (classification === "legacy_only") return "Legacy evidence remains recovery/archive evidence until first-party fact or owner review corroborates it.";
  return "No matching first-party event fact exists; classify as missing source, not zero.";
}

export function reconcileAnalyticsEventFactsWithRecoveryTimeline(input: {
  generatedAtUtc?: string;
  firstPartyEventFacts: AnalyticsEventFactRecoveryInput[];
  timelineEntries: RecoveryTimelineEntry[];
  sameActorSessionActionWindowMs?: number;
  timestampConflictWindowMs?: number;
}): EventFactTimelineReconciliationReport {
  const windowMs = input.sameActorSessionActionWindowMs ?? 60_000;
  const conflictWindowMs = input.timestampConflictWindowMs ?? 5 * 60_000;
  const factsById = new Map(input.firstPartyEventFacts.map((fact) => [fact.eventId, fact]));
  const factsByKey = new Map<string, AnalyticsEventFactRecoveryInput[]>();
  for (const fact of input.firstPartyEventFacts) {
    const key = factMatchingKey(fact, windowMs);
    factsByKey.set(key, [...(factsByKey.get(key) ?? []), fact]);
  }

  const matches: EventFactTimelineMatch[] = [];
  const matchedFactIds = new Set<string>();

  for (const entry of input.timelineEntries) {
    const explicitFactId = entry.corroboration.eventFactId ?? null;
    const exactFact = explicitFactId ? factsById.get(explicitFactId) : undefined;
    const key = entryMatchingKey(entry, windowMs);
    const keyMatches = factsByKey.get(key) ?? [];
    const matchedFact = exactFact ?? keyMatches[0];
    const duplicateCandidate = keyMatches.length > 1 || entry.classification === "duplicate_candidate";
    let gapClassification: EventFactTimelineGapClassification = matchedFact ? "first_party_present" : classifySourceOnlyGap(entry);

    if (matchedFact && duplicateCandidate) {
      gapClassification = "duplicate_candidate";
    } else if (!matchedFact) {
      const timestampConflict = input.firstPartyEventFacts.some((fact) => {
        const sameEvent = fact.eventName === entry.eventName;
        const sameActor = normalizeActorKey(fact) === normalizeActorKey(entry.actor);
        const delta = Math.abs(factTimestampMs(fact) - entryTimestampMs(entry));
        return sameEvent && sameActor && delta > windowMs && delta <= conflictWindowMs;
      });
      if (timestampConflict) gapClassification = "timestamp_conflict";
    }

    if (matchedFact) matchedFactIds.add(matchedFact.eventId);

    matches.push({
      matchingKey: key,
      firstPartyEventFactId: matchedFact?.eventId ?? null,
      timelineId: entry.timelineId,
      eventName: entry.eventName,
      gapClassification,
      duplicateCandidate,
      productTruthEligible: gapClassification === "first_party_present" && entry.source === "first_party_event_fact",
      reason: reconciliationReason(gapClassification),
    });
  }

  for (const fact of input.firstPartyEventFacts.filter((entry) => !matchedFactIds.has(entry.eventId))) {
    const key = factMatchingKey(fact, windowMs);
    const duplicateCandidate = (factsByKey.get(key) ?? []).length > 1;
    matches.push({
      matchingKey: key,
      firstPartyEventFactId: fact.eventId,
      timelineId: null,
      eventName: fact.eventName,
      gapClassification: duplicateCandidate ? "duplicate_candidate" : "first_party_present",
      duplicateCandidate,
      productTruthEligible: !duplicateCandidate,
      reason: reconciliationReason(duplicateCandidate ? "duplicate_candidate" : "first_party_present"),
    });
  }

  const count = (classification: EventFactTimelineGapClassification) =>
    matches.filter((entry) => entry.gapClassification === classification).length;

  return {
    reportKey: "analytics-event-facts-recovery-reconciliation",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    matchingRules: {
      exactEventFactIdWins: true,
      sameActorSessionActionWindowMs: windowMs,
      timestampConflictWindowMs: conflictWindowMs,
      missingSourceIsNotZero: true,
    },
    summary: {
      firstPartyFactCount: input.firstPartyEventFacts.length,
      timelineEntryCount: input.timelineEntries.length,
      firstPartyPresent: count("first_party_present"),
      legacyOnly: count("legacy_only"),
      ga4Only: count("ga4_only"),
      firstPartyMissing: count("first_party_missing"),
      identityMissing: count("identity_missing"),
      timestampConflict: count("timestamp_conflict"),
      duplicateCandidate: count("duplicate_candidate"),
      productTruthEligible: matches.filter((entry) => entry.productTruthEligible).length,
    },
    matches,
    productTruthPolicy: {
      firstPartyEventFactsPrimary: true,
      legacyCanOnlyCorroborate: true,
      ga4CanOnlyCorroborate: true,
      duplicateEventsNotImported: true,
      missingWindowNotZero: true,
    },
  };
}

export function reconcileTreasuryEventsWithRecoveryTimeline(input: {
  generatedAtUtc?: string;
  ledgerEvents: TreasuryLedgerRecoveryInput[];
  timelineEvidence: TreasuryTimelineEvidenceInput[];
}): TreasuryTimelineReconciliationReport {
  const findings: TreasuryTimelineReconciliationFinding[] = [];
  const evidenceByKey = new Map<string, TreasuryTimelineEvidenceInput[]>();
  const ledgerByKey = new Map<string, TreasuryLedgerRecoveryInput[]>();

  for (const evidence of input.timelineEvidence) {
    const key = treasuryEvidenceMatchingKey(evidence);
    evidenceByKey.set(key, [...(evidenceByKey.get(key) ?? []), evidence]);
  }
  for (const event of input.ledgerEvents) {
    const key = treasuryLedgerMatchingKey(event);
    ledgerByKey.set(key, [...(ledgerByKey.get(key) ?? []), event]);
  }

  const matchedEvidenceIds = new Set<string>();

  for (const ledgerEvent of input.ledgerEvents) {
    const key = treasuryLedgerMatchingKey(ledgerEvent);
    const evidenceMatches = evidenceByKey.get(key) ?? [];
    const duplicateLedger = (ledgerByKey.get(key) ?? []).length > 1;
    const firstEvidence = evidenceMatches[0];

    findings.push({
      findingId: treasuryFindingId("ledger_confirmed", key),
      status: "ledger_confirmed",
      eventType: ledgerEvent.eventType,
      ledgerId: ledgerEvent.ledgerId,
      timelineId: firstEvidence?.entry.timelineId ?? null,
      eventName: ledgerEvent.eventName,
      sourceBucket: ledgerEvent.sourceBucket,
      evidenceSourceBucket: firstEvidence?.expectedSourceBucket ?? null,
      productTruthAllowed: true,
      reason: "Server treasury ledger/source-of-funds record is the primary money truth.",
      nextAction: "Use analytics only as corroborating evidence; do not credit or debit from analytics.",
    });

    if (duplicateLedger || evidenceMatches.length > 1) {
      findings.push({
        findingId: treasuryFindingId("duplicate_risk", key),
        status: "duplicate_risk",
        eventType: ledgerEvent.eventType,
        ledgerId: ledgerEvent.ledgerId,
        timelineId: firstEvidence?.entry.timelineId ?? null,
        eventName: ledgerEvent.eventName,
        sourceBucket: ledgerEvent.sourceBucket,
        evidenceSourceBucket: firstEvidence?.expectedSourceBucket ?? null,
        productTruthAllowed: false,
        reason: "Multiple ledger/evidence rows share the same actor, action, object, and time bucket.",
        nextAction: "Review idempotency receipts and event dedupe before materializing aggregates.",
      });
    }

    if (firstEvidence) {
      matchedEvidenceIds.add(firstEvidence.entry.timelineId);
      const evidenceBucket = firstEvidence.expectedSourceBucket ?? ledgerEvent.sourceBucket;
      findings.push({
        findingId: treasuryFindingId("analytics_correlated", key),
        status: "analytics_correlated",
        eventType: ledgerEvent.eventType,
        ledgerId: ledgerEvent.ledgerId,
        timelineId: firstEvidence.entry.timelineId,
        eventName: ledgerEvent.eventName,
        sourceBucket: ledgerEvent.sourceBucket,
        evidenceSourceBucket: evidenceBucket,
        productTruthAllowed: false,
        reason: "Analytics evidence correlates to an existing treasury ledger row and can explain activity.",
        nextAction: "Keep ledger as money truth; use timeline evidence only for diagnostics or confidence.",
      });

      if (evidenceBucket !== ledgerEvent.sourceBucket) {
        findings.push({
          findingId: treasuryFindingId("source_bucket_mismatch", key),
          status: "source_bucket_mismatch",
          eventType: ledgerEvent.eventType,
          ledgerId: ledgerEvent.ledgerId,
          timelineId: firstEvidence.entry.timelineId,
          eventName: ledgerEvent.eventName,
          sourceBucket: ledgerEvent.sourceBucket,
          evidenceSourceBucket: evidenceBucket,
          productTruthAllowed: false,
          reason: "Timeline evidence source bucket differs from the server ledger source bucket.",
          nextAction: "Preserve paid/reward split from the ledger and review the analytics mapping.",
        });
      }
    } else {
      findings.push({
        findingId: treasuryFindingId("analytics_missing", key),
        status: "analytics_missing",
        eventType: ledgerEvent.eventType,
        ledgerId: ledgerEvent.ledgerId,
        timelineId: null,
        eventName: ledgerEvent.eventName,
        sourceBucket: ledgerEvent.sourceBucket,
        evidenceSourceBucket: null,
        productTruthAllowed: true,
        reason: "Ledger truth exists without matching analytics evidence; this is an analytics gap, not missing money.",
        nextAction: "Check emitter/materializer coverage. Do not reverse or backfill ledger rows from this gap.",
      });
    }
  }

  for (const evidence of input.timelineEvidence) {
    if (matchedEvidenceIds.has(evidence.entry.timelineId)) continue;
    const eventType = eventTypeFromTimelineEntry(evidence.entry);
    if (!eventType) continue;
    const key = treasuryEvidenceMatchingKey(evidence);
    const protectedMoneyDomain = evidence.entry.productDomain === "wallet_payment"
      || evidence.entry.productDomain === "gumdrop_economy"
      || eventType === "purchase"
      || eventType === "unlock_spend"
      || eventType === "creator_accrual"
      || eventType === "refund_void";
    findings.push({
      findingId: treasuryFindingId(protectedMoneyDomain ? "ledger_missing_protected" : "analytics_only_not_ledger", key),
      status: protectedMoneyDomain ? "ledger_missing_protected" : "analytics_only_not_ledger",
      eventType,
      ledgerId: null,
      timelineId: evidence.entry.timelineId,
      eventName: evidence.entry.eventName,
      sourceBucket: null,
      evidenceSourceBucket: evidence.expectedSourceBucket ?? null,
      productTruthAllowed: false,
      reason: protectedMoneyDomain
        ? "Analytics evidence references a protected money surface without a matching treasury ledger row."
        : "Analytics evidence has no matching ledger row and remains diagnostic-only.",
      nextAction: protectedMoneyDomain
        ? "Escalate for protected ledger/provider evidence review; do not create wallet truth from analytics."
        : "Use as source-only evidence or manual review context.",
    });
  }

  const summary = emptyTreasurySummary();
  summary.ledgerEventCount = input.ledgerEvents.length;
  summary.timelineEvidenceCount = input.timelineEvidence.length;
  for (const finding of findings) {
    summary[finding.status] += 1;
  }
  summary.productTruthEligibleCount = findings.filter((finding) => finding.status === "ledger_confirmed" && finding.productTruthAllowed).length;

  return {
    reportKey: "treasury-recovery-timeline-reconciliation",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    status: findings.some((finding) => finding.status === "ledger_missing_protected" || finding.status === "source_bucket_mismatch" || finding.status === "duplicate_risk") ? "review" : "pass",
    eventMap: TREASURY_TIMELINE_EVENT_MAP,
    summary,
    findings,
    productTruthPolicy: {
      treasuryLedgersPrimary: true,
      analyticsCanOnlyCorroborate: true,
      ga4CanCreditOrDebitGumdrops: false,
      legacyCanCreditOrDebitGumdrops: false,
      sourceBucketsMustMatch: true,
      noBalanceMutation: true,
      missingAnalyticsIsNotMissingMoney: true,
    },
  };
}

export function buildGumdropRecoveryQueue(input: {
  generatedAtUtc?: string;
  reconciliation: TreasuryTimelineReconciliationReport;
  ledgerEvents: TreasuryLedgerRecoveryInput[];
  timelineEvidence: TreasuryTimelineEvidenceInput[];
  capItems?: number;
}): GumdropRecoveryQueueReport {
  const ledgerById = new Map(input.ledgerEvents.map((entry) => [entry.ledgerId, entry]));
  const evidenceByTimelineId = new Map(input.timelineEvidence.map((entry) => [entry.entry.timelineId, entry]));
  const queueStatuses = new Set<TreasuryTimelineReconciliationStatus>([
    "analytics_missing",
    "analytics_only_not_ledger",
    "ledger_missing_protected",
    "duplicate_risk",
    "source_bucket_mismatch",
  ]);
  const seen = new Set<string>();
  const items: GumdropRecoveryQueueItem[] = [];

  for (const finding of input.reconciliation.findings) {
    if (!queueStatuses.has(finding.status)) continue;
    const stableKey = queueFindingKey(finding);
    if (seen.has(stableKey)) continue;
    seen.add(stableKey);

    const ledger = finding.ledgerId ? ledgerById.get(finding.ledgerId) : undefined;
    const evidence = finding.timelineId ? evidenceByTimelineId.get(finding.timelineId) : undefined;
    const timestamp = ledger?.occurredAt ?? evidence?.entry.timestamp ?? null;
    const actor = ledger?.actor ?? evidence?.entry.actor ?? {};
    const evidenceSources: GumdropRecoveryQueueItem["evidenceSources"] = [];

    if (ledger) {
      evidenceSources.push({
        evidenceId: ledger.ledgerId,
        kind: "treasury_ledger",
        source: TREASURY_TIMELINE_EVENT_MAP.find((entry) => entry.eventType === ledger.eventType)?.ledgerOwner ?? "gumdrop_ledger",
        productTruthAllowed: true,
        note: "Server ledger/source-of-funds row is the only balance-affecting truth.",
      });
    }
    if (evidence) {
      evidenceSources.push({
        evidenceId: evidence.entry.timelineId,
        kind: evidenceKindFromTimelineSource(evidence.entry.source),
        source: evidence.entry.source,
        productTruthAllowed: false,
        note: "Timeline evidence is diagnostic/corroborating and cannot credit or debit GumDrops.",
      });
    }

    items.push({
      recoveryId: `gumdrop_recovery:${finding.status}:${stableKey.replace(/[^a-z0-9:_-]+/giu, "_").slice(0, 96)}`,
      actor: {
        actorScope: evidence?.entry.actor.actorType ?? (actor.userId ? "signed_in_user" : actor.anonymousVisitorId ? "guest" : "unknown"),
        userId: actor.userId ?? null,
        anonymousVisitorId: actor.anonymousVisitorId ?? null,
        sessionId: actor.sessionId ?? null,
        identityLinkId: evidence?.entry.actor.identityLinkId ?? null,
      },
      timeWindow: queueTimeWindow(timestamp, ledger ? "ledger_occurred_at" : evidence ? "timeline_timestamp" : "unknown"),
      suspectedAction: finding.eventType,
      eventName: finding.eventName,
      amountGd: ledger?.amountGd ?? null,
      sourceBucket: finding.sourceBucket ?? finding.evidenceSourceBucket ?? null,
      evidenceSources,
      confidence: queueConfidenceFromFinding(finding.status),
      ledgerCorroboration: {
        status: ledgerCorroborationForFinding(finding),
        ledgerId: finding.ledgerId,
        sourceBucket: finding.sourceBucket,
        serverProofRequiredForMoneyAction: true,
      },
      requiredHumanProof: requiredProofForFinding(finding),
      allowedRecoveryAction: allowedActionForFinding(finding),
      forbiddenAction: "Do not credit, debit, backfill, unlock, refund, or adjust balances from analytics/GA4/legacy evidence alone.",
    });
  }

  const cappedItems = items.slice(0, input.capItems ?? 50);
  const analyticsOnlyRejectedCount = cappedItems.filter((item) => (
    !item.ledgerCorroboration.ledgerId
    && item.evidenceSources.length > 0
    && item.evidenceSources.every((source) => source.kind !== "treasury_ledger")
    && item.allowedRecoveryAction === "reject_analytics_only_balance_recovery"
  )).length;

  return {
    reportKey: "gumdrop-recovery-queue",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    status: cappedItems.some((item) => item.ledgerCorroboration.status !== "ledger_present") ? "review" : "pass",
    summary: {
      queueItemCount: cappedItems.length,
      ledgerProofRequiredCount: cappedItems.filter((item) => item.ledgerCorroboration.status === "ledger_missing").length,
      analyticsOnlyRejectedCount,
      duplicateRiskCount: cappedItems.filter((item) => item.ledgerCorroboration.status === "duplicate_risk").length,
      sourceBucketMismatchCount: cappedItems.filter((item) => item.ledgerCorroboration.status === "source_bucket_mismatch").length,
      moneyAffectingRecoveryAllowedCount: 0,
    },
    schema: {
      requiredFields: [
        "recoveryId",
        "actor",
        "timeWindow",
        "suspectedAction",
        "eventName",
        "evidenceSources",
        "confidence",
        "ledgerCorroboration",
        "requiredHumanProof",
        "allowedRecoveryAction",
        "forbiddenAction",
      ],
      moneyTruthRule: "ledger_or_server_proof_required_before_balance_recovery",
      analyticsOnlyRecoveryAllowed: false,
    },
    items: cappedItems,
    productTruthPolicy: {
      dryRunOnly: true,
      creditsOrDebitsUsers: false,
      backfillsTransactions: false,
      analyticsOnlyCanChangeBalance: false,
      requiresLedgerOrServerProofBeforeMoneyAction: true,
      exposesPii: false,
    },
  };
}

export function validateGumdropRecoveryQueue(report: GumdropRecoveryQueueReport): string[] {
  const failures: string[] = [];
  if (report.productTruthPolicy.creditsOrDebitsUsers || report.productTruthPolicy.backfillsTransactions) {
    failures.push("GumDrop recovery queue must remain dry-run and must not credit/debit or backfill transactions.");
  }
  if (report.productTruthPolicy.analyticsOnlyCanChangeBalance || report.schema.analyticsOnlyRecoveryAllowed) {
    failures.push("Analytics-only recovery must never be allowed to change GumDrop balances.");
  }
  if (report.summary.moneyAffectingRecoveryAllowedCount !== 0) {
    failures.push("Queue summary cannot allow money-affecting recovery actions.");
  }

  for (const item of report.items) {
    const hasLedgerEvidence = item.evidenceSources.some((source) => source.kind === "treasury_ledger");
    const analyticsOnly = item.evidenceSources.length > 0 && !hasLedgerEvidence;
    if (analyticsOnly && item.allowedRecoveryAction !== "reject_analytics_only_balance_recovery") {
      failures.push(`${item.recoveryId} is analytics-only and must reject balance recovery.`);
    }
    if (analyticsOnly && item.ledgerCorroboration.status !== "ledger_missing" && item.ledgerCorroboration.status !== "not_required_non_money") {
      failures.push(`${item.recoveryId} analytics-only item has invalid ledger corroboration status.`);
    }
    if (!item.ledgerCorroboration.serverProofRequiredForMoneyAction) {
      failures.push(`${item.recoveryId} must require server proof before any money action.`);
    }
    if (!item.forbiddenAction.toLowerCase().includes("analytics")) {
      failures.push(`${item.recoveryId} must explicitly forbid analytics-only balance recovery.`);
    }
  }

  return failures;
}

export function inferRecoveryProductDomain(eventName: string, objectType?: string | null): RecoveryProductDomain {
  const text = `${eventName} ${objectType ?? ""}`.toLowerCase();
  if (/paypal|payment|purchase|checkout|transaction/u.test(text)) return "wallet_payment";
  if (/gumdrop|reward|balance|daily_task|task_completed/u.test(text)) return "gumdrop_economy";
  if (/unlock|drop_content|entitlement/u.test(text)) return "drop_unlock";
  if (/page|view|watch|click|search|notification/u.test(text)) return "telemetry_behavior";
  if (/identity|login|signup|session/u.test(text)) return "identity_handoff";
  if (/support|bug_report/u.test(text)) return "support_recovery";
  if (/admin|debug/u.test(text)) return "admin_debug";
  if (/task|reward/u.test(text)) return "daily_rewards";
  return "unknown";
}

export function getGa4RecoveryEventMapping(ga4EventName: string): Ga4RecoveryEventMapping {
  const normalized = ga4EventName.trim().toLowerCase();
  return GA4_RECOVERY_EVENT_MAPPINGS.find((entry) => entry.ga4EventName === normalized) ?? {
    ga4EventName: normalized || "unknown",
    canonicalEventName: normalized || "unknown_ga4_event",
    confidence: "unknown",
    objectType: "unknown",
    productDomain: "unknown",
    commerceTruthRequiresLedger: false,
  };
}

export function sourceToRecoveryClassification(source: RecoveryTimelineSource, confidence: RecoveryConfidence): RecoveryTimelineClassification {
  if (source === "first_party_event_fact" || source === "transaction_ledger" || source === "gumdrop_ledger" || source === "unlock_record" || source === "reward_record") {
    return "canonical";
  }
  if (source === "ga4_evidence") return "corroborating_evidence";
  if (confidence === "low" || confidence === "directional") return "weak_match";
  if (confidence === "unknown" || source === "unknown_legacy") return "unknown_legacy";
  return "corroborating_evidence";
}

export function classifyRecoveryEligibility(input: {
  source: RecoveryTimelineSource;
  productDomain: RecoveryProductDomain;
  classification: RecoveryTimelineClassification;
  corroboration: RecoveryCorroboration;
}): RecoveryTruthEligibility {
  if (input.classification === "rejected") return "rejected";
  if (input.source === "ga4_evidence" || input.source === "legacy_analytics" || input.source === "unknown_legacy") {
    if (input.productDomain === "wallet_payment" || input.productDomain === "gumdrop_economy") {
      return input.corroboration.treasuryLedgerCorroborated
        ? "manual_review_required"
        : "ledger_corroboration_required";
    }
    return input.classification === "weak_match" || input.classification === "unknown_legacy"
      ? "manual_review_required"
      : "evidence_only";
  }
  if (input.productDomain === "wallet_payment" || input.productDomain === "gumdrop_economy") {
    return input.corroboration.treasuryLedgerCorroborated
      ? "product_truth_eligible"
      : "ledger_corroboration_required";
  }
  return input.classification === "canonical" ? "product_truth_eligible" : "evidence_only";
}

export function buildRecoveryTimelineEntryFromCanonicalEvent(
  event: CanonicalAnalyticsEvent,
  input: {
    source?: RecoveryTimelineSource;
    sourceRecordId?: string | null;
    classification?: RecoveryTimelineClassification;
    corroboration?: Partial<RecoveryCorroboration>;
    notes?: string[];
  } = {},
): RecoveryTimelineEntry {
  const source = input.source ?? "first_party_event_fact";
  const timestamp = readTimestamp(event.occurredAt);
  const productDomain = inferRecoveryProductDomain(event.eventName, event.objectType);
  const eventConfidence: RecoveryConfidence =
    source === "first_party_event_fact"
      ? "canonical"
      : source === "transaction_ledger" || source === "gumdrop_ledger" || source === "unlock_record" || source === "reward_record"
        ? "ledger_confirmed"
        : event.legacyConfidence ?? "unknown";
  const classification = input.classification ?? sourceToRecoveryClassification(source, eventConfidence);
  const corroboration: RecoveryCorroboration = {
    transactionId: input.corroboration?.transactionId ?? (event.objectType === "purchase" ? event.objectId : null),
    gumdropLedgerId: input.corroboration?.gumdropLedgerId ?? null,
    unlockId: input.corroboration?.unlockId ?? (event.objectType === "unlock" ? event.objectId : null),
    rewardEventId: input.corroboration?.rewardEventId ?? null,
    eventFactId: input.corroboration?.eventFactId ?? event.eventId,
    sourceCount: input.corroboration?.sourceCount ?? 1,
    treasuryLedgerCorroborated: input.corroboration?.treasuryLedgerCorroborated
      ?? Boolean(input.corroboration?.transactionId || input.corroboration?.gumdropLedgerId || (source === "transaction_ledger" || source === "gumdrop_ledger")),
  };

  return {
    timelineId: stableTimelineId(source, input.sourceRecordId ?? event.eventId, event.eventName, timestamp),
    source,
    sourceRecordId: input.sourceRecordId ?? event.eventId,
    timestamp,
    eventName: event.eventName,
    actor: {
      actorType: actorScopeFromEvent(event),
      userId: event.userId,
      anonymousVisitorId: event.anonymousVisitorId,
      sessionId: event.sessionId,
      identityLinkId: event.identityLinkId,
    },
    identityConfidence: event.identityLinkId || event.userId || event.anonymousVisitorId || event.sessionId ? eventConfidence : "unknown",
    eventConfidence,
    productDomain,
    classification,
    recoveryEligibility: classifyRecoveryEligibility({ source, productDomain, classification, corroboration }),
    missingVsZeroState: "source_present",
    corroboration,
    evidenceLabels: [
      ...(source === "ga4_evidence" ? ["ga4_evidence_only" as const] : []),
      ...(source === "legacy_analytics" || source === "unknown_legacy" ? ["legacy_directional_only" as const] : []),
      ...(classification === "canonical" ? ["source_truth" as const] : ["corroborating_evidence" as const]),
      ...(classification === "weak_match" || classification === "unknown_legacy" ? ["manual_review" as const] : []),
    ],
    notes: input.notes ?? [],
  };
}

export function buildRecoveryTimelineEntryFromLegacyRecord(record: LegacyRecoveredEventRecord): RecoveryTimelineEntry {
  return buildRecoveryTimelineEntryFromCanonicalEvent(record.canonicalEvent, {
    source: record.legacySource.startsWith("ga4") ? "ga4_evidence" : "legacy_analytics",
    sourceRecordId: record.legacyId,
    classification: sourceToRecoveryClassification(
      record.legacySource.startsWith("ga4") ? "ga4_evidence" : "legacy_analytics",
      record.mappingConfidence,
    ),
    notes: [
      "Legacy recovered records are dry-run evidence and cannot overwrite canonical product truth.",
      ...record.mappingWarnings,
    ],
  });
}

export function buildRecoveryTimelineEntryFromGa4Event(input: Ga4RecoveryTimelineInput): RecoveryTimelineEntry {
  const mapping = getGa4RecoveryEventMapping(input.ga4EventName);
  const occurredAt = readTimestamp(input.occurredAt);
  const event = createCanonicalAnalyticsEvent({
    eventId: `ga4:${input.ga4EventId ?? mapping.ga4EventName}:${occurredAt}`,
    eventName: mapping.canonicalEventName,
    occurredAt,
    receivedAt: input.importedAt ? readTimestamp(input.importedAt) : occurredAt,
    actorType: input.userPseudoId || input.sessionId ? "guest" as AnalyticsActorType : "unknown",
    anonymousVisitorId: input.userPseudoId ?? null,
    sessionId: input.sessionId ?? null,
    source: "ga4_daily",
    consentState: "unknown",
    route: input.pagePath ?? null,
    objectType: mapping.objectType,
    objectId: input.objectId ?? input.transactionId ?? null,
    legacySource: "ga4_imported_sample",
    legacyId: input.ga4EventId ?? null,
    legacyConfidence: mapping.confidence,
    mappingWarnings: [
      "GA4 imported samples are external evidence only.",
      ...(mapping.commerceTruthRequiresLedger ? ["Commerce, GumDrop, unlock, and entitlement recovery requires first-party ledger/source corroboration."] : []),
    ],
  });

  const entry = buildRecoveryTimelineEntryFromCanonicalEvent(event, {
    source: "ga4_evidence",
    sourceRecordId: input.ga4EventId ?? null,
    classification: mapping.commerceTruthRequiresLedger && input.ledgerCorroborated !== true
      ? "rejected"
      : sourceToRecoveryClassification("ga4_evidence", mapping.confidence),
    corroboration: {
      transactionId: input.transactionId ?? null,
      sourceCount: 1,
      treasuryLedgerCorroborated: input.ledgerCorroborated === true,
    },
    notes: [
      `GA4 ${mapping.ga4EventName} maps to ${mapping.canonicalEventName} as ${mapping.confidence} confidence evidence.`,
      "Do not use GA4 evidence to credit GumDrops, unlock content, repair balances, or replace first-party analytics.",
    ],
  });

  return {
    ...entry,
    productDomain: mapping.productDomain,
    recoveryEligibility: classifyRecoveryEligibility({
      source: entry.source,
      productDomain: mapping.productDomain,
      classification: entry.classification,
      corroboration: entry.corroboration,
    }),
  };
}

export function validateRecoveryTimelineEntries(entries: RecoveryTimelineEntry[]): RecoveryTimelineValidationResult {
  const findings: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.timelineId)) {
      findings.push(`duplicate timelineId: ${entry.timelineId}`);
    }
    seen.add(entry.timelineId);

    if (entry.source === "ga4_evidence" && entry.recoveryEligibility === "product_truth_eligible") {
      findings.push(`${entry.timelineId}: GA4 evidence cannot be product_truth_eligible`);
    }
    if ((entry.source === "legacy_analytics" || entry.source === "unknown_legacy") && entry.recoveryEligibility === "product_truth_eligible") {
      findings.push(`${entry.timelineId}: legacy evidence cannot directly be product_truth_eligible`);
    }
    if (
      (entry.productDomain === "wallet_payment" || entry.productDomain === "gumdrop_economy")
      && entry.recoveryEligibility === "product_truth_eligible"
      && !entry.corroboration.treasuryLedgerCorroborated
    ) {
      findings.push(`${entry.timelineId}: payment/GumDrop timeline entry lacks treasury ledger corroboration`);
    }
    if (entry.missingVsZeroState !== "source_present" && entry.classification === "canonical") {
      findings.push(`${entry.timelineId}: canonical entries cannot claim missing source state`);
    }
  }

  return {
    ok: findings.length === 0,
    findings,
  };
}
