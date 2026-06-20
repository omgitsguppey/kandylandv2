import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatAdminAnalyticsEvidenceSourceLabel,
  formatAdminAnalyticsSourceStateLabel,
  formatAdminAnalyticsSourceTruthLabel,
  hasAdminAnalyticsLaunchRecoveryEvidence,
  resolveAdminAnalyticsDisplayState,
  resolveAdminAnalyticsLaunchRecoverySummary,
  resolveAdminAnalyticsOverviewFreshnessState,
  resolveAdminAnalyticsOverviewMetricState,
} from "@/lib/analytics/admin-analytics-display-state";
import {
  classifyAdminHotCacheFreshness,
  mapAdminHotCacheFreshnessToStatus,
} from "@/lib/admin/admin-hot-cache-contract";
import {
  normalizeAdminSnapshotRatio,
  readAdminSnapshotNumberValue,
  resolveAdminAnalyticsWaitingCopy,
} from "@/lib/analytics/admin-analytics-loading-state";
import { createSnapshotValue, type AdminMetricSnapshot } from "@/lib/analytics/admin-metric-snapshot";

describe("resolveAdminAnalyticsDisplayState", () => {
  it("keeps launch recovery source roles and math reasons from the spine summary", () => {
    expect(resolveAdminAnalyticsLaunchRecoverySummary({
      sourceAgreementState: "failed",
      launchHistoryCoverage: {
        displaySummary: {
          sourceLabel: "Mixed",
          confidenceLabel: "review",
          coverageLabel: "1/129 product-truth launch days (evidence window 3)",
          sourceWindowLabel: "Launch evidence window since 2026-02-12",
          coverageDenominatorKind: "formal_launch_range",
          missingRangeCount: 1,
          sourceAgreementState: "failed",
          sourceRoleCounts: {
            product_truth: 1,
            missing_source: 12,
          },
          sourceGateBlockers: [{
            blocker: "launch_critical_family_coverage_below_floor",
            reason: "Launch-critical first-party family coverage is 7.7%; source truth needs at least 95% observed first-party coverage before clearing.",
            nextAction: "Recover observed first-party evidence before canonical chart promotion.",
          }],
          mathReasonSamples: [{
            familyId: "purchase",
            sourceRole: "missing_source",
            mathReason: "purchase has no bounded source evidence in the recovery window.",
            nextAction: "Attach first-party source evidence before promotion.",
          }],
        },
      },
    })).toMatchObject({
      sourceRoleCounts: {
        product_truth: 1,
        missing_source: 12,
      },
      sourceGateBlockers: [{
        blocker: "launch_critical_family_coverage_below_floor",
      }],
      mathReasonSamples: [{
        familyId: "purchase",
        sourceRole: "missing_source",
      }],
    });
  });

  it("derives launch recovery evidence presence from source roles instead of recovered count shortcuts", () => {
    expect(hasAdminAnalyticsLaunchRecoveryEvidence({
      sourceLabel: "Missing",
      confidenceLabel: "unknown",
      coverageLabel: "Product-truth source missing",
      sourceWindowLabel: null,
      coverageDenominatorKind: "formal_launch_range",
      missingRangeCount: 1,
      sourceAgreementState: "failed",
      sourceRoleCounts: {
        missing_source: 13,
      },
    })).toBe(false);

    expect(hasAdminAnalyticsLaunchRecoveryEvidence({
      sourceLabel: "Mixed",
      confidenceLabel: "review",
      coverageLabel: "1/129 product-truth launch days",
      sourceWindowLabel: "Launch evidence window since 2026-02-12",
      coverageDenominatorKind: "formal_launch_range",
      missingRangeCount: 1,
      sourceAgreementState: "failed",
      sourceRoleCounts: {
        product_truth: 1,
        missing_source: 12,
      },
    })).toBe(true);
  });

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
    expect(state.visibleMessage).toBe("Cached snapshot.");
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
    expect(state.visibleMessage).toBe("Refreshing cached snapshot.");
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
    expect(state.visibleMessage).toBe("No verified snapshot yet. Refresh to check again.");
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
      label: "Collecting activity",
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

  it("formats source evidence labels without promoting vendor or recovery evidence", () => {
    expect(formatAdminAnalyticsEvidenceSourceLabel("verified_snapshot")).toBe("Verified snapshot");
    expect(formatAdminAnalyticsEvidenceSourceLabel("stale_cache")).toBe("Verified snapshot, refresh due");
    expect(formatAdminAnalyticsEvidenceSourceLabel("realtime_upgrade")).toBe("Current activity source");
    expect(formatAdminAnalyticsEvidenceSourceLabel("vendor_evidence")).toBe("Estimated from vendor analytics");
    expect(formatAdminAnalyticsEvidenceSourceLabel("debug_only")).toBe("Debug-only recovery evidence");
    expect(formatAdminAnalyticsEvidenceSourceLabel("recovery_review_only")).toBe("Needs review before promotion");
    expect(formatAdminAnalyticsEvidenceSourceLabel("missing")).toBe("Unavailable until source samples exist");
  });

  it("formats source truth keys as compact operator labels", () => {
    expect(formatAdminAnalyticsSourceTruthLabel("analytics_event_facts")).toBe("Event facts");
    expect(formatAdminAnalyticsSourceTruthLabel("first_party_event_fact")).toBe("First-party event facts");
    expect(formatAdminAnalyticsSourceTruthLabel("server_ledger")).toBe("Server ledger");
    expect(formatAdminAnalyticsSourceTruthLabel("watch_session_rollup")).toBe("Watch session rollup");
    expect(formatAdminAnalyticsSourceTruthLabel("ga4_evidence_only")).toBe("Vendor evidence only");
    expect(formatAdminAnalyticsSourceTruthLabel("legacy_directional_only")).toBe("Legacy evidence only");
    expect(formatAdminAnalyticsSourceTruthLabel("hot_cache_snapshot")).toBe("Hot cache snapshot");
    expect(formatAdminAnalyticsSourceTruthLabel("source_missing")).toBe("Source missing");
    expect(formatAdminAnalyticsSourceTruthLabel("ga_total_minus_identified_first_party")).toBe(
      "Vendor estimate minus signed-in traffic",
    );
    expect(formatAdminAnalyticsSourceTruthLabel("current_activity_snapshot")).toBe("Current activity snapshot");
    expect(formatAdminAnalyticsSourceTruthLabel("historical_snapshot")).toBe("Historical snapshot");
    expect(formatAdminAnalyticsSourceTruthLabel("payment_transactions")).toBe("Payment records");
    expect(formatAdminAnalyticsSourceTruthLabel("gumdrop_ledger")).toBe("GumDrop ledger");
    expect(formatAdminAnalyticsSourceTruthLabel("drop_metadata_plus_rollups")).toBe(
      "Drop metadata plus rollups",
    );
    expect(formatAdminAnalyticsSourceTruthLabel("missing")).toBe("Source missing");
    expect(formatAdminAnalyticsSourceTruthLabel(undefined)).toBe("Source missing");
  });

  it("formats source state keys as plain status labels", () => {
    expect(formatAdminAnalyticsSourceStateLabel("source_current")).toBe("Source current");
    expect(formatAdminAnalyticsSourceStateLabel("late_arrival_window")).toBe("Late arrivals possible");
    expect(formatAdminAnalyticsSourceStateLabel("source_missing")).toBe("Source missing");
    expect(formatAdminAnalyticsSourceStateLabel("external_evidence_required")).toBe("External proof required");
    expect(formatAdminAnalyticsSourceStateLabel("verified")).toBe("Verified source");
    expect(formatAdminAnalyticsSourceStateLabel("mixed")).toBe("Mixed sources");
    expect(formatAdminAnalyticsSourceStateLabel("gap_detected")).toBe("Traffic gap detected");
    expect(formatAdminAnalyticsSourceStateLabel("stale")).toBe("Refresh due");
    expect(formatAdminAnalyticsSourceStateLabel(undefined)).toBe("Source missing");
  });

  it("maps recovery freshness states without calling them unknown or stale truth", () => {
    expect(resolveAdminAnalyticsOverviewFreshnessState("source_current")).toBe("recent");
    expect(resolveAdminAnalyticsOverviewFreshnessState("late_arrival_window")).toBe("recent");
    expect(resolveAdminAnalyticsOverviewFreshnessState("cached")).toBe("recent");
    expect(resolveAdminAnalyticsOverviewFreshnessState("refresh_due")).toBe("recent");
    expect(resolveAdminAnalyticsOverviewFreshnessState("source_missing")).toBe("not_observed");
    expect(resolveAdminAnalyticsOverviewFreshnessState("external_evidence_required")).toBe("not_observed");
  });

  it("maps missing overview snapshots to unavailable compact state", () => {
    expect(resolveAdminAnalyticsOverviewMetricState({
      primaryValue: null,
      truthState: "unavailable",
      sourceTruth: "missing",
    })).toEqual({
      displayState: "unavailable",
      exactness: "unavailable",
    });
  });

  it("labels confirmed transaction fallback as partial derived, not exact snapshot truth", () => {
    expect(resolveAdminAnalyticsOverviewMetricState({
      primaryValue: 7,
      truthState: "degraded",
      sourceTruth: "server_transactions",
    })).toEqual({
      displayState: "partial",
      exactness: "derived",
    });
  });

  it("labels last verified overview snapshots as cached instead of live", () => {
    expect(resolveAdminAnalyticsOverviewMetricState({
      primaryValue: 12,
      truthState: "live",
      sourceTruth: "last_verified_snapshot",
    })).toEqual({
      displayState: "cached",
      exactness: "exact",
    });
  });

  it("does not treat missing values as fake zero or live overview truth", () => {
    const state = resolveAdminAnalyticsOverviewMetricState({
      primaryValue: null,
      truthState: "live",
      sourceTruth: "current_activity_snapshot",
    });

    expect(state.displayState).toBe("unavailable");
    expect(state.exactness).toBe("unavailable");
  });

  it("treats one-hour-old verified hot cache as cached instead of stale truth", () => {
    const nowMs = Date.parse("2026-06-08T12:00:00.000Z");
    const oneHourOldMs = nowMs - 60 * 60 * 1000;

    const state = classifyAdminHotCacheFreshness({
      generatedAtMs: oneHourOldMs,
      nowMs,
    });

    expect(state).toBe("cached");
    expect(mapAdminHotCacheFreshnessToStatus(state)).toBe("cached");
  });

  it("maps refresh-due snapshots to cached truth with refresh guidance", () => {
    const state = resolveAdminAnalyticsDisplayState({
      latestVerifiedSnapshot: {
        exists: true,
        sourceMode: "stale_cache",
        truthState: "verified",
        lastVerifiedAt: "2026-06-08T10:30:00.000Z",
        hasValues: true,
      },
      moduleConfig: {
        moduleKey: "live_pulse",
        title: "Live Pulse",
        metricValue: 12,
      },
    });

    expect(state.sourceMode).toBe("stale_cache");
    expect(state.truthState).toBe("verified");
    expect(state.visibleMessage).toBe("Cached snapshot.");
  });

  it("does not promote refresh-due cache metadata to stale truth", () => {
    const state = resolveAdminAnalyticsDisplayState({
      latestVerifiedSnapshot: {
        exists: true,
        sourceMode: "stale_cache",
        truthState: "stale",
        stale: true,
        lastVerifiedAt: "2026-06-08T10:30:00.000Z",
        hasValues: true,
      },
      moduleConfig: {
        moduleKey: "audience_snapshot",
        title: "Audience Snapshot",
        metricValue: 481,
      },
    });

    expect(state.sourceMode).toBe("stale_cache");
    expect(state.truthState).toBe("verified");
    expect(state.visibleMessage).toBe("Cached snapshot.");
  });

  it("maps stale cache freshness to recent overview state instead of stale truth", () => {
    expect(resolveAdminAnalyticsOverviewFreshnessState("refresh_due")).toBe("recent");
    expect(resolveAdminAnalyticsOverviewFreshnessState("stale")).toBe("recent");
    expect(resolveAdminAnalyticsOverviewFreshnessState("cached")).toBe("recent");
    expect(resolveAdminAnalyticsOverviewFreshnessState("blocked")).toBe("not_observed");
  });

  it("preserves cached realtime route labels through snapshot-first admin state", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
      "utf8",
    );

    expect(source).toContain('label === "cached" || label === "refresh_due"');
    expect(source).toContain("resolveAdminAnalyticsOverviewFreshnessState(liveActiveTruthState)");
    expect(source).toContain('return "cached"');
    expect(source).not.toContain('liveActiveTruthState === "stale" ? "stale"');
    expect(source).not.toContain('label === "cached") {\n    return "fallback"');
  });
});
