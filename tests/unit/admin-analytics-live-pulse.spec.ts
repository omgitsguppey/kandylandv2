import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsLivePulseModel } from "@/lib/admin-analytics-live-pulse";
import type { RealtimeAnalyticsResponse } from "@/types/admin-analytics";

function guestSnapshot(
  overrides: Partial<NonNullable<RealtimeAnalyticsResponse["guestAnalyticsSnapshot"]>> = {},
): NonNullable<RealtimeAnalyticsResponse["guestAnalyticsSnapshot"]> {
  return {
    generatedAtMs: 1_771_000_000_000,
    refreshedAtMs: 1_771_000_000_000,
    sourceWindowMs: 30 * 60 * 1000,
    sourceWindowLabel: "last_30_minutes",
    guestBatchCount: 2,
    guestEventCount: 6,
    guestSessionCount: 2,
    uniqueAnonymousVisitorCount: 2,
    guestBounceCount: 1,
    guestBounceRate: 0.5,
    guestSamplesAvailable: true,
    guestTruthState: "live",
    sourceCollectionsUsed: ["analytics_guest_batches"],
    sourceSampleCounts: {
      analytics_guest_batches: 2,
    },
    notes: [],
    ...overrides,
  };
}

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
    expect(model.activeIdentities[0].displayLabel).toBe("jferR2");
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
        visibleMessage: "Live updates are delayed. Showing last verified data.",
        debugReason: "snapshot exists",
        refreshAvailable: true,
        fakeZeroPrevented: false,
        realtimeBlocksFirstRender: false,
        graphMissingButSnapshotRendered: true,
      },
      laneFailures: ["listener failed"],
    });

    expect(model.livePulseEnabled).toBe(true);
    expect(model.visibleCopy).toBe("Live updates are delayed. Showing last verified data.");
    expect(model.presenceSourceStatus).toBe("fallback");
    expect(model.primaryDisplaySource).toBe("verified_snapshot");
    expect(model.latestVerifiedSnapshotExists).toBe(true);
    expect(model.realtimeBlocksFirstRender).toBe(false);
    expect(model.fallbackSnapshotUsed).toBe(true);
    expect(model.laneFailures).toEqual(["listener failed"]);
  });

  it("uses the materialized guest snapshot instead of GA estimates for the guest mix", () => {
    const nowMs = 1_771_000_000_000;
    const model = buildAdminAnalyticsLivePulseModel({
      activeUsers: [],
      surfaceMix: [],
      liveSeries: [],
      feedStatus: "polled",
      feedDetail: "Snapshot available.",
      truthState: "cached",
      activeUsersTruthState: "cached",
      nowMs,
      liveLoading: false,
      guestEstimateState: "estimated",
      guestEstimateSourceLabel: "ga_estimate",
      guestEstimateConfidence: 0.55,
      guestAnalyticsSnapshot: guestSnapshot({
        uniqueAnonymousVisitorCount: 3,
      }),
    });

    expect(model.guestSnapshotTruthState).toBe("live");
    expect(model.guestMixLabel).toBe("Auth 0 · Guest 3");
    expect(model.topWarningDetail).toBeNull();
    expect(model.guestSnapshotSourceLabel).toBe("analytics_guest_batches");
  });

  it("does not display missing guest snapshot evidence as a live zero", () => {
    const nowMs = 1_771_000_000_000;
    const model = buildAdminAnalyticsLivePulseModel({
      activeUsers: [],
      surfaceMix: [],
      liveSeries: [],
      feedStatus: "polled",
      feedDetail: "Snapshot available.",
      truthState: "cached",
      activeUsersTruthState: "cached",
      nowMs,
      liveLoading: false,
      guestAnalyticsSnapshot: guestSnapshot({
        guestBatchCount: 0,
        guestEventCount: 0,
        guestSessionCount: 0,
        uniqueAnonymousVisitorCount: 0,
        guestSamplesAvailable: false,
        guestTruthState: "unavailable",
        sourceSampleCounts: {
          analytics_guest_batches: 0,
        },
        notes: ["No guest analytics batches were materialized in the realtime source window."],
      }),
    });

    expect(model.guestSnapshotTruthState).toBe("unavailable");
    expect(model.guestMixLabel).toBe("Auth 0 · Guest unavailable");
    expect(model.topWarningDetail).toBe("No guest analytics batches were materialized in the realtime source window.");
  });
  it("keeps detailed source doctrine out of primary Live Pulse copy", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx"),
      "utf8",
    );

    expect(source).toContain("defaultExpanded={false}");
    expect(source).toContain('data-admin-analytics-live-pulse-default-expanded="false"');
    expect(source).not.toContain("raw logs stay");
    expect(source).toContain("livePulseCompactStatusLine");
    expect(source).toContain("livePulseCompactIssueLine");
  });
});
