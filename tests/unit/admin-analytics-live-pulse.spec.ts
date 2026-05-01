import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsLivePulseModel } from "@/lib/admin-analytics-live-pulse";

describe("buildAdminAnalyticsLivePulseModel", () => {
  it("derives graph points from presence when chart source is empty", () => {
    const nowMs = 1_771_000_000_000;
    const model = buildAdminAnalyticsLivePulseModel({
      activeUsers: [
        {
          uid: "B7WciP8I1Qbtk9CevdfpZTjferR2",
          username: "B7WciP8I1Qbtk9CevdfpZTjferR2",
          actorType: "identified",
          lastSeenAt: nowMs - 60_000,
          lastEventName: "drops_page_viewed",
          lastPagePath: "/drops",
          lastDropTitle: "",
          lastSemanticScopeLabel: "Drops",
          lastComponentName: "",
          lastEventModules: "",
          sourceLabel: "analytics_event_facts",
          truthLabel: "live",
        },
        {
          uid: "guest:session-abcdef",
          username: "Guest",
          actorType: "guest",
          sessionKey: "session-abcdef",
          lastSeenAt: nowMs - 120_000,
          lastEventName: "page_view",
          lastPagePath: "/",
          lastDropTitle: "",
          lastSemanticScopeLabel: "Home",
          lastComponentName: "",
          lastEventModules: "page_view",
          sourceLabel: "analytics_guest_batches",
          truthLabel: "live",
        },
      ],
      surfaceMix: [{ key: "drops", label: "Drops", activeUsers: 1, lastSeenAt: nowMs - 60_000 }],
      liveSeries: [],
      feedStatus: "realtime",
      feedDetail: "Realtime Firestore observers are active.",
      truthState: "live",
      activeUsersTruthState: "live",
      listenerDebugMeta: {
        listeners: {
          eventFacts: { fromCache: false, lastServerConfirmedAtMs: nowMs },
        },
      },
      nowMs,
      liveLoading: false,
    });

    expect(model.graphSourceMismatch).toBe(true);
    expect(model.graphDerivedFromPresence).toBe(true);
    expect(model.graphHydrated).toBe(true);
    expect(model.graphPointCount).toBeGreaterThan(0);
    expect(model.activeIdentities[0].displayLabel).toBe("User • jferR2");
    expect(model.activeIdentities[0].displayLabel).not.toContain("B7WciP8I1Qbtk9CevdfpZTjferR2");
    expect(model.rawIdentityIds).toContain("B7WciP8I1Qbtk9CevdfpZTjferR2");
    expect(model.guestCount.value).toBe(1);
    expect(model.authenticatedCount.value).toBe(1);
  });

  it("prevents fake zero when presence has not loaded", () => {
    const model = buildAdminAnalyticsLivePulseModel({
      activeUsers: [],
      surfaceMix: [],
      liveSeries: [],
      feedStatus: "partial",
      feedDetail: "Realtime observers are warming up.",
      truthState: "loading",
      activeUsersTruthState: "loading",
      nowMs: 1_771_000_000_000,
      liveLoading: true,
    });

    expect(model.activeCount.value).toBeNull();
    expect(model.fakeZeroPrevented).toBe(true);
    expect(model.graphHydrated).toBe(false);
    expect(model.presenceSourceStatus).toBe("partial");
    expect(model.includeMetadataChanges).toBe(true);
  });

  it("keeps backend snapshot values visible when realtime presence is delayed", () => {
    const nowMs = 1_771_000_000_000;
    const model = buildAdminAnalyticsLivePulseModel({
      activeUsers: [
        {
          uid: "user_1",
          username: "jessi",
          actorType: "identified",
          lastSeenAt: nowMs - 90_000,
          lastEventName: "dashboard_viewed",
          lastPagePath: "/dashboard",
          lastDropTitle: "",
          lastSemanticScopeLabel: "Dashboard",
          lastComponentName: "",
          lastEventModules: "",
          sourceLabel: "analytics_aggregate_stats/realtime_summary",
          truthLabel: "fallback",
        },
      ],
      surfaceMix: [{ key: "dashboard", label: "Dashboard", activeUsers: 1, lastSeenAt: nowMs - 90_000 }],
      liveSeries: [],
      feedStatus: "polled",
      feedDetail: "debug only",
      truthState: "cached",
      activeUsersTruthState: "cached",
      nowMs,
      liveLoading: false,
      displayState: {
        visibleValueSource: "verified_snapshot",
        sourceMode: "verified_cache",
        truthState: "verified",
        shouldRenderSnapshot: true,
        shouldRenderRealtimeUpgrade: false,
        shouldShowUnavailable: false,
        visibleMessage: "Realtime delayed. Showing last verified snapshot.",
        debugReason: "snapshot exists",
        refreshAvailable: true,
        fakeZeroPrevented: false,
        realtimeBlocksFirstRender: false,
        graphMissingButSnapshotRendered: true,
      },
      laneFailures: ["listener failed"],
    });

    expect(model.livePulseEnabled).toBe(true);
    expect(model.visibleCopy).toBe("Realtime delayed. Showing last verified snapshot.");
    expect(model.presenceSourceStatus).toBe("fallback");
    expect(model.primaryDisplaySource).toBe("verified_snapshot");
    expect(model.latestVerifiedSnapshotExists).toBe(true);
    expect(model.realtimeBlocksFirstRender).toBe(false);
    expect(model.fallbackSnapshotUsed).toBe(true);
    expect(model.laneFailures).toEqual(["listener failed"]);
  });
});
