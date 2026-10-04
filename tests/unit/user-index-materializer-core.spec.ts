import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: null }));

import { ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION } from "@/lib/analytics/identity-link-contract";
import { createEmptyPersonMetricCounts } from "@/lib/analytics/person-metrics-contract";
import type { RuntimeFact } from "@/lib/runtime-facts/runtime-fact-contract";
import { mapRuntimeFactToBehavioralTimelineFact } from "@/lib/server/behavioral-timeline-mapper";
import { matchApiCostContract } from "@/lib/server/api-cost-contract";
import {
  buildUserIndexMaterializerRequests,
  partitionIdentityLineagesByOwnerVersion,
  resolveUserIndexMaterializerConsumerLimits,
  resolveUserIndexMaterializerMode,
  resolveUserIndexMaterializerSourceFingerprint,
} from "@/lib/server/user-index-materializer";
import {
  buildNextUserIndexMaterializerActivationState,
  coalesceUserIndexMaterializerOutboxRequest,
  computeUserIndexMaterializerRetryDelayMs,
  deriveUserIndexMaterializerWindowReceipt,
  isUserIndexMaterializerLeasePublishable,
  isUserIndexPublicationBundleBound,
  publishUserIndexMaterializerBundle,
  resolveUserIndexMaterializerClaim,
  resolveUserIndexMaterializerFailure,
  withUserIndexMaterializerExpiration,
} from "@/lib/server/user-index-writer";
import {
  canonicalizeUserIndexFactTarget,
  normalizeFactsForUserIndexMaterialization,
  type UserIndexMaterializerFact,
} from "@/lib/user-indexes/user-index-normalizer";
import {
  isUserIndexMaterializerActivationReady,
  USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
  USER_INDEX_MATERIALIZER_MAX_ATTEMPTS,
  USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
  USER_INDEX_MATERIALIZER_MAX_LINEAGES_PER_QUERY,
  USER_INDEX_MATERIALIZER_MAX_LINKED_GUEST_SUBJECTS,
  USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
  USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS,
  USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE,
  USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS,
  type IdentityLineageIndex,
  type UserIndexMaterializerWindowReceipt,
  type UserIndexPublicationBundle,
} from "@/lib/user-indexes/user-tracking-index-contract";

function fact(input: Partial<UserIndexMaterializerFact> = {}): UserIndexMaterializerFact {
  return {
    factId: "fact_1",
    actorType: "user",
    actorUserId: "user_1",
    sessionId: "session_1",
    normalizedAction: "drop_viewed",
    eventName: "drop_viewed",
    timestampMs: 1_000,
    route: "/drops/drop_1",
    sourceComponent: "test",
    surface: "user",
    target: { dropId: "drop_1" },
    sourceTruth: "client",
    sourceReliability: 0.8,
    consentState: "granted",
    requestConsentAdmission: {version: admissionVersion, consentMode: "full_behavioral"},
    includeInGlobalEvents: true,
    includeInPersonMetrics: true,
    metricEligible: true,
    confidenceInputs: {
      schemaComplete: true,
      hasActor: true,
      hasTargetWhenRequired: true,
      hasSession: true,
      hasServerTruth: false,
    },
    ...input,
  };
}

function runtimeFact(input: Partial<RuntimeFact> = {}): RuntimeFact {
  return {
    runtimeFactVersion: "runtime_fact_v1",
    eventId: "event_1",
    rawEventName: "drop_viewed",
    canonicalEventName: "drop_viewed",
    normalizedAction: "drop_viewed",
    metricFamily: "drop",
    actorLane: "signed_in_user",
    actor: {
      actorType: "user",
      actorUserId: "user_1",
      actorCreatorId: "",
      actorAdminId: "",
      anonymousVisitorId: "guest_1",
      sessionId: "session_1",
      identityLinkId: "link_1",
    },
    target: {
      targetUserId: "",
      targetCreatorId: "",
      targetDropId: "drop_1",
      targetFileId: "",
      targetThreadId: "",
      transactionId: "",
    },
    route: "/drops/drop_1",
    source_component: "test",
    sourceTruth: "client",
    confidence: 0.8,
    timestampMs: 1_000,
    performedAs: "",
    projectionMode: "",
    includeInUserBehavior: true,
    includeInAdminAnalytics: true,
    includeInGlobalEvents: true,
    adminExcludedCount: 0,
    systemExcludedCount: 0,
    metricEligible: true,
    metricExclusionReason: "",
    sourceCollection: "analytics_event_facts",
    issueCodes: [],
    ...input,
  };
}

function lineage(input: Partial<IdentityLineageIndex> = {}): IdentityLineageIndex {
  return {
    identityLinkId: "link_1",
    ownerKeyVersion: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
    userId: "user_1",
    anonymousVisitorId: "guest_1",
    sessionIds: ["session_1"],
    linkedAtMs: 900,
    consentState: "granted",
    consentMode: "full_behavioral",
    mergeAllowed: true,
    personLevelBehaviorAllowed: true,
    confidence: 1,
    linkageConfidenceSource: "full_behavioral_consent",
    updatedAtMs: 1_000,
    ...input,
  };
}

function windowReceipt(input: Partial<UserIndexMaterializerWindowReceipt> = {}): UserIndexMaterializerWindowReceipt {
  return {
    windowId: "window_1",
    mode: "shadow",
    sourceFingerprint: "source_a",
    materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
    startedAtMs: 1_000,
    completedAtMs: 2_000,
    requestsClaimed: 1,
    requestsCompleted: 1,
    requestsFailed: 0,
    leaseLostCount: 0,
    factsRead: 2,
    factsPublished: 1,
    exclusions: {
      exactReplayExcludedCount: 0,
      linkedCopyExcludedCount: 1,
      identityConflictExcludedCount: 0,
      lineageBlockedCount: 0,
      adminExcludedCount: 0,
      systemExcludedCount: 0,
      personAdmissionUnverifiedCount: 0,
      personPrivacyLimitedCount: 0,
      lineageSourceMissingCount: 0,
    },
    truncatedSubjectCount: 0,
    runtimeCapReached: false,
    clean: true,
    expiresAtMs: 2_000 + USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS,
    ...input,
  };
}

function userPublicationBundle(userId = "user_1"): UserIndexPublicationBundle {
  return {
    subjectKind: "user",
    subjectId: userId,
    trackingIndex: {
      userId,
      updatedAtMs: 1,
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 1,
      sourceTruth: "materialized",
      confidence: 1,
      confidenceLabel: "verified",
      dataAvailabilityReason: "available",
      actionCounts: {
        total: 1,
        meaningful: 1,
        drops: 1,
        watch: 0,
        wallet: 0,
        purchase: 0,
        creator: 0,
        chat: 0,
        support: 0,
        notification: 0,
      },
      lastSeenAtMs: 1,
      lastMeaningfulActionAtMs: 1,
      sourceBreakdown: { client: 1 },
      personMetricCounts: createEmptyPersonMetricCounts(),
      issues: [],
    },
    entityAffinityIndex: {
      userId,
      topCreators: [],
      topCategories: [],
      topDrops: [],
      suppressions: [],
      updatedAtMs: 1,
    },
    valueIndex: {
      userId,
      verifiedSpendUsd: null,
      purchaseCount: 0,
      paidGdPurchased: null,
      rewardGdEarned: null,
      unlockCountAfterPurchase: null,
      valueScore: null,
      valueTier: null,
      sourceTruth: "source_missing",
      dataAvailabilityReason: "source_missing",
      issues: ["verified_transaction_amount_source_missing"],
      updatedAtMs: 1,
    },
    journeyIndex: {
      userId,
      sessionIds: ["session_1"],
      firstSeenAtMs: 1,
      guestToUserLinked: false,
      funnelStage: "guest",
      updatedAtMs: 1,
    },
    notificationIndex: {
      userId,
      notificationReadCount: 0,
      notificationOpenCount: 0,
      lastNotificationReadAtMs: 0,
      updatedAtMs: 1,
    },
    contentConsumptionIndex: {
      userId,
      validWatchTimeMs: null,
      viewedFileCount: 0,
      completedFileCount: null,
      openedDropCount: 1,
      unwrappedDropCount: 0,
      watchScoreSource: "source_missing",
      watchConfidence: 0,
      dataAvailabilityReason: "partial",
      issues: ["valid_watch_duration_source_missing"],
      updatedAtMs: 1,
    },
  };
}

describe("user index materializer request contract", () => {
  it("defaults invalid mode to off and resolves one canonical source fingerprint", () => {
    expect(resolveUserIndexMaterializerMode({ USER_INDEX_MATERIALIZER_MODE: "bogus" })).toBe("off");
    expect(resolveUserIndexMaterializerMode({ USER_INDEX_MATERIALIZER_MODE: "shadow" })).toBe("shadow");
    expect(resolveUserIndexMaterializerSourceFingerprint({
      USER_INDEX_SOURCE_FINGERPRINT: " source-explicit ",
      GITHUB_SHA: "source-fallback",
    })).toBe("source-explicit");
    expect(resolveUserIndexMaterializerSourceFingerprint({})).toBeNull();
  });

  it("builds deterministic, deduplicated, capped per-subject outbox requests", () => {
    const input = {
      userIds: ["user_b", "user_a", "user_a"],
      anonymousVisitorIds: ["guest_a", "guest_a"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 10,
      sourceWindowEndMs: 20,
      requestedAtMs: 30,
      maxFacts: 9_999,
      maxSubjects: 50,
    };
    const first = buildUserIndexMaterializerRequests(input);
    const second = buildUserIndexMaterializerRequests({
      ...input,
      userIds: ["user_a", "user_b"],
    });

    expect(first.map((request) => request.requestId)).toEqual(second.map((request) => request.requestId));
    expect(first.map((request) => `${request.subjectKind}:${request.subjectId}`)).toEqual([
      "guest:guest_a",
      "user:user_a",
      "user:user_b",
    ]);
    expect(first.every((request) =>
      request.maxFacts === 200
      && request.state === "queued"
      && request.expiresAtMs === request.createdAtMs + USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS,
    )).toBe(true);
  });

  it("caps each consumer run at 5 requests, 200 facts per subject, and bounded runtime", () => {
    expect(resolveUserIndexMaterializerConsumerLimits({
      maxRequests: 5_000,
      maxFactsPerSubject: 5_000,
      runtimeCapMs: 5 * 60 * 1000,
      leaseMs: 10 * 60 * 1000,
    })).toEqual({
      maxRequests: 5,
      maxFactsPerSubject: 200,
      runtimeCapMs: 30_000,
      leaseMs: 120_000,
    });
  });

  it("converts deterministic expiration milliseconds into a Firestore TTL timestamp", () => {
    const request = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 1,
      requestedAtMs: 1_000,
    })[0];

    const persisted = withUserIndexMaterializerExpiration(request);

    expect(persisted.expiresAt.toMillis()).toBe(request.expiresAtMs);
    expect(() => withUserIndexMaterializerExpiration({ expiresAtMs: Number.NaN }))
      .toThrow("user_index_materializer_expiration_invalid");
  });

  it("keeps the conservative source read/write ceiling within the registered API budget", () => {
    const contract = matchApiCostContract("/api/internal/analytics/materialize-user-index");
    const maxFactQueryCount = 1 + USER_INDEX_MATERIALIZER_MAX_LINKED_GUEST_SUBJECTS;
    const maxDirectLineageQueryCount = Math.ceil(USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT / 30);
    const maxReadsPerSubject = USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT
      + maxFactQueryCount
      + USER_INDEX_MATERIALIZER_MAX_LINEAGES_PER_QUERY
      + maxDirectLineageQueryCount
      + USER_INDEX_MATERIALIZER_MAX_LINEAGES_PER_QUERY
      + USER_INDEX_MATERIALIZER_MAX_LINKED_GUEST_SUBJECTS
      + 6;
    const conservativeReadCeiling = USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN
      + (USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN * maxReadsPerSubject)
      + 2;
    const conservativeWriteCeiling = (USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN * 9) + 2;

    expect(conservativeReadCeiling).toBeLessThanOrEqual(contract?.maxExpectedFirestoreReadsPerCall ?? 0);
    expect(conservativeWriteCeiling).toBeLessThanOrEqual(contract?.maxExpectedFirestoreWritesPerCall ?? 0);
  });

  it("persists the real runtime event id as the timeline idempotency key", () => {
    const mapped = mapRuntimeFactToBehavioralTimelineFact({
      runtimeFact: runtimeFact({ eventId: "event_idempotent_1" }),
      consentState: "granted",
      identityLinkId: "link_1",
    });

    expect(mapped.factId).toBe("event_idempotent_1");
    expect(mapped.idempotencyKey).toBe("event_idempotent_1");
    expect(mapped.includeInGlobalEvents).toBe(true);
    expect(mapped.includeInPersonMetrics).toBe(true);
  });
});

describe("user index materializer normalization", () => {
  it("rejects missing, legacy, and unsupported lineage-owner versions before materialization", () => {
    const current = lineage();
    const missing = { ...lineage({ identityLinkId: "link_missing" }), ownerKeyVersion: undefined } as unknown as IdentityLineageIndex;
    const legacy = { ...lineage({ identityLinkId: "link_legacy" }), ownerKeyVersion: "sha256_guest_subject_v1" } as unknown as IdentityLineageIndex;
    const unsupported = { ...lineage({ identityLinkId: "link_future" }), ownerKeyVersion: "future_hash_v9" } as unknown as IdentityLineageIndex;

    const result = partitionIdentityLineagesByOwnerVersion([current, missing, legacy, unsupported]);

    expect(result.accepted.map((item) => item.identityLinkId)).toEqual(["link_1"]);
    expect(result.rejected.map((item) => ({
      identityLinkId: (item.lineage as IdentityLineageIndex).identityLinkId,
      state: item.state,
    }))).toEqual([
      { identityLinkId: "link_missing", state: "owner_version_missing" },
      { identityLinkId: "link_legacy", state: "legacy_owner_version" },
      { identityLinkId: "link_future", state: "unsupported_owner_version" },
    ]);
  });

  it("deduplicates exact idempotency replays before linked-copy matching", () => {
    const normalized = normalizeFactsForUserIndexMaterialization({
      lineages: [lineage()],
      facts: [
        fact({
          factId: "guest_fact",
          idempotencyKey: "action_1",
          actorType: "guest",
          actorUserId: undefined,
          anonymousVisitorId: "guest_1",
          timestampMs: 1_000,
        }),
        fact({
          factId: "user_fact",
          idempotencyKey: "action_1",
          actorType: "user",
          actorUserId: "user_1",
          anonymousVisitorId: "guest_1",
          timestampMs: 1_001,
        }),
      ],
    });

    expect(normalized.exclusions.exactReplayExcludedCount).toBe(1);
    expect(normalized.exclusions.linkedCopyExcludedCount).toBe(0);
    expect(normalized.globalFacts).toHaveLength(1);
    expect(normalized.personFacts).toHaveLength(1);
    expect(normalized.personFacts[0].factId).toBe("user_fact");
  });

  it("uses a true inclusive 10-second sliding window across coarse bucket boundaries", () => {
    const normalized = normalizeFactsForUserIndexMaterialization({
      lineages: [lineage()],
      facts: [
        fact({
          factId: "guest_fact",
          actorType: "guest",
          actorUserId: undefined,
          anonymousVisitorId: "guest_1",
          timestampMs: 9_999,
        }),
        fact({
          factId: "user_fact",
          actorUserId: "user_1",
          anonymousVisitorId: "guest_1",
          timestampMs: 10_001,
        }),
      ],
    });

    expect(normalized.globalFacts).toHaveLength(1);
    expect(normalized.personFacts).toHaveLength(1);
    expect(normalized.personFacts[0].factId).toBe("user_fact");
    expect(normalized.exclusions.linkedCopyExcludedCount).toBe(1);
  });

  it("keeps 10,001ms-separated and differently normalized actions distinct", () => {
    const normalized = normalizeFactsForUserIndexMaterialization({
      lineages: [lineage()],
      facts: [
        fact({
          factId: "guest_fact",
          actorType: "guest",
          actorUserId: undefined,
          anonymousVisitorId: "guest_1",
          timestampMs: 1_000,
        }),
        fact({
          factId: "user_fact_late",
          actorUserId: "user_1",
          anonymousVisitorId: "guest_1",
          timestampMs: 11_001,
        }),
        fact({
          factId: "user_fact_other_action",
          actorUserId: "user_1",
          anonymousVisitorId: "guest_1",
          normalizedAction: "drop_unlocked",
          eventName: "drop_unlocked",
          timestampMs: 1_001,
        }),
      ],
    });

    expect(normalized.personFacts).toHaveLength(3);
    expect(normalized.exclusions.linkedCopyExcludedCount).toBe(0);
  });

  it("keeps multi-owner conflicts globally but excludes person attribution", () => {
    const normalized = normalizeFactsForUserIndexMaterialization({
      lineages: [lineage(), lineage({ identityLinkId: "link_2", userId: "user_2" })],
      facts: [fact({
        actorType: "guest",
        actorUserId: undefined,
        anonymousVisitorId: "guest_1",
      })],
    });

    expect(normalized.globalFacts).toHaveLength(1);
    expect(normalized.personFacts).toHaveLength(0);
    expect(normalized.exclusions.identityConflictExcludedCount).toBe(1);
  });

  it("fails closed when a linked guest fact is outside the lineage session set", () => {
    const normalized = normalizeFactsForUserIndexMaterialization({
      lineages: [lineage({ sessionIds: ["eligible_session"] })],
      facts: [fact({
        actorType: "guest",
        actorUserId: undefined,
        anonymousVisitorId: "guest_1",
        sessionId: "different_session",
      })],
    });

    expect(normalized.globalFacts).toHaveLength(1);
    expect(normalized.personFacts).toHaveLength(0);
    expect(normalized.exclusions.lineageBlockedCount).toBe(1);
  });

  it("fails closed when same-owner lineage records disagree on behavioral consent", () => {
    const normalized = normalizeFactsForUserIndexMaterialization({
      lineages: [
        lineage(),
        lineage({
          identityLinkId: "link_2",
          consentState: "partial",
          consentMode: "full_analytics",
          personLevelBehaviorAllowed: false,
          linkageConfidenceSource: "identity_link_allowed_behavior_blocked",
        }),
      ],
      facts: [fact({
        actorType: "guest",
        actorUserId: undefined,
        anonymousVisitorId: "guest_1",
      })],
    });

    expect(normalized.globalFacts).toHaveLength(1);
    expect(normalized.personFacts).toHaveLength(0);
    expect(normalized.exclusions.lineageBlockedCount).toBe(1);
  });

  it("honors runtime global and identified-person inclusion declarations", () => {
    const normalized = normalizeFactsForUserIndexMaterialization({
      lineages: [],
      facts: [fact({
        actorUserId: "user_1",
        includeInGlobalEvents: false,
        includeInPersonMetrics: false,
      })],
    });

    expect(normalized.globalFacts).toHaveLength(0);
    expect(normalized.personFacts).toHaveLength(0);
  });

  it("excludes admin and system facts from global and person output with explicit counts", () => {
    const normalized = normalizeFactsForUserIndexMaterialization({
      lineages: [],
      facts: [
        fact({ factId: "admin", actorType: "admin", adminExcludedCount: 3 }),
        fact({ factId: "system", actorType: "system", systemExcludedCount: 2 }),
        fact({ factId: "user", actorType: "user", actorUserId: "user_1" }),
      ],
    });

    expect(normalized.globalFacts.map((entry) => entry.factId)).toEqual(["user"]);
    expect(normalized.personFacts.map((entry) => entry.factId)).toEqual(["user"]);
    expect(normalized.exclusions.adminExcludedCount).toBe(3);
    expect(normalized.exclusions.systemExcludedCount).toBe(2);
  });

  it("canonicalizes target keys independently of insertion order", () => {
    const left = fact({ target: { dropId: "drop_1", creatorId: "creator_1" } });
    const right = fact({ target: { creatorId: "creator_1", dropId: "drop_1" } });
    expect(canonicalizeUserIndexFactTarget(left)).toBe(canonicalizeUserIndexFactTarget(right));
  });
});

describe("user index materializer lease and activation lifecycle", () => {
  it("leases once, rejects overlap, and reclaims only after expiry", () => {
    const request = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 1,
      requestedAtMs: 1_000,
    })[0];
    const first = resolveUserIndexMaterializerClaim({
      request,
      workerId: "worker_a",
      sourceFingerprint: "source_a",
      nowMs: 1_000,
      leaseMs: 5_000,
    });
    expect(first.status).toBe("claimed");
    if (first.status !== "claimed") throw new Error("expected claim");
    expect(resolveUserIndexMaterializerClaim({
      request: first.request,
      workerId: "worker_b",
      sourceFingerprint: "source_a",
      nowMs: 5_999,
      leaseMs: 5_000,
    }).status).toBe("not_due");
    const reclaimed = resolveUserIndexMaterializerClaim({
      request: first.request,
      workerId: "worker_b",
      sourceFingerprint: "source_a",
      nowMs: 6_000,
      leaseMs: 5_000,
    });
    expect(reclaimed.status).toBe("claimed");
    if (reclaimed.status === "claimed") expect(reclaimed.request.attemptCount).toBe(2);
  });

  it("rejects expired leases and cross-subject publication bundles", () => {
    const request = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 1,
      requestedAtMs: 1_000,
    })[0];
    const leased = {
      ...request,
      state: "leased" as const,
      leaseOwner: "worker_a",
      leaseExpiresAtMs: 6_000,
    };

    expect(isUserIndexMaterializerLeasePublishable({
      request: leased,
      workerId: "worker_a",
      publishedAtMs: 5_999,
    })).toBe(true);
    expect(isUserIndexMaterializerLeasePublishable({
      request: leased,
      workerId: "worker_a",
      publishedAtMs: 6_000,
    })).toBe(false);
    expect(isUserIndexPublicationBundleBound({
      request: leased,
      bundle: userPublicationBundle("user_1"),
    })).toBe(true);
    expect(isUserIndexPublicationBundleBound({
      request: leased,
      bundle: userPublicationBundle("user_2"),
    })).toBe(false);
    const mismatchedInnerIndex = userPublicationBundle("user_1");
    if (mismatchedInnerIndex.subjectKind === "user") mismatchedInnerIndex.valueIndex.userId = "user_2";
    expect(isUserIndexPublicationBundleBound({ request: leased, bundle: mismatchedInnerIndex })).toBe(false);
  });

  it("rejects a potentially truncated active publication before any durable write", async () => {
    const request = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 1,
      requestedAtMs: 1_000,
    })[0];
    const leased = {
      ...request,
      state: "leased" as const,
      attemptCount: 1,
      leaseOwner: "worker_a",
      leaseExpiresAtMs: 6_000,
    };

    await expect(publishUserIndexMaterializerBundle({
      request: leased,
      workerId: "worker_a",
      mode: "active",
      factsRead: request.maxFacts,
      factsPublished: request.maxFacts,
      isPotentiallyTruncated: true,
      exclusions: windowReceipt().exclusions,
      bundle: userPublicationBundle(),
    })).rejects.toThrow(USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE);

    expect(resolveUserIndexMaterializerFailure({
      request: leased,
      workerId: "worker_a",
      nowMs: 2_000,
      safeErrorCode: USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE,
    })).toMatchObject({
      state: "failed",
      lastSafeErrorCode: USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE,
    });
  });

  it("preserves a leased window and queues a newer high-water mark without losing it", () => {
    const original = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 10,
      requestedAtMs: 1_000,
    })[0];
    const claim = resolveUserIndexMaterializerClaim({
      request: original,
      workerId: "worker_a",
      sourceFingerprint: "source_a",
      nowMs: 1_000,
      leaseMs: 5_000,
    });
    if (claim.status !== "claimed") throw new Error("expected claim");
    const incoming = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 5,
      sourceWindowEndMs: 20,
      requestedAtMs: 2_000,
    })[0];
    const coalesced = coalesceUserIndexMaterializerOutboxRequest(claim.request, incoming);

    expect(coalesced.request.state).toBe("leased");
    expect(coalesced.request.sourceWindowEndMs).toBe(10);
    expect(coalesced.request.pendingSourceWindowEndMs).toBe(20);
  });

  it("applies bounded exponential retry and fails closed after the attempt limit", () => {
    const request = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 1,
      requestedAtMs: 1_000,
    })[0];
    const claimed = resolveUserIndexMaterializerClaim({
      request,
      workerId: "worker_a",
      sourceFingerprint: "source_a",
      nowMs: 1_000,
      leaseMs: 5_000,
    });
    if (claimed.status !== "claimed") throw new Error("expected claim");
    const retry = resolveUserIndexMaterializerFailure({
      request: claimed.request,
      workerId: "worker_a",
      nowMs: 2_000,
      safeErrorCode: "dependency_unavailable",
    });
    expect(retry?.state).toBe("retry_wait");
    expect(retry?.nextAttemptAtMs).toBe(2_000 + computeUserIndexMaterializerRetryDelayMs(1));
    expect(retry?.expiresAtMs).toBe(2_000 + USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS);

    const terminal = resolveUserIndexMaterializerFailure({
      request: {
        ...claimed.request,
        attemptCount: USER_INDEX_MATERIALIZER_MAX_ATTEMPTS,
      },
      workerId: "worker_a",
      nowMs: 3_000,
      safeErrorCode: "dependency_unavailable",
    });
    expect(terminal?.state).toBe("failed");
    expect(terminal?.expiresAtMs).toBe(3_000 + USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS);
  });

  it("promotes a pending high-water mark instead of stranding it on terminal failure", () => {
    const request = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 10,
      requestedAtMs: 1_000,
    })[0];
    const promoted = resolveUserIndexMaterializerFailure({
      request: {
        ...request,
        state: "leased",
        attemptCount: USER_INDEX_MATERIALIZER_MAX_ATTEMPTS,
        leaseOwner: "worker_a",
        leaseExpiresAtMs: 5_000,
        pendingSourceWindowStartMs: 5,
        pendingSourceWindowEndMs: 20,
      },
      workerId: "worker_a",
      nowMs: 2_000,
      safeErrorCode: "dependency_timeout",
    });

    expect(promoted).toMatchObject({
      state: "queued",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 20,
      attemptCount: 0,
      nextAttemptAtMs: 2_000,
      pendingSourceWindowEndMs: null,
    });

    const recoveredHistoricalFailure = resolveUserIndexMaterializerClaim({
      request: {
        ...request,
        state: "failed",
        attemptCount: USER_INDEX_MATERIALIZER_MAX_ATTEMPTS,
        pendingSourceWindowStartMs: 5,
        pendingSourceWindowEndMs: 20,
      },
      workerId: "worker_b",
      sourceFingerprint: "source_a",
      nowMs: 3_000,
      leaseMs: 5_000,
    });
    expect(recoveredHistoricalFailure.status).toBe("claimed");
    if (recoveredHistoricalFailure.status === "claimed") {
      expect(recoveredHistoricalFailure.request).toMatchObject({
        state: "leased",
        sourceWindowEndMs: 20,
        attemptCount: 1,
        leaseOwner: "worker_b",
      });
    }
  });

  it("requires the latest two distinct clean current-source shadow windows", () => {
    const first = buildNextUserIndexMaterializerActivationState({
      current: null,
      receipt: windowReceipt(),
    });
    const second = buildNextUserIndexMaterializerActivationState({
      current: first,
      receipt: windowReceipt({ windowId: "window_2", startedAtMs: 3_000, completedAtMs: 4_000 }),
    });
    expect(isUserIndexMaterializerActivationReady({ state: second, sourceFingerprint: "source_a" })).toBe(true);
    expect(isUserIndexMaterializerActivationReady({ state: second, sourceFingerprint: "source_b" })).toBe(false);
    expect(isUserIndexMaterializerActivationReady({
      state: { sourceFingerprint: "source_a" } as never,
      sourceFingerprint: "source_a",
    })).toBe(false);

    const dirty = buildNextUserIndexMaterializerActivationState({
      current: second,
      receipt: windowReceipt({ windowId: "window_3", completedAtMs: 5_000, clean: false, requestsFailed: 1 }),
    });
    expect(dirty?.consecutiveCleanShadowWindowIds).toEqual([]);
    expect(isUserIndexMaterializerActivationReady({ state: dirty, sourceFingerprint: "source_a" })).toBe(false);
  });

  it("derives clean evidence from counters instead of trusting the caller flag", () => {
    const valid = deriveUserIndexMaterializerWindowReceipt(windowReceipt({ clean: false }));
    const forged = deriveUserIndexMaterializerWindowReceipt(windowReceipt({
      clean: true,
      requestsCompleted: 0,
      requestsFailed: 1,
      runtimeCapReached: true,
    }));
    const first = buildNextUserIndexMaterializerActivationState({ current: null, receipt: forged });
    const second = buildNextUserIndexMaterializerActivationState({
      current: first,
      receipt: { ...forged, windowId: "forged_window_2", completedAtMs: 3_000 },
    });

    expect(valid.clean).toBe(true);
    expect(valid.expiresAtMs).toBe(valid.completedAtMs + USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS);
    expect(forged.clean).toBe(false);
    expect(isUserIndexMaterializerActivationReady({ state: second, sourceFingerprint: "source_a" })).toBe(false);
  });

  it("keeps potentially truncated shadow evidence partial and ineligible for activation", () => {
    const truncated = deriveUserIndexMaterializerWindowReceipt(windowReceipt({
      truncatedSubjectCount: 1,
      clean: true,
    }));
    const activation = buildNextUserIndexMaterializerActivationState({
      current: null,
      receipt: truncated,
    });

    expect(truncated).toMatchObject({
      truncatedSubjectCount: 1,
      clean: false,
    });
    expect(activation?.latestShadowWindowClean).toBe(false);
    expect(activation?.consecutiveCleanShadowWindowIds).toEqual([]);
    expect(isUserIndexMaterializerActivationReady({
      state: activation,
      sourceFingerprint: "source_a",
    })).toBe(false);
  });
});


describe("identified ingest primary-operation cost admission", () => {
  it("uses the exact authenticated batch contract and accounts for one role read", () => {
    const contract = matchApiCostContract("/api/analytics/ingest-identified");
    expect(contract).toMatchObject({ routePattern: "/api/analytics/ingest-identified", authRequired: "user", methods: ["POST"], cachePolicy: "no_store", trustedOriginRequired: true, budgetGuardRequired: true });
    expect(200 + 1 + 5).toBeLessThanOrEqual(contract?.maxExpectedFirestoreReadsPerCall ?? 0);
    expect(200 + 1 + 120 + 5).toBeLessThanOrEqual(contract?.maxExpectedFirestoreWritesPerCall ?? 0);
    expect(matchApiCostContract("/api/analytics/identity-link")?.routePattern).not.toBe("/api/analytics/ingest-identified");
    expect(matchApiCostContract("/api/internal/analytics/materialize-user-index")?.routePattern).toBe("/api/internal/analytics/materialize-user-index");
  });
});

// Artifact-only actual normalizer counterexamples; no provider or runtime writes.
import { RUNTIME_FACT_REQUEST_CONSENT_ADMISSION_VERSION as admissionVersion } from "@/lib/runtime-facts/runtime-fact-contract";
import { buildUserTrackingIndex as buildTrackingForAdmissionProbe } from "@/lib/user-indexes/user-index-normalizer";

describe("Audience admission source-gap probe", () => {
  const observed = (overrides: Partial<UserIndexMaterializerFact> = {}) => fact({
    eventName: "page_viewed", normalizedAction: "page_viewed", timestampMs: Date.now(),
    anonymousVisitorId: undefined, identityLinkId: undefined,
    includeInGlobalEvents: true, includeInPersonMetrics: true,
    requestConsentAdmission: { version: admissionVersion, consentMode: "full_behavioral" },
    ...overrides,
  });
  it("does not turn legacy unknown client history into known-person behavior", () => {
    const result = normalizeFactsForUserIndexMaterialization({ facts: [observed({ sourceTruth: "legacy", requestConsentAdmission: undefined })], lineages: [] });
    expect(result.personFacts).toHaveLength(0);
  });
  it("leaves unadmitted client-declared consent out of current person truth", () => {
    const result = normalizeFactsForUserIndexMaterialization({ facts: [observed({ requestConsentAdmission: undefined })], lineages: [] });
    expect(result.personFacts).toHaveLength(0);
  });
  it("does not elevate a minimal request marker through a raw granted label", () => {
    const result = normalizeFactsForUserIndexMaterialization({ facts: [observed({ requestConsentAdmission: { version: admissionVersion, consentMode: "minimal_analytics" } })], lineages: [] });
    expect(result.personFacts).toHaveLength(0);
  });
  it("does not infer permission from a missing person inclusion flag", () => {
    const result = normalizeFactsForUserIndexMaterialization({ facts: [observed({ includeInPersonMetrics: undefined })], lineages: [] });
    expect(result.personFacts).toHaveLength(0);
  });
  it("preserves an admitted ordinary full-behavior person observation", () => {
    const result = normalizeFactsForUserIndexMaterialization({ facts: [observed()], lineages: [] });
    expect(result.personFacts).toHaveLength(1);
    expect(result.personFacts[0].actorUserId).toBe("user_1");
  });
  it("honors explicit canonical person exclusion", () => {
    const result = normalizeFactsForUserIndexMaterialization({ facts: [observed({ includeInPersonMetrics: false })], lineages: [] });
    expect(result.personFacts).toHaveLength(0);
    expect(result.globalFacts).toHaveLength(1);
  });
  it("preserves existing necessary server operation projection without requiring an HTTP marker", () => {
    const result = normalizeFactsForUserIndexMaterialization({ facts: [observed({ sourceTruth: "server", eventName: "gumdrops_purchased", normalizedAction: "gumdrops_purchased", consentState: "not_required", requestConsentAdmission: undefined })], lineages: [] });
    expect(result.personFacts).toHaveLength(1);
  });
  it("keeps empty persisted count fields distinct from a proven zero window", () => {
    const now = Date.now();
    const result = buildTrackingForAdmissionProbe({ userId: "user_1", facts: [], sourceWindowStartMs: now-1000, sourceWindowEndMs: now });
    expect(result.actionCounts.total).toBe(0);
    expect(result.personMetricCounts.page_views).toBe(0);
    expect(result.dataAvailabilityReason).toBe("insufficient_signal");
  });
});

describe("Audience person admission canonical boundary", () => {
  const admitted = (overrides: Partial<UserIndexMaterializerFact> = {}) => fact({
    eventName: "page_viewed", normalizedAction: "page_viewed", anonymousVisitorId: undefined, identityLinkId: undefined,
    includeInGlobalEvents: true, includeInPersonMetrics: true,
    requestConsentAdmission: { version: admissionVersion, consentMode: "full_behavioral" }, ...overrides,
  });
  it.each(["minimal_analytics", "full_analytics"] as const)("keeps lawful %s global observation out of person behavior", consentMode => {
    const result = normalizeFactsForUserIndexMaterialization({ facts: [admitted({ consentState: "partial", includeInPersonMetrics: false, requestConsentAdmission: {version: admissionVersion, consentMode} })], lineages: [] });
    expect(result.globalFacts).toHaveLength(1);
    expect(result.personFacts).toHaveLength(0);
  });
  it.each([
    {version: "future_admission_v9", consentMode: "full_behavioral"},
    {version: admissionVersion, consentMode: "minimal"},
    {consentMode: "full_behavioral"},
  ])("does not admit malformed or unsupported stored marker %j", marker => {
    const result = normalizeFactsForUserIndexMaterialization({facts: [admitted({requestConsentAdmission: marker as any})], lineages: []});
    expect(result.personFacts).toHaveLength(0);
    expect(result.globalFacts[0].sourceTruth).toBe("client");
  });
  it("does not coerce a stored nonboolean person declaration", () => {
    const result = normalizeFactsForUserIndexMaterialization({facts: [admitted({includeInPersonMetrics: "true" as any})], lineages: []});
    expect(result.personFacts).toHaveLength(0);
  });
  it("does not elevate an explicitly narrower stored consent state", () => {
    const result = normalizeFactsForUserIndexMaterialization({facts: [admitted({consentState: "partial"})], lineages: []});
    expect(result.personFacts).toHaveLength(0);
  });
  it("links a full-consent admitted guest despite its correct direct-person exclusion", () => {
    const result = normalizeFactsForUserIndexMaterialization({facts: [admitted({factId:"guest_current", actorType:"guest", actorUserId:undefined, anonymousVisitorId:"guest_1", identityLinkId:"link_1", includeInPersonMetrics:false})], lineages:[lineage()]});
    expect(result.globalFacts).toHaveLength(1);
    expect(result.personFacts).toHaveLength(1);
    expect(result.personFacts[0].actorUserId).toBe("user_1");
  });
  it("counts admitted guest and identified copies once globally and once for the linked person", () => {
    const result = normalizeFactsForUserIndexMaterialization({facts: [
      admitted({factId:"guest_copy", actorType:"guest", actorUserId:undefined, anonymousVisitorId:"guest_1", identityLinkId:"link_1", includeInPersonMetrics:false, timestampMs:1000}),
      admitted({factId:"user_copy", anonymousVisitorId:"guest_1", identityLinkId:"link_1", timestampMs:1001}),
    ], lineages:[lineage()]});
    expect(result.globalFacts).toHaveLength(1);
    expect(result.personFacts).toHaveLength(1);
    expect(result.exclusions.linkedCopyExcludedCount).toBe(1);
  });
  it("does not accept current owner version as proof of malformed stored lineage shape", () => {
    const result = partitionIdentityLineagesByOwnerVersion([{...lineage(), sessionIds: "session_1"} as any]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
  });
  it("keeps privacy exclusion a clean policy outcome without promoting unverified source", () => {
    const privacy = deriveUserIndexMaterializerWindowReceipt(windowReceipt({exclusions: {...windowReceipt().exclusions, personPrivacyLimitedCount: 1} as any}));
    const unavailable = deriveUserIndexMaterializerWindowReceipt(windowReceipt({exclusions: {...windowReceipt().exclusions, personAdmissionUnverifiedCount: 1} as any}));
    expect(privacy.clean).toBe(true);
    expect(unavailable.clean).toBe(false);
  });
});

describe("Audience person materializer semantic version", () => {
  it("rejects old clean activation evidence after the admission contract changes", () => {
    const state = {...buildNextUserIndexMaterializerActivationState({current:null,receipt:windowReceipt()}),
      sourceFingerprint:"source_a", materializerVersion:"2026.07.user-index-materializer.v3", latestShadowWindowClean:true,
      consecutiveCleanShadowWindowIds:["old_1","old_2"],latestShadowWindowId:"old_2"};
    expect(isUserIndexMaterializerActivationReady({state:state as any,sourceFingerprint:"source_a"})).toBe(false);
  });
});
