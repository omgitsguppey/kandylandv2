// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { join } from "path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ANALYTICS_STATE_SOURCE = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
  "utf-8",
);

const mockState = vi.hoisted(() => {
  const icon = () => null;

  return {
    analyticsState: {
      range: "30d",
      activeViewerFilter: "",
      viewerUserFilter: "",
      showHistoricalEmptyState: false,
      blockingAnalyticsError: null,
      mobileShare: 0.5,
      mobileUsers: 25,
      commerce: { revenueUsd: 125 },
      funnel: { purchases: 3, checkoutStarts: 6 },
      analyticsOverviewCards: {
        mobileShare: {
          displayValue: "50%",
          hint: "25 mobile users",
          truthState: "live",
          statusBadgeLabel: "Current",
        },
        revenue: {
          displayValue: "$125",
          hint: "server transactions",
          truthState: "live",
          statusBadgeLabel: "Current",
        },
        purchases: {
          displayValue: "3",
          hint: "server transactions",
          truthState: "live",
          statusBadgeLabel: "Current",
        },
      },
      analyticsOverviewDisplayMetrics: {
        liveActive: {
          id: "liveActive",
          label: "Active Users",
          displayValue: "12",
          primaryValue: 12,
          displayState: "ready",
          exactness: "exact",
          compactFreshnessLine: "Updated 1m ago",
          debugReason: "live response loaded",
          debugSource: "realtime_snapshot",
          badgeLabel: "Current",
          showBadgeInPrimary: false,
        },
        mobileShare: {
          id: "mobileShare",
          label: "Mobile Share",
          displayValue: "50%",
          primaryValue: 0.5,
          displayState: "ready",
          exactness: "derived",
          compactFreshnessLine: "Updated 1m ago",
          debugReason: "device sample loaded",
          debugSource: "device_sample",
          badgeLabel: "Current",
          showBadgeInPrimary: false,
        },
        revenue: {
          id: "revenue",
          label: "Revenue",
          displayValue: "$125",
          primaryValue: 125,
          displayState: "partial",
          exactness: "derived",
          compactFreshnessLine: "30D confirmed transactions while launch history hydrates",
          debugReason: "server transaction fallback",
          debugSource: "server_transaction_fallback",
          badgeLabel: "Partial",
          showBadgeInPrimary: false,
        },
        purchases: {
          id: "purchases",
          label: "Purchases",
          displayValue: "3",
          primaryValue: 3,
          displayState: "partial",
          exactness: "derived",
          compactFreshnessLine: "30D confirmed purchases while launch history hydrates",
          debugReason: "server transaction fallback",
          debugSource: "server_transaction_fallback",
          badgeLabel: "Partial",
          showBadgeInPrimary: false,
        },
      },
      analyticsWarmState: "Snapshot refresh ready",
      liveSnapshotLabel: "Current snapshot",
      historicalSnapshotLabel: "[historical]",
      isBackgroundSyncing: false,
      analyticsSectionHealthSummary: {
        healthy: 3,
        warn: 0,
        fail: 0,
        total: 3,
      },
      needsSetup: false,
      activeTab: "operations",
      setActiveTab: vi.fn(),
      liveLoading: false,
      historicalLoading: false,
      isPrimingAnalytics: false,
      liveResponse: { totalActive: 12, liveTruthLabel: "live" },
      backgroundAnalyticsIssues: [],
      visibleDegradedCopy: [],
      liveFeedStatus: "snapshot",
      liveFeedDetail: "",
      historicalTruthState: "cached",
      historicalSourceLabel: "30D Server snapshot",
      launchRecoverySummary: {
        sourceLabel: "First-party",
        confidenceLabel: "verified",
        coverageLabel: "11/11 launch days",
        missingRangeCount: 0,
        sourceAgreementState: "pass",
      },
      adminAnalyticsSourceHierarchy: {
        status: "aligned",
        nextAction: "Analytics source hierarchy is aligned.",
      },
      panelHydration: {
        summary: {
          totalPanels: 11,
          hydrated: 3,
          collecting: 2,
          sourceReadyWaitingForActivity: 1,
          notObservedButExpected: 2,
          sourceMissing: 1,
          materializerMissing: 1,
          bridgeMissing: 0,
          externalRequired: 1,
          broken: 0,
          topNextActions: [
            "Audience snapshot: Refresh analytics_admin_metric_snapshots before treating audience as hydrated.",
            "Commerce snapshot: Attach redacted provider evidence before clearing payment proof.",
            "Traffic overview: Repair src/app/api/admin/analytics/historical/route.ts so Traffic overview can hydrate.",
          ],
        },
        panelStatus: {},
        topPanelHydrationFailures: [
          {
            panelId: "audience_snapshot",
            panelLabel: "Audience snapshot",
            hydrationStatus: "source_missing",
            nextExactAction:
              "Refresh analytics_admin_metric_snapshots before treating audience as hydrated.",
          },
        ],
      },
      analyticsOverviewDebugMeta: { metrics: [] },
      analyticsSnapshotMigrationDebug: {
        snapshotFirstMigrationEnabled: true,
        verifiedSnapshotFirstRenderPath: true,
        manualRefreshEnabled: true,
        modules: [],
      },
      analyticsSectionHealth: [],
      clearAllFilters: vi.fn(),
      clearViewerFilter: vi.fn(),
      renderSectionRangeControl: vi.fn(() => null),
      dailyTaskPipelineModel: { items: [], hasData: false },
      activeNotificationFunnelPieData: [],
      notificationActionItems: [],
      maxNotificationActionValue: 0,
      hasNotificationReminderReasons: false,
      notificationReminderReasons: [],
      formatDuration: (value: unknown) => String(value),
      formatPercent: (value: unknown) => String(value),
    } as Record<string, unknown>,
    reportClientIssue: vi.fn(),
    tabOptions: [
      { id: "operations", label: "Operations", icon },
      { id: "audience", label: "Audience", icon },
      { id: "commerce", label: "Commerce", icon },
    ],
  };
});

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) =>
    values.filter(Boolean).join(" "),
}));

vi.mock("@/components/Admin/AdminPageHeader", () => ({
  AdminPageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/Admin/Analytics/AdminAnalyticsPrimitives", () => ({
  AnalyticsViewModeToggle: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: "chart" | "table" | "cards") => void;
  }) => (
    <button type="button" data-view-mode={value} onClick={() => onChange("table")}>
      View mode
    </button>
  ),
  MetricCard: ({
    label,
    value,
    hint,
    truthState,
    badgePlacement,
  }: {
    label: string;
    value: string | number;
    hint?: string;
    truthState?: string;
    badgePlacement?: string;
  }) => (
    <div data-badge-placement={badgePlacement} data-truth-state={truthState}>
      {label}:{String(value)}
      {hint ? <span>{hint}</span> : null}
    </div>
  ),
}));

vi.mock("@/components/Analytics/PageViewEvent", () => ({
  PageViewEvent: () => null,
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: (...args: unknown[]) => mockState.reportClientIssue(...args),
}));

vi.mock("@/lib/telemetry-catalog", () => ({
  TELEMETRY_EVENT_LABELS: {},
}));

vi.mock("@/app/admin/analytics/AnalyticsHelpers", () => ({
  RANGE_OPTIONS: [
    { value: "24h", label: "24H" },
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "all", label: "All" },
  ],
  TAB_OPTIONS: mockState.tabOptions,
  formatCompactNumber: (value: unknown) => String(value),
  formatMoney: (value: unknown) => `$${String(value)}`,
  formatPercent: (value: unknown) => String(value),
}));

vi.mock("@/app/admin/analytics/hooks/useAdminAnalyticsState", () => ({
  useAdminAnalyticsState: () => mockState.analyticsState,
}));

import AdminAnalyticsPage from "@/app/admin/analytics/page";

describe("AdminAnalyticsPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockState.analyticsState = {
      ...mockState.analyticsState,
      clearAllFilters: vi.fn(),
      clearViewerFilter: vi.fn(),
      viewerUserFilter: "",
      showHistoricalEmptyState: false,
      blockingAnalyticsError: null,
      backgroundAnalyticsIssues: [],
      visibleDegradedCopy: [],
      analyticsOverviewDebugMeta: { metrics: [] },
    };
    mockState.reportClientIssue.mockReset();
    delete (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__?: unknown;
      __KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__?: unknown;
    }).__KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__;
    delete (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__?: unknown;
    }).__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("does not count unclassified device rows as mobile-share proof", () => {
    expect(ANALYTICS_STATE_SOURCE).toContain("classifiedDeviceUsers");
    expect(ANALYTICS_STATE_SOURCE).toContain("unknownDeviceUsers");
    expect(ANALYTICS_STATE_SOURCE).toContain("classifiedDeviceUsers > 0");
    expect(ANALYTICS_STATE_SOURCE).not.toContain("? totalDeviceUsers > 0");
  });

  it("calls the clear-all handler from admin analytics state", async () => {
    const clearAllFilters = vi.fn();
    mockState.analyticsState = {
      ...mockState.analyticsState,
      clearAllFilters,
      viewerUserFilter: "test_user",
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    const button = Array.from(container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Clear filter"),
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(clearAllFilters).toHaveBeenCalledTimes(1);
    expect(mockState.reportClientIssue).not.toHaveBeenCalled();
  });

  it("reports a runtime diagnostic when the clear-all handler is missing", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      clearAllFilters: undefined,
      clearViewerFilter: undefined,
      viewerUserFilter: "test_user",
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    const button = Array.from(container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Clear filter"),
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockState.reportClientIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "runtime",
        message: "Admin analytics missing clear-all filter handler",
      }),
    );
  });

  it("publishes snapshot migration debug metadata for Admin Debug parity", async () => {
    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(
      (window as typeof window & {
        __KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__?: {
          snapshotFirstMigrationEnabled?: boolean;
          manualRefreshEnabled?: boolean;
        };
      }).__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__,
    ).toEqual(
      expect.objectContaining({
        snapshotFirstMigrationEnabled: true,
        manualRefreshEnabled: true,
      }),
    );
  });

  it("keeps raw platform_pulse snapshot keys out of the primary overview", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      blockingAnalyticsError: {
        message:
          "No verified admin metric snapshot display payload is available for platform_pulse:30d.",
      },
      analyticsOverviewDebugMeta: {
        metrics: {
          liveActive: {
            cacheKey: "platform_pulse:30d",
          },
        },
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain(
      "Overview snapshot unavailable. Showing available confirmed metrics.",
    );
    expect(container.textContent).not.toContain("platform_pulse:30d");
    expect(container.textContent).not.toContain(
      "No verified admin metric snapshot display payload",
    );
    expect(
      (window as typeof window & {
        __KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__?: {
          metrics?: {
            liveActive?: {
              cacheKey?: string;
            };
          };
        };
      }).__KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__?.metrics?.liveActive?.cacheKey,
    ).toBe("platform_pulse:30d");
  });

  it("renders compact overview metrics without giant waiting values or header badges", async () => {
    const currentState = mockState.analyticsState as {
      analyticsOverviewDisplayMetrics: Record<string, unknown>;
      analyticsOverviewCards: {
        revenue: Record<string, unknown>;
        purchases: Record<string, unknown>;
      } & Record<string, unknown>;
    };
    mockState.analyticsState = {
      ...mockState.analyticsState,
      analyticsOverviewCards: {
        ...currentState.analyticsOverviewCards,
        revenue: {
          ...currentState.analyticsOverviewCards.revenue,
          displayValue: "No snapshot yet",
          hint: "No verified snapshot yet.",
          truthState: "unavailable",
          statusBadgeLabel: "No source",
        },
        purchases: {
          ...currentState.analyticsOverviewCards.purchases,
          displayValue: "No snapshot yet",
          hint: "No verified snapshot yet.",
          truthState: "loading",
          statusBadgeLabel: "Collecting",
        },
      },
      analyticsOverviewDisplayMetrics: {
        ...currentState.analyticsOverviewDisplayMetrics,
        revenue: {
          id: "revenue",
          label: "Revenue",
          displayValue: "No snapshot yet",
          primaryValue: null,
          displayState: "unavailable",
          exactness: "unavailable",
          compactFreshnessLine: "No verified snapshot yet.",
          debugReason: "missing revenue snapshot",
          debugSource: "commerce_snapshot",
          badgeLabel: "No source",
          showBadgeInPrimary: false,
        },
        purchases: {
          id: "purchases",
          label: "Purchases",
          displayValue: "No snapshot yet",
          primaryValue: null,
          displayState: "loading",
          exactness: "unavailable",
          compactFreshnessLine: "No verified snapshot yet.",
          debugReason: "missing purchase snapshot",
          debugSource: "commerce_snapshot",
          badgeLabel: "Collecting",
          showBadgeInPrimary: false,
        },
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain("Revenue:No snapshot yet");
    expect(container.textContent).toContain("Purchases:No snapshot yet");
    expect(container.textContent).not.toContain("Waiting for first snapshot");
    expect(
      Array.from(container.querySelectorAll("[data-badge-placement]")).every(
        (node) => node.getAttribute("data-badge-placement") === "hidden",
      ),
    ).toBe(true);
  });

  it("passes cached overview snapshot state through to primary metric cards", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      analyticsOverviewDisplayMetrics: {
        ...(mockState.analyticsState as {
          analyticsOverviewDisplayMetrics: Record<string, unknown>;
        }).analyticsOverviewDisplayMetrics,
        liveActive: {
          id: "liveActive",
          label: "Active Users",
          displayValue: "12",
          primaryValue: 12,
          displayState: "cached",
          exactness: "exact",
          compactFreshnessLine: "Last verified data",
          debugReason: "snapshot fallback",
          debugSource: "last_verified_snapshot",
          badgeLabel: "Last verified data",
          showBadgeInPrimary: false,
        },
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    const activeUsersCard = Array.from(container.querySelectorAll("[data-truth-state]")).find((node) =>
      node.textContent?.includes("Active Users:12"),
    );

    expect(activeUsersCard?.getAttribute("data-truth-state")).toBe("cached");
  });

  it("keeps refresh-due overview snapshot state as cached truth", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      analyticsOverviewDisplayMetrics: {
        ...(mockState.analyticsState as {
          analyticsOverviewDisplayMetrics: Record<string, unknown>;
        }).analyticsOverviewDisplayMetrics,
        liveActive: {
          id: "liveActive",
          label: "Active Users",
          displayValue: "12",
          primaryValue: 12,
          displayState: "refresh_due",
          exactness: "exact",
          compactFreshnessLine: "Last verified data, refresh due",
          debugReason: "snapshot refresh due",
          debugSource: "last_verified_snapshot",
          badgeLabel: "Refresh due",
          showBadgeInPrimary: false,
        },
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    const activeUsersCard = Array.from(container.querySelectorAll("[data-truth-state]")).find((node) =>
      node.textContent?.includes("Active Users:12"),
    );

    expect(activeUsersCard?.getAttribute("data-truth-state")).toBe("cached");
  });

  it("summarizes panel recovery in one compact source strip", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      blockingAnalyticsError: {
        message:
          "No verified admin metric snapshot display payload is available for platform_pulse:30d.",
      },
      backgroundAnalyticsIssues: [
        "Historical analytics: No verified admin metric snapshot display payload is available for platform_pulse:30d.",
      ],
      visibleDegradedCopy: [
        "No verified snapshot-first realtime payload is available yet.",
      ],
      liveFeedDetail: "No verified snapshot-first realtime payload is available yet.",
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain("Source status");
    expect(container.querySelector("[data-admin-analytics-source-recovery='compact']")).toBeTruthy();
    const sourceNotes = container.querySelector("details[title]");
    expect(container.textContent).not.toContain("Source detail");
    expect(sourceNotes?.getAttribute("title")).not.toContain("No current activity snapshot has loaded yet.");
    expect(sourceNotes?.getAttribute("title")).not.toContain("Collecting activity");
    expect(sourceNotes?.getAttribute("title")).not.toContain("Realtime analytics");
    expect(container.textContent).toContain("3/11 connected");
    expect(container.textContent).toContain("5 collecting");
    expect(container.textContent).toContain("2 source gaps");
    expect(container.textContent).toContain("1 external proof required");
    expect(container.textContent).not.toMatch(/evidence gate|source note/u);
    expect(container.textContent).not.toContain("3 need source");
    expect(container.textContent).toContain("2 collecting");
    expect(container.textContent).toContain("1 collecting activity");
    expect(container.textContent).toContain("2 no recent activity");
    expect(container.textContent).toContain("1 source missing");
    expect(container.textContent).toContain("1 materializer missing");
    expect(container.textContent).not.toContain("need verification");
    expect(container.textContent).not.toContain("snapshot-first realtime payload");
    expect(container.textContent).not.toContain("Repair src/");
    expect(container.textContent).not.toContain("src/app/api");
    expect(container.querySelector("[data-panel-recovery-truth-state='source_missing']")).toBeTruthy();
    expect(container.querySelector("[data-panel-recovery-truth-state='source_ready_collecting']")).toBeTruthy();
    expect(container.querySelector("[data-panel-recovery-truth-state='external_required']")).toBeTruthy();
    expect(container.textContent).not.toContain("Panel status");
    expect(container.textContent).toContain("Next action");
    expect(container.textContent).toContain(
      "Traffic overview: Reconnect the source so Traffic overview can hydrate.",
    );
    expect(container.textContent).not.toContain("platform_pulse:30d");
  });

  it("does not render generic cache or debug-only realtime policy as source warnings", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      backgroundAnalyticsIssues: [
        "Current activity: cache fallback is showing last verified data.",
      ],
      visibleDegradedCopy: [
        "Snapshot refresh delayed. Showing last verified data.",
        "Showing last verified data.",
        "Open Debug for source details.",
      ],
      liveFeedStatus: "snapshot",
      liveFeedDetail:
        "Raw Firestore realtime listeners are disabled for compact Admin Analytics display; using the snapshot-first realtime route and Admin Debug raw evidence instead.",
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).not.toContain("Snapshot refresh delayed. Showing last verified data.");
    expect(container.textContent).not.toContain("Open Debug for source details.");
    expect(container.textContent).not.toContain("Showing last verified data.");
    expect(container.textContent).not.toContain("Raw Firestore realtime listeners are disabled");
    expect(container.textContent).not.toContain("snapshot-first realtime route");
    expect(container.querySelector("details[title]")).toBeNull();
  });

  it("labels source strip states with readable shell copy", async () => {
    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain("Operations view - 30D Server snapshot");
    expect(container.textContent).toContain("Last updated: Current snapshot");
    expect(container.textContent).toContain("Coverage: 11/11 launch days");
    expect(container.textContent).toContain("Source: First-party");
    expect(container.textContent).toContain("Confidence: verified");
    expect(container.textContent).toContain("Current snapshot");
    expect(container.textContent).toContain("First-party");
    expect(container.textContent).toContain("verified");
    expect(container.textContent).not.toContain("Realtime feed");
    expect(container.textContent).not.toContain("view ·");
    expect(container.textContent).not.toContain("Â·");
    expect(container.querySelector("[data-admin-analytics-status-summary=\"compact\"]")).toBeTruthy();
  });

  it("surfaces first-party launch gaps even when second-source coverage exists", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      historicalSourceLabel: "Launch history partially recovered since 2026-05-01",
      launchRecoverySummary: {
        sourceLabel: "Mixed",
        confidenceLabel: "review",
        coverageLabel: "3/3 local evidence days - first-party 1/3",
        missingRangeCount: 1,
        sourceAgreementState: "failed",
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain("Coverage: 3/3 local evidence days - first-party 1/3");
    expect(container.textContent).toContain("Source: Mixed");
    expect(container.textContent).toContain("Confidence: review");
    expect(container.textContent).toContain("1 range(s) still need recovery");
  });

  it("does not show missing analytics source states as bare unavailable summary copy", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      liveFeedStatus: "failed",
      historicalTruthState: "unavailable",
      historicalSourceLabel: "No historical snapshot yet",
      launchRecoverySummary: {
        sourceLabel: "Unknown",
        confidenceLabel: "unknown",
        coverageLabel: "Coverage waiting",
        missingRangeCount: 0,
        sourceAgreementState: "not_enough_sources",
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain("Operations view - No historical snapshot yet");
    expect(container.textContent).toContain("Source: Unknown");
    expect(container.textContent).toContain("Confidence: unknown");
    expect(container.textContent).not.toContain("Source: Unavailable");
    expect(container.textContent).not.toContain("Confidence: Unavailable");
  });

  it("summarizes source agreement blockers without leaking enum labels", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      adminAnalyticsSourceHierarchy: {
        status: "source_agreement_failed",
        nextAction:
          "Review source agreement in Debug and restore first-party/materialized coverage before promoting charts.",
        consumerSourceMismatches: [],
        blockedAnalyticsConsumers: [
          "debug_data_validation",
          "admin_analytics_overview",
          "admin_analytics_charts",
          "admin_analytics_insight_cards",
          "admin_analytics_source_health",
          "public_beta_score_evidence",
        ],
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain("Analytics source state: Source agreement failed");
    expect(container.textContent).toContain("6 analytics views blocked by source evidence.");
    expect(container.textContent).toContain("Review source agreement in Debug");
    expect(container.textContent).not.toContain("consumer_source_mismatch");
    expect(container.textContent).not.toContain("source_agreement_failed");
    expect(container.querySelector("[data-admin-analytics-status-summary='compact']")?.getAttribute("data-admin-analytics-source-hierarchy")).toBe("source_agreement_failed");
  });

  it("humanizes current-activity blocking errors", async () => {
    mockState.analyticsState = {
      ...mockState.analyticsState,
      blockingAnalyticsError: {
        message: "No verified snapshot-first realtime payload is available yet.",
      },
    };

    await act(async () => {
      root.render(<AdminAnalyticsPage />);
    });

    expect(container.textContent).toContain("Collecting activity.");
    expect(container.textContent).not.toContain("snapshot-first realtime payload");
  });
});
