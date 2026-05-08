import { describe, expect, it } from "vitest";

import {
  buildUserContentConsumptionIndex,
  buildUserJourneyIndex,
  buildUserTrackingIndex,
  buildUserValueIndex,
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
    expect(index.sourceTruth).toBe("materialized");
  });

  it("counts server purchase facts in value index", () => {
    const index = buildUserValueIndex("user_1", [
      fact({ normalizedAction: "gumdrops_purchased", sourceTruth: "server" }),
    ]);
    expect(index.purchaseCount).toBe(1);
    expect(index.sourceTruth).toBe("server_transaction");
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

  it("does not promote page-leave style diagnostic to verified watch", () => {
    const index = buildUserContentConsumptionIndex("user_1", [
      fact({ normalizedAction: "page_leave", sourceTruth: "client" }),
    ]);
    expect(index.watchScoreSource).toBe("legacy_page_duration");
    expect(index.watchConfidence).toBeLessThan(0.5);
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
});
