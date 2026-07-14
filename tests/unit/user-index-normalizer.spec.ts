import { describe, expect, it } from "vitest";

import {
  buildUserContentConsumptionIndex,
  buildUserJourneyIndex,
  buildUserTrackingIndex,
  buildUserValueIndex,
  mergeUserJourneyIndexLifetime,
} from "@/lib/user-indexes/user-index-normalizer";
import type { BehavioralTimelineFact } from "@/lib/behavioral/behavioral-timeline-contract";

function fact(input: Partial<BehavioralTimelineFact>): BehavioralTimelineFact {
  return {
    factId: "fact_1",
    actorType: "user",
    actorUserId: "user_1",
    anonymousVisitorId: undefined,
    sessionId: "session_1",
    identityLinkId: undefined,
    normalizedAction: "page_viewed",
    eventName: "page_viewed",
    timestampMs: Date.now(),
    route: "/dashboard",
    sourceComponent: "test",
    surface: "user",
    target: {},
    sourceTruth: "client",
    sourceReliability: 0.7,
    consentState: "granted",
    metricEligible: true,
    metricExclusionReason: "",
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

describe("user index normalizer", () => {
  it("does not count client purchase as verified value truth", () => {
    const index = buildUserValueIndex("user_1", [
      fact({ normalizedAction: "gumdrops_purchased", sourceTruth: "client" }),
    ]);
    expect(index.purchaseCount).toBe(0);
    expect(index.sourceTruth).toBe("source_missing");
    expect(index.verifiedSpendUsd).toBeNull();
    expect(index.valueScore).toBeNull();
    expect(index.dataAvailabilityReason).toBe("source_missing");
  });

  it("counts a server purchase event without fabricating transaction amounts or value truth", () => {
    const index = buildUserValueIndex("user_1", [
      fact({ normalizedAction: "gumdrops_purchased", sourceTruth: "server" }),
    ]);
    expect(index.purchaseCount).toBe(1);
    expect(index.sourceTruth).toBe("behavioral_timeline_projection");
    expect(index).toMatchObject({
      verifiedSpendUsd: null,
      paidGdPurchased: null,
      rewardGdEarned: null,
      unlockCountAfterPurchase: null,
      valueScore: null,
      valueTier: null,
      dataAvailabilityReason: "partial",
    });
    expect(index.issues).toContain("verified_transaction_amount_source_missing");
  });

  it("marks privacy-limited user tracking as privacy_limited", () => {
    const index = buildUserTrackingIndex({
      userId: "user_1",
      facts: [fact({ consentState: "denied", metricEligible: false, metricExclusionReason: "privacy_limited" })],
      sourceWindowStartMs: Date.now() - 1000,
      sourceWindowEndMs: Date.now(),
    });
    expect(index.dataAvailabilityReason).toBe("privacy_limited");
  });

  it("does not promote event names to watch-session duration or file-completion truth", () => {
    const index = buildUserContentConsumptionIndex("user_1", [
      fact({ normalizedAction: "watch_session_completed", sourceTruth: "server" }),
    ]);
    expect(index).toMatchObject({
      validWatchTimeMs: null,
      completedFileCount: null,
      watchScoreSource: "source_missing",
      watchConfidence: 0,
      dataAvailabilityReason: "source_missing",
    });
    expect(index.issues).toEqual(expect.arrayContaining([
      "valid_watch_duration_source_missing",
      "completed_file_source_missing",
    ]));
  });

  it("connects guest lineage to user journey when identity link id exists", () => {
    const index = buildUserJourneyIndex({
      userId: "user_1",
      anonymousVisitorId: "anon_1",
      identityLinkId: "link_1",
      facts: [fact({ normalizedAction: "identity_linked", identityLinkId: "link_1" })],
    });
    expect(index.guestToUserLinked).toBe(true);
    expect(index.identityLinkId).toBe("link_1");
  });

  it("preserves lifetime journey minima and never regresses the funnel stage", () => {
    const merged = mergeUserJourneyIndexLifetime({
      userId: "user_1",
      sessionIds: ["historical_session"],
      firstSeenAtMs: 100,
      signedUpAtMs: 150,
      onboardedAtMs: 200,
      firstPurchaseAtMs: 300,
      firstUnlockAtMs: 400,
      firstMessageAtMs: 500,
      guestToUserLinked: true,
      identityLinkId: "link_1",
      funnelStage: "messaged",
      updatedAtMs: 600,
    }, {
      userId: "user_1",
      sessionIds: ["recent_session"],
      firstSeenAtMs: 1_000,
      firstPurchaseAtMs: 1_100,
      firstUnlockAtMs: 1_200,
      guestToUserLinked: false,
      funnelStage: "unwrapped",
      updatedAtMs: 1_300,
    });

    expect(merged).toMatchObject({
      sessionIds: ["recent_session", "historical_session"],
      firstSeenAtMs: 100,
      signedUpAtMs: 150,
      onboardedAtMs: 200,
      firstPurchaseAtMs: 300,
      firstUnlockAtMs: 400,
      firstMessageAtMs: 500,
      guestToUserLinked: true,
      identityLinkId: "link_1",
      funnelStage: "messaged",
      updatedAtMs: 1_300,
    });
  });

  it("bounds journey session continuity and keeps the newest window first", () => {
    const currentSessionIds = Array.from({ length: 200 }, (_, index) => `historical_${index}`);
    const merged = mergeUserJourneyIndexLifetime({
      userId: "user_1",
      sessionIds: currentSessionIds,
      firstSeenAtMs: 100,
      guestToUserLinked: false,
      funnelStage: "guest",
      updatedAtMs: 100,
    }, {
      userId: "user_1",
      sessionIds: ["recent_1", "recent_2", "historical_0"],
      firstSeenAtMs: 200,
      guestToUserLinked: false,
      funnelStage: "guest",
      updatedAtMs: 200,
    });

    expect(merged.sessionIds).toHaveLength(200);
    expect(merged.sessionIds.slice(0, 3)).toEqual(["recent_1", "recent_2", "historical_0"]);
    expect(merged.sessionIds.at(-1)).toBe("historical_197");
  });

  it("does not merge lifetime state across different subjects", () => {
    const incoming = buildUserJourneyIndex({
      userId: "user_2",
      facts: [fact({ actorUserId: "user_2", timestampMs: 2_000 })],
    });
    const merged = mergeUserJourneyIndexLifetime({
      userId: "user_1",
      sessionIds: ["other_session"],
      firstSeenAtMs: 100,
      firstMessageAtMs: 200,
      guestToUserLinked: false,
      funnelStage: "messaged",
      updatedAtMs: 200,
    }, incoming);

    expect(merged).toBe(incoming);
  });
});
