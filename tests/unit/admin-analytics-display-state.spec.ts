import { describe, expect, it } from "vitest";

import { resolveAdminAnalyticsDisplayState } from "@/lib/analytics/admin-analytics-display-state";
import {
  normalizeAdminSnapshotRatio,
  readAdminSnapshotNumberValue,
  resolveAdminAnalyticsWaitingCopy,
} from "@/lib/analytics/admin-analytics-loading-state";
import { createSnapshotValue, type AdminMetricSnapshot } from "@/lib/analytics/admin-metric-snapshot";

describe("resolveAdminAnalyticsDisplayState", () => {
  it("renders a verified snapshot when realtime fails", () => {
    const state = resolveAdminAnalyticsDisplayState({
      latestVerifiedSnapshot: {
        exists: true,
        sourceMode: "verified_cache",
        truthState: "verified",
        lastVerifiedAt: "2026-05-01T12:00:00.000Z",
        hasValues: true,
      },
      realtimeState: {
        status: "failed",
        hasData: false,
        error: "listener unavailable",
      },
      moduleConfig: {
        moduleKey: "live_pulse",
        title: "Live Pulse",
        metricValue: 12,
      },
    });

    expect(state.shouldRenderSnapshot).toBe(true);
    expect(state.shouldShowUnavailable).toBe(false);
    expect(state.sourceMode).toBe("verified_cache");
    expect(state.visibleMessage).toBe("Realtime delayed. Showing last verified snapshot.");
    expect(state.realtimeBlocksFirstRender).toBe(false);
  });

  it("keeps a snapshot visible while refresh runs", () => {
    const state = resolveAdminAnalyticsDisplayState({
      latestVerifiedSnapshot: {
        exists: true,
        sourceMode: "stale_cache",
        truthState: "stale",
        lastVerifiedAt: "2026-05-01T11:30:00.000Z",
        hasValues: true,
      },
      refreshState: { status: "refreshing" },
      moduleConfig: {
        moduleKey: "audience_snapshot",
        title: "Audience Snapshot",
        metricValue: 481,
      },
    });

    expect(state.shouldRenderSnapshot).toBe(true);
    expect(state.truthState).toBe("refreshing");
    expect(state.visibleMessage).toBe("Refresh running. Showing last verified snapshot.");
  });

  it("shows unavailable when neither snapshot nor realtime data exists", () => {
    const state = resolveAdminAnalyticsDisplayState({
      latestVerifiedSnapshot: null,
      realtimeState: {
        status: "failed",
        hasData: false,
      },
      moduleConfig: {
        moduleKey: "event_mix",
        title: "Event Mix",
        metricValue: null,
      },
    });

    expect(state.shouldShowUnavailable).toBe(true);
    expect(state.visibleMessage).toBe("No verified snapshot yet.");
    expect(state.fakeZeroPrevented).toBe(true);
  });

  it("does not coerce null or unconfirmed zero into a metric", () => {
    const nullState = resolveAdminAnalyticsDisplayState({
      realtimeState: { status: "waiting", hasData: false },
      moduleConfig: {
        moduleKey: "commerce_snapshot",
        title: "Commerce Snapshot",
        metricValue: null,
      },
    });
    const zeroState = resolveAdminAnalyticsDisplayState({
      realtimeState: { status: "waiting", hasData: false },
      moduleConfig: {
        moduleKey: "commerce_snapshot",
        title: "Commerce Snapshot",
        metricValue: 0,
        serverConfirmedZero: false,
      },
    });

    expect(nullState.fakeZeroPrevented).toBe(true);
    expect(zeroState.fakeZeroPrevented).toBe(true);
  });

  it("does not blank a module when only the graph source is missing", () => {
    const state = resolveAdminAnalyticsDisplayState({
      latestVerifiedSnapshot: {
        exists: true,
        sourceMode: "verified_cache",
        truthState: "verified",
        hasValues: true,
      },
      moduleConfig: {
        moduleKey: "live_pulse",
        title: "Live Pulse",
        metricValue: 9,
        graphSourceAvailable: false,
      },
    });

    expect(state.shouldRenderSnapshot).toBe(true);
    expect(state.shouldShowUnavailable).toBe(false);
    expect(state.graphMissingButSnapshotRendered).toBe(true);
  });

  it("extracts verified snapshot values without inventing fake zeroes", () => {
    const snapshot = {
      lastVerifiedAt: "2026-05-01T12:00:00.000Z",
      values: {
        revenueUsd: createSnapshotValue({
          value: 129.5,
          available: true,
          source: "verified_snapshot",
          sourceMode: "verified_cache",
        }),
        purchases: createSnapshotValue({
          value: null,
          available: false,
          source: "verified_snapshot",
          sourceMode: "unavailable",
          fakeZeroPrevented: true,
        }),
      },
    } as unknown as AdminMetricSnapshot;

    expect(readAdminSnapshotNumberValue(snapshot, ["revenueUsd"])).toBe(129.5);
    expect(readAdminSnapshotNumberValue(snapshot, ["purchases"])).toBeNull();
  });

  it("uses reasoned waiting copy only when no verified snapshot value exists", () => {
    expect(resolveAdminAnalyticsWaitingCopy({
      hasVerifiedValue: true,
      loading: true,
    })).toMatchObject({
      label: null,
      reason: "snapshot_available",
      allowed: false,
    });

    expect(resolveAdminAnalyticsWaitingCopy({
      hasVerifiedValue: false,
      loading: true,
    })).toMatchObject({
      label: "Waiting for first snapshot",
      reason: "first_snapshot_pending",
      allowed: true,
    });

    expect(resolveAdminAnalyticsWaitingCopy({
      hasVerifiedValue: false,
      loading: false,
      error: "backend unavailable",
    })).toMatchObject({
      label: "Source unavailable",
      reason: "source_unavailable",
      allowed: true,
    });

    expect(resolveAdminAnalyticsWaitingCopy({
      hasVerifiedValue: false,
      loading: false,
    }).label).toBe("No verified snapshot yet");
  });

  it("normalizes percent snapshots that arrive as whole percentages", () => {
    expect(normalizeAdminSnapshotRatio(42)).toBe(0.42);
    expect(normalizeAdminSnapshotRatio(0.42)).toBe(0.42);
    expect(normalizeAdminSnapshotRatio(null)).toBeNull();
  });
});
