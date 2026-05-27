import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import { normalizeGlobalUserMetric } from "@/lib/analytics/global-user-dedupe-engine";
import { PERSON_METRIC_DEFINITIONS, type PersonMetricDefinition } from "@/lib/analytics/person-metrics-contract";
import type { BehavioralEventFact } from "@/lib/behavioral/event-fact-contract";
import type { UserJourneyEvent } from "@/lib/behavioral/user-journey-contract";
import {
  buildCreatorEntitlementDebugVisibility,
  type CreatorEntitlementRecord,
} from "@/lib/creator-monetization/creator-entitlement-contract";
import type { CentralCostSignal } from "@/lib/product-integrity/central-normalizer-contract";
import type { InterpretiveBrainFinding } from "@/lib/product-integrity/interpretive-brain-contract";
import type { FormalEvidenceCategory } from "@/lib/release-readiness/final-release-readiness";
import type { CreatorSettings, Transaction, UserProfile } from "@/types/db";
import type { LegacyEventRecoveryCandidate } from "@/lib/legacy/legacy-event-recovery-contract";

export const CANONICAL_TEST_TIMESTAMP = "2026-05-27T00:00:00.000Z";
export const CANONICAL_TEST_TIMESTAMP_MS = Date.parse(CANONICAL_TEST_TIMESTAMP);

export function buildCanonicalUserFixture(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "test-user-1",
    email: null,
    displayName: "Test User",
    username: "test_user_1",
    photoURL: null,
    role: "user",
    gumDropsBalance: 120,
    gumDropsPurchasedBalance: 100,
    gumDropsRewardBalance: 20,
    unlockedContent: [],
    createdAt: CANONICAL_TEST_TIMESTAMP_MS,
    status: "active",
    onboardingCompleted: true,
    ...overrides,
  };
}

export function buildCanonicalCreatorFixture(overrides: Partial<UserProfile> = {}): UserProfile {
  return buildCanonicalUserFixture({
    uid: "test-creator-1",
    displayName: "Test Creator",
    username: "test_creator_1",
    role: "creator",
    isVerified: true,
    creatorSettings: buildCanonicalCreatorSettingsFixture(),
    ...overrides,
  });
}

export function buildCanonicalCreatorSettingsFixture(overrides: Partial<CreatorSettings> = {}): CreatorSettings {
  return {
    messagingEnabled: true,
    broadcastsEnabled: true,
    subscriptionsEnabled: true,
    bookingsEnabled: false,
    customRequestsEnabled: false,
    subscriptionPriceGd: 100,
    phoneRatePerMinuteGd: 0,
    videoRatePerMinuteGd: 0,
    bookingMinimumMinutes: 15,
    videoSubscriberDiscountPercent: 0,
    chatFreeForSubscribers: true,
    requestCategories: [],
    availabilityTimezone: "America/Chicago",
    availabilityWindows: [],
    ...overrides,
  };
}

export function buildCanonicalEventEnvelopeFixture(overrides: Partial<CanonicalEventEnvelope> = {}): CanonicalEventEnvelope {
  return {
    eventId: "test-event-1",
    eventName: "home_viewed",
    eventVersion: 1,
    timestamp: CANONICAL_TEST_TIMESTAMP,
    featureId: "home",
    surface: "homepage",
    actorKind: "signed_in_user",
    identityState: "logged_in_linked_guest",
    identityConfidence: "exact",
    consentMode: "minimal_analytics",
    sessionId: "test-session-1",
    guestId: "test-guest-1",
    userRef: { kind: "user", id: "test-user-1" },
    linkId: "test-link-1",
    source: "client",
    materializerLane: "person_metrics.sessions",
    debugVisibility: "debug_visible",
    scoreImpact: "evidence_completeness",
    privacyClass: "minimal_product",
    metadata: { fixture: true },
    pipelineStatus: "normal",
    includeInUserBehavior: true,
    ...overrides,
  };
}

export function buildCanonicalEventFactFixture(overrides: Partial<BehavioralEventFact> = {}): BehavioralEventFact {
  const dedupeDecision = normalizeGlobalUserMetric({
    eventId: "test-event-1",
    sessionId: "test-session-1",
    objectId: "home",
    timestampMs: CANONICAL_TEST_TIMESTAMP_MS,
    guestId: "test-guest-1",
    userId: "test-user-1",
    linkedPersonId: "test-user-1",
    linkId: "test-link-1",
    eventName: "home_viewed",
    featureId: "home",
    surface: "homepage",
    identityState: "logged_in_linked_guest",
    identityConfidence: "exact",
    dedupeScope: "event",
  });
  return {
    eventId: "test-event-1",
    userId: "test-user-1",
    actorUserId: "test-user-1",
    eventName: "home_viewed",
    rawEventName: "home_viewed",
    normalizedAction: "home_viewed",
    timestampMs: CANONICAL_TEST_TIMESTAMP_MS,
    route: "/",
    pagePath: "/",
    sourceComponent: "canonical-test-factories",
    entityType: "page",
    entityId: "home",
    source: "client",
    sourceTruth: "canonical",
    sourceReliability: 1,
    metricEligible: true,
    metricExclusionReason: "",
    confidence: 1,
    dedupeKey: dedupeDecision.dedupeKey,
    dedupeScope: dedupeDecision.dedupeScope,
    dedupeDecision,
    globalUserParity: dedupeDecision.globalUserParity,
    identityConfidence: "exact",
    ...overrides,
  };
}

export function buildCanonicalPersonMetricFixture(overrides: Partial<PersonMetricDefinition> = {}): PersonMetricDefinition {
  return {
    ...PERSON_METRIC_DEFINITIONS[0],
    ...overrides,
  };
}

export function buildCanonicalJourneyEventFixture(overrides: Partial<UserJourneyEvent> = {}): UserJourneyEvent {
  return {
    journeyEventId: "test-journey-1",
    eventId: "test-event-1",
    sessionId: "test-session-1",
    linkedPersonId: "test-user-1",
    actorKind: "signed_in_user",
    identityState: "logged_in_linked_guest",
    identityConfidence: "exact",
    timestamp: CANONICAL_TEST_TIMESTAMP,
    route: "/",
    surface: "homepage",
    featureId: "home",
    action: "home_viewed",
    objectType: "page",
    objectId: "home",
    durationMs: 0,
    activeMs: 0,
    sourceEventName: "home_viewed",
    previousJourneyEventId: null,
    nextExpectedActions: ["signup_started"],
    conversionTag: "landing_viewed",
    failureTag: null,
    confidence: 1,
    privacyClass: "safe_summary",
    ...overrides,
  };
}

export function buildCanonicalGumDropLedgerFixture(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "test-transaction-1",
    userId: "test-user-1",
    amount: 100,
    type: "purchase_currency",
    description: "Canonical paid GumDrop fixture",
    timestamp: CANONICAL_TEST_TIMESTAMP_MS,
    timestampMs: CANONICAL_TEST_TIMESTAMP_MS,
    balanceBefore: 0,
    balanceAfter: 100,
    deliveredGumDrops: 100,
    paidGumDrops: 100,
    bonusGumDrops: 0,
    status: "completed",
    verifiedServerSide: true,
    ledgerSource: "purchased",
    ...overrides,
  };
}

export function buildCanonicalWalletFixture(overrides: Partial<UserProfile> = {}) {
  return buildCanonicalUserFixture(overrides);
}

export function buildCanonicalEntitlementFixture(overrides: Partial<CreatorEntitlementRecord> = {}): CreatorEntitlementRecord {
  return {
    entitlementId: "test-entitlement-1",
    entitlementType: "drop_unlock",
    creatorId: "test-creator-1",
    userId: "test-user-1",
    sourceFeature: "drop_unlock",
    sourceTransactionId: "test-transaction-1",
    sourceOfFunds: "paid_gumdrops",
    gdAmount: 100,
    revenueCents: null,
    accessStartAt: CANONICAL_TEST_TIMESTAMP_MS,
    accessEndAt: null,
    status: "granted",
    confidence: "verified",
    revenueConfidence: "unavailable",
    sourceTruth: "server_unlock",
    debugVisibility: buildCreatorEntitlementDebugVisibility(),
    mismatchReasons: [],
    ...overrides,
  };
}

export function buildCanonicalDebugFindingFixture(overrides: Partial<InterpretiveBrainFinding> = {}): InterpretiveBrainFinding {
  return {
    findingType: "failure_cause",
    findingId: "test-finding-1",
    bodySystem: "telemetry_behavioral_intelligence",
    severity: "p2",
    actionability: "evidence_required",
    rootCause: "runtime_sample_missing",
    evidence: ["source-only fixture evidence"],
    scoreDimension: "evidenceCompleteness",
    estimatedPointImpact: 0,
    owner: "test-hardening",
    nextAction: {
      actionId: "test-action-1",
      action: "Use runtime evidence before claiming runtime proof.",
      validator: "check:test-fixture-inventory",
    },
    blockedBy: ["runtime proof"],
    confidence: "weak",
    ...overrides,
  } as InterpretiveBrainFinding;
}

export function buildCanonicalReleaseEvidenceFixture(overrides: Partial<FormalEvidenceCategory> = {}): FormalEvidenceCategory {
  return {
    category: "source-only test fixture evidence",
    status: "source_confidence_only",
    artifactPath: "agent/state/test-fixture-inventory.generated.json",
    currentHead: "test-head",
    generatedAtUtc: CANONICAL_TEST_TIMESTAMP,
    owner: "test-hardening",
    blocksBetaExit: false,
    blocksScoreOnly: false,
    nextExactAction: "Attach formal evidence before clearing release gates.",
    whatItDoesNotProve: "Does not prove deployed runtime, provider, billing, production admin truth, or operator visual QA.",
    ...overrides,
  };
}

export function buildCanonicalCostFindingFixture(overrides: Partial<CentralCostSignal> = {}): CentralCostSignal {
  return {
    costClass: "batched_materializer",
    costGuard: "batched_summary_first",
    providerCallRequired: false,
    nextAction: "Keep test harnesses source-only and provider-call-free.",
    ...overrides,
  };
}

export function buildCanonicalLegacyRecoveryCandidateFixture(overrides: Partial<LegacyEventRecoveryCandidate> = {}): LegacyEventRecoveryCandidate {
  return {
    legacyEventId: "legacy-test-event-1",
    occurredAt: CANONICAL_TEST_TIMESTAMP,
    domain: "page_session",
    action: "normalize_candidate",
    identityConfidence: "weak",
    consentAssumption: "inferred_minimal",
    duplicateRisk: "low",
    normalizedEnvelopeCandidate: buildCanonicalEventEnvelopeFixture({
      eventId: "legacy-test-event-1",
      source: "legacy",
      identityConfidence: "weak",
    }),
    dryRunOnly: true,
    canMutateProduction: false,
    manualReviewReason: null,
    boundaryReason: "dry_run_only_no_live_backfill",
    ...overrides,
  };
}

export const CANONICAL_TEST_FACTORY_NAMES = [
  "buildCanonicalUserFixture",
  "buildCanonicalCreatorFixture",
  "buildCanonicalEventEnvelopeFixture",
  "buildCanonicalEventFactFixture",
  "buildCanonicalPersonMetricFixture",
  "buildCanonicalJourneyEventFixture",
  "buildCanonicalGumDropLedgerFixture",
  "buildCanonicalWalletFixture",
  "buildCanonicalEntitlementFixture",
  "buildCanonicalDebugFindingFixture",
  "buildCanonicalReleaseEvidenceFixture",
  "buildCanonicalCostFindingFixture",
  "buildCanonicalLegacyRecoveryCandidateFixture",
] as const;
